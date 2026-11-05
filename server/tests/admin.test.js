/**
 * Phase 7 tests — admin console, provisioning, security hardening.
 * Runs against the real app + isolated ezads_test_admin DB.
 * Covers: admin login (provisioned-only), RBAC, platform stats, user
 * suspend/reinstate (with audit + immediate access loss), report moderation
 * transitions, ledger + audit log endpoints, and the security guards
 * (origin mismatch, NoSQL injection sanitization).
 */
process.env.NODE_ENV = 'test';
process.env.OAUTH_MOCK_MODE = 'true';
process.env.TEST_DB_NAME = 'admin'; // isolated DB: the runner runs files concurrently

import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDB, disconnectDB, syncIndexes } from '../src/config/db.js';
import { signSessionToken } from '../src/utils/tokens.js';
import { SESSION_COOKIE } from '../src/middleware/session.js';
import { User, BrandProfile, Report, AuditLog, Campaign, Transaction, Conversation } from '../src/models/index.js';
import { seedAdmin } from '../src/scripts/seedAdmin.js';

const S = Date.now();
const ADMIN_EMAIL = `admin-${S}@eztest.dev`;
const ADMIN_PASSWORD = 'Sup3rSecret!99';
let admin;   // supertest agent with admin session
let brand;   // supertest agent with brand session
let creator; // influencer user (created directly)

function campaignBody(title, extra = {}) {
  return {
    title, description: 'A test campaign promoting gadget launches through creator reels and posts.',
    niche: 'technology', budget: { total: 50000, currency: 'INR' },
    deliverables: [{ format: 'reel', quantity: 2, description: 'Product demo reel' }],
    startDate: new Date(Date.now() + 7 * 86400000).toISOString(),
    endDate: new Date(Date.now() + 30 * 86400000).toISOString(),
    ...extra
  };
}

test('phase7 setup: isolated DB + seed admin + users', async () => {
  // provisioning script must refuse silly inputs before touching anything
  await assert.rejects(
    () => seedAdmin({ email: ADMIN_EMAIL, password: undefined }),
    /Refusing to provision/
  );

  await connectDB();
  await syncIndexes();
  await Promise.all([
    User.deleteMany({}), BrandProfile.deleteMany({}), Campaign.deleteMany({}),
    Report.deleteMany({}), Transaction.deleteMany({}), Conversation.deleteMany({}),
    AuditLog.deleteMany({})
  ]);

  const seeded = await seedAdmin({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, displayName: 'Ops Admin' });
  assert.equal(seeded.created, true);
  // second run is an idempotent no-op
  const again = await seedAdmin({ email: ADMIN_EMAIL, password: 'DifferentPass1' });
  assert.equal(again.created, false);
  const adminDoc = await User.findOne({ email: ADMIN_EMAIL });
  assert.equal(adminDoc.role, 'admin');
  assert.equal(adminDoc.emailVerified, true);

  // prosevisioning attempt leaves an audit entry
  const provLog = await AuditLog.findOne({ action: 'admin.provisioned.created' });
  assert.ok(provLog, 'expected provisioning audit entry');

  admin = request.agent(app);
  const login = await admin.post('/api/auth/login/admin').send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  assert.equal(login.status, 200);
  assert.equal(login.body.data.role, 'admin');

  brand = request.agent(app);
  await brand.post('/api/auth/register/brand').send({
    companyName: 'Audit Brand', email: `p7brand-${S}@eztest.dev`, password: 'Passw0rd1', industry: 'technology'
  });

  creator = await User.create({ role: 'influencer', displayName: 'Suspensible Sam', instagram: { providerId: `p7-${S}`, username: 'sam7', isMock: true } });
});

/* ---------- admin auth + RBAC ---------- */

test('admin login: wrong password rejected + audited; brand account cannot log in as admin', async () => {
  const wrong = await request(app).post('/api/auth/login/admin').send({ email: ADMIN_EMAIL, password: 'Nope1234!' });
  assert.equal(wrong.status, 401);
  const log = await AuditLog.findOne({ action: 'auth.login.admin.failed' }).sort({ createdAt: -1 });
  assert.ok(log, 'failed admin login audited');

  // brand credentials on the admin endpoint must not resolve (role mismatch)
  const brandOnAdmin = await request(app).post('/api/auth/login/admin').send({ email: `p7brand-${S}@eztest.dev`, password: 'Passw0rd1' });
  assert.equal(brandOnAdmin.status, 401);

  // ...and the admin endpoint cannot be reached by non-admins
  const anonymous = await request(app).get('/api/admin/stats');
  assert.equal(anonymous.status, 401);
  const asBrand = await brand.get('/api/admin/stats');
  assert.equal(asBrand.status, 403);
  assert.equal(asBrand.body.error.code, 'FORBIDDEN');
});

test('admin: platform stats reflect seeded users and report counts', async () => {
  const res = await admin.get('/api/admin/stats');
  assert.equal(res.status, 200);
  const s = res.body.data;
  assert.ok(s.users.byRole.admin >= 1);
  assert.ok(s.users.byRole.brand >= 1);
  assert.ok(s.users.byRole.influencer >= 1);
  assert.equal(s.chat.conversations, 0);
});

/* ---------- suspensions ---------- */

test('admin suspend/reinstate: suspended session loses access instantly, actions audited, admins protected', async () => {
  const creatorId = String(creator._id);

  // a currently-valid session for the creator (same signing as the real cookie)
  const creatorSession = () =>
    request(app).get('/api/auth/me').set('Cookie', `${SESSION_COOKIE}=${signSessionToken(creator)}`);
  assert.equal((await creatorSession()).status, 200); // works while active

  const susp = await admin.patch(`/api/admin/users/${creatorId}/status`).send({ status: 'suspended' });
  assert.equal(susp.status, 200);
  assert.equal(susp.body.data.status, 'suspended');

  const log = await AuditLog.findOne({ action: 'admin.user.suspend', targetId: creator._id });
  assert.ok(log, 'suspension audited');

  // the previously-valid creator session is dead the moment status flips
  assert.equal((await creatorSession()).status, 401);

  // idempotent: suspending again returns 200 without error
  const again = await admin.patch(`/api/admin/users/${creatorId}/status`).send({ status: 'suspended' });
  assert.equal(again.status, 200);

  const rein = await admin.patch(`/api/admin/users/${creatorId}/status`).send({ status: 'active' });
  assert.equal(rein.status, 200);
  assert.equal(rein.body.data.status, 'active');

  // reinstated → session valid again
  assert.equal((await creatorSession()).status, 200);

  // admin accounts are untouchable
  const adminId = (await User.findOne({ email: ADMIN_EMAIL }))._id;
  const evil = await admin.patch(`/api/admin/users/${adminId}/status`).send({ status: 'suspended' });
  assert.equal(evil.status, 403);

  // unknown status value rejected
  const junk = await admin.patch(`/api/admin/users/${creatorId}/status`).send({ status: 'deleted' });
  assert.equal(junk.status, 400);
});

test('admin users list: filters + foreign body cannot reach the endpoint', async () => {
  const list = await admin.get('/api/admin/users?role=influencer');
  assert.equal(list.status, 200);
  assert.ok(list.body.data.items.every((u) => u.role === 'influencer'));
  assert.ok(list.body.data.items.some((u) => u.instagram?.username === 'sam7'));

  const flt = await admin.get('/api/admin/users?role=zebra');
  assert.equal(flt.status, 400);

  const asBrand = await brand.get('/api/admin/users');
  assert.equal(asBrand.status, 403);
});

/* ---------- reports / disputes ---------- */

test('admin report moderation: forward-only transitions, note required on close, audited', async () => {
  // a user reports a campaign
  const camp = await brand.post('/api/brand/campaigns').send(campaignBody('Reported Campaign'));
  assert.equal(camp.status, 201);
  const campaignId = camp.body.data._id;

  // creator files a report through... no public endpoint exists yet? Admin sees DB-created report.
  const report = await Report.create({
    reporter: creator._id, subjectType: 'campaign', subjectId: campaignId,
    reason: 'misleading_information', details: 'Budget looks inflated'
  });

  const closeWithoutNote = await admin.patch(`/api/admin/reports/${report._id}`).send({ status: 'dismissed' });
  assert.equal(closeWithoutNote.status, 400); // note required

  const start = await admin.patch(`/api/admin/reports/${report._id}`).send({ status: 'reviewing' });
  assert.equal(start.status, 200);
  assert.equal(start.body.data.status, 'reviewing');
  assert.equal(start.body.data.handledBy, String((await User.findOne({ email: ADMIN_EMAIL }))._id));

  // backward transition forbidden (reviewing → open)
  const back = await admin.patch(`/api/admin/reports/${report._id}`).send({ status: 'open' });
  assert.equal(back.status, 400);

  const close = await admin.patch(`/api/admin/reports/${report._id}`).send({ status: 'resolved_action_taken', resolutionNote: 'Campaign edited' });
  assert.equal(close.status, 200);

  // closed reports are terminal
  const reopen = await admin.patch(`/api/admin/reports/${report._id}`).send({ status: 'reviewing' });
  assert.equal(reopen.status, 400);

  const log = await AuditLog.findOne({ action: 'admin.report.update', targetId: report._id }).sort({ createdAt: -1 });
  assert.equal(log.meta.to, 'resolved_action_taken');

  const list = await admin.get('/api/admin/reports?status=resolved_action_taken');
  assert.equal(list.status, 200);
  assert.ok(list.body.data.items.some((r) => String(r._id) === String(report._id)));
  assert.equal(list.body.data.items[0].subject.kind, 'campaign');
});

/* ---------- ledger + audit endpoints ---------- */

test('admin: simulated ledger + audit log endpoints (read-only, admin-gated)', async () => {
  const tx = await admin.get('/api/admin/transactions');
  assert.equal(tx.status, 200);
  assert.ok(Array.isArray(tx.body.data.items));

  const logs = await admin.get('/api/admin/audit-logs?action=admin.');
  assert.equal(logs.status, 200);
  assert.ok(logs.body.data.items.length >= 2); // suspension + report entries at minimum
  assert.ok(logs.body.data.items.every((a) => a.action.startsWith('admin.')));

  // non-admin cannot read the audit trail
  const asBrand = await brand.get('/api/admin/audit-logs');
  assert.equal(asBrand.status, 403);
});

/* ---------- security guards ---------- */

test('security: NoSQL injection payloads are stripped, not interpreted', async () => {
  const probe = await request(app)
    .post('/api/auth/login/admin')
    .send({ email: { $gt: '' }, password: { $gt: '' } });
  // mongoSanitize reduced the objects to {} → fails validation / auth, NOT a bypass
  assert.ok([400, 401].includes(probe.status));
  assert.equal(probe.body.ok, false);
});

test('security: cross-origin state-changing request is blocked, GET unaffected', async () => {
  const evilPost = await request(app)
    .post('/api/auth/login/brand')
    .set('Origin', 'https://evil.example.com')
    .send({ email: `p7brand-${S}@eztest.dev`, password: 'Passw0rd1' });
  assert.equal(evilPost.status, 403);
  assert.equal(evilPost.body.error.code, 'ORIGIN_MISMATCH');

  // non-browser client (no origin at all) is unaffected
  const noOrigin = await request(app)
    .post('/api/auth/login/brand')
    .send({ email: `p7brand-${S}@eztest.dev`, password: 'Passw0rd1' });
  assert.equal(noOrigin.status, 200);

  // same-origin from CLIENT_ORIGIN is allowed
  const goodPost = await request(app)
    .post('/api/auth/login/brand')
    .set('Origin', 'http://localhost:5173')
    .send({ email: `p7brand-${S}@eztest.dev`, password: 'Passw0rd1' });
  assert.equal(goodPost.status, 200);
});

test('teardown: disconnect', async () => {
  await disconnectDB();
});
