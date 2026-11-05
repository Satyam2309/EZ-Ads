#!/usr/bin/env node
/* Measures when the 3D (react-three-fiber) chunk loads across pages of the
 * built SPA, using raw CDP against installed Chrome headless (no extra deps).
 *
 * Prereqs:
 *   1. client built:         npm run build            (in client/)
 *   2. API serving the SPA:  NODE_ENV=production PORT=5050 JWT_SECRET=... \
 *                            OAUTH_STATE_SECRET=... TOKEN_ENC_KEY=... npm start
 *                            (Express serves client/dist when isProd)
 *   3. optional sign-in:     path to a curl cookie jar holding `ezads_session`
 *                            (POST /api/auth/login/brand -c jar.txt)
 *
 * Usage:  node scripts/measure-3d-load.mjs [apiPort] [tag] [cookieJar]
 * Prints: per page — FCP / load timing, compressed JS bytes requested before
 * the load event, and whether/when the 3D chunk was fetched, with a tagged
 * header suitable for grep-diffing runs (e.g. "-- ", "== path [tag] ==").
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME_BIN || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const CDP_PORT = 9335;
const API_PORT = process.argv[2] || '5050';
const ORIGIN = `http://127.0.0.1:${API_PORT}`;
const TAG = process.argv[3] || 'run';
const COOKIE_JAR = process.argv[4] || null;
const PAGES = [
  { path: '/', auth: false },
  { path: '/brand/dashboard', auth: true }
  // Note: /influencer/dashboard uses the same DashboardHero, but this harness
  // only signs in a brand user — an unverified influencer path would just
  // redirect and report a misleading "NOT FETCHED". Add it here only when
  // measuring with an influencer session cookie.
];
const IDLE_WAIT_MS = 4000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function sessionFromJar(jarPath) {
  try {
    const line = readFileSync(jarPath, 'utf8').split(/\r?\n/).find((l) => l.includes('ezads_session'));
    return line ? line.split('\t')[6].trim() : null;
  } catch { return null; }
}

function makeCdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  const listeners = new Map();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    if (msg.method) for (const fn of listeners.get(msg.method) || []) fn(msg.params);
  });
  return {
    open: new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); }),
    send: (method, params = {}) => new Promise((resolve, reject) => {
      const mid = ++id;
      pending.set(mid, (msg) => (msg.error
        ? reject(new Error(`${method}: ${JSON.stringify(msg.error)}`))
        : resolve(msg.result)));
      ws.send(JSON.stringify({ id: mid, method, params }));
    }),
    onceEvent: (method) => new Promise((res) => {
      const fn = (p) => { res(p); listeners.set(method, (listeners.get(method) || []).filter((f) => f !== fn)); };
      const arr = listeners.get(method) || []; arr.push(fn); listeners.set(method, arr);
    }),
    close: () => ws.close()
  };
}

async function waitCdp(tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
      if (r.ok) return r.json();
    } catch { /* not up yet */ }
    await sleep(250);
  }
  throw new Error('Chrome CDP not reachable');
}

function metricsExpr() {
  return `(() => {
  const nav = performance.getEntriesByType('navigation')[0];
  const fcp = performance.getEntriesByName('first-contentful-paint')[0];
  const js = performance.getEntriesByType('resource').filter(r => r.name.endsWith('.js'));
  const r3f = js.find(r => /react-three-fiber/.test(r.name)) || null;
  const jsAtLoad = js.filter(r => r.startTime <= nav.loadEventStart);
  return {
    fcp: fcp ? Math.round(fcp.startTime) : null,
    load: Math.round(nav.loadEventStart),
    jsAtLoadKB: +((jsAtLoad.reduce((a, r) => a + r.encodedBodySize, 0)) / 1024).toFixed(1),
    r3f: r3f ? { startMs: Math.round(r3f.startTime), kb: +(r3f.encodedBodySize / 1024).toFixed(1) } : null
  };
})()`;
}

async function measurePage(client, page, jar) {
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('Network.enable');
  await client.send('Network.setCacheDisabled', { cacheDisabled: true });
  await client.send('Network.clearBrowserCookies');
  if (page.auth && jar) {
    const sess = sessionFromJar(jar);
    if (!sess) throw new Error('no ezads_session in cookie jar');
    await client.send('Network.setCookie', {
      name: 'ezads_session', value: sess, url: ORIGIN, path: '/', httpOnly: true, secure: false
    });
  }
  const loadFired = client.onceEvent('Page.loadEventFired');
  await client.send('Page.navigate', { url: `${ORIGIN}${page.path}` });
  await loadFired;
  await sleep(IDLE_WAIT_MS); // let post-load work (idle callbacks, lazy loads) finish
  const res = await client.send('Runtime.evaluate', { expression: metricsExpr(), returnByValue: true });
  return res.result?.value ?? null;
}

(async () => {
  const profile = mkdtempSync(join(tmpdir(), 'ezads-perf-'));
  const chrome = spawn(CHROME, [
    `--remote-debugging-port=${CDP_PORT}`,
    '--headless=new',
    `--user-data-dir=${profile}`,
    '--window-size=1440,900',
    '--no-first-run', '--no-default-browser-check',
    '--disable-background-networking',
    'about:blank'
  ], { stdio: 'ignore' });
  try {
    const targets = await waitCdp();
    const pageTarget = targets.find((t) => t.type === 'page');
    if (!pageTarget) throw new Error('no page target in Chrome');
    const client = makeCdp(pageTarget.webSocketDebuggerUrl);
    await client.open;
    const results = {};
    for (const p of PAGES) results[p.path] = await measurePage(client, p, COOKIE_JAR);
    client.close();

    console.log(`\n$ node scripts/measure-3d-load.mjs ${API_PORT} ${TAG}${COOKIE_JAR ? ' <cookiejar>' : ''}`);
    for (const [path, m] of Object.entries(results)) {
      if (!m) { console.log(`== ${path} [${TAG}] == measurement unavailable`); continue; }
      console.log(`== ${path} [${TAG}] ==`);
      console.log(`  FCP ${m.fcp}ms | load ${m.load}ms | JS before load ${m.jsAtLoadKB} kB | r3f: ${m.r3f ? `${m.r3f.kb} kB @ ${m.r3f.startMs}ms` : 'NOT FETCHED'}`);
    }
  } finally {
    chrome.kill();
    try { rmSync(profile, { recursive: true, force: true }); } catch { /* windows lock ok */ }
  }
})().catch((err) => { console.error('measure-3d-load failed:', err.message); process.exit(1); });
