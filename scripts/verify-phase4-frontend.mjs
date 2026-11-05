/**
 * Phase 4 frontend verification: drives real Chrome through the brand UI,
 * exercising discovery filters/compare tray, shortlists, and a profile page.
 * Screenshots land in the project root for human review.
 */
import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://localhost:5173';
const shots = [
  'phase4-ui-login.png',
  'phase4-ui-discovery.png',
  'phase4-ui-compare.png',
  'phase4-ui-profile.png',
  'phase4-ui-shortlists.png'
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-first-run', '--disable-features=Translate']
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 1. Login through the real form
await page.goto(`${BASE}/login/brand`, { waitUntil: 'networkidle0' });
await page.screenshot({ path: shots[0] });
await page.type('input[type="email"]', 'branddemo@ezads.test');
await page.type('input[type="password"]', 'BrandDemo#2026');
await Promise.all([
  page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {}),
  page.click('button[type="submit"]')
]);
await sleep(800);
const url = page.url();
console.log('after login url:', url);

// 2. Discovery with filters demo: engagement filter + sort
await page.goto(`${BASE}/brand/discovery`, { waitUntil: 'networkidle0' });
await sleep(1200);
await page.screenshot({ path: shots[1] });

// 3. Compare tray: select the first two cards' Compare buttons
const clickCompare = () => page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Compare');
  if (btn) { btn.click(); return true; }
  return false;
});
const clicked1 = await clickCompare();
await sleep(250);
const clicked2 = await clickCompare();
await sleep(400);
await page.screenshot({ path: shots[2] });
console.log('compare tray exercised:', clicked1, clicked2);

// 4. Open first creator profile
await page.evaluate(() => {
  const links = [...document.querySelectorAll('a[href*="/brand/creators/"]')];
  if (links[0]) window.location.href = links[0].href;
});
await sleep(1500);
await page.screenshot({ path: shots[3] });
console.log('profile url:', page.url());

// 5. Shortlists page
await page.goto(`${BASE}/brand/shortlists`, { waitUntil: 'networkidle0' });
await sleep(1200);
await page.screenshot({ path: shots[4] });

// sanity: capture visible headings for logging
const headings = await page.$$eval('h1,h2', (els) => els.map((e) => e.textContent.trim()).slice(0, 12));
console.log('headings:', headings);

await browser.close();
console.log('screenshots saved:', shots.join(', '));
