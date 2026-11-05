/**
 * Dashboard overview tests — the read-only aggregate endpoint powering the
 * role dashboards.
 * Runs against the real app + isolated ezads_test_dashboard DB.
 * Covers: auth requirement, brand aggregates (campaigns, applications,
 * shortlists, pipeline, spend), influencer aggregates (invitations,
 * applications, agreements awaiting reply) and read-only-ness.
 */
process.env.NODE_ENV = 'test';
process.env.OAUTH_MOCK_MODE = 'true';
process.env.TEST_DB_NAME = 'dashboard';

import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { connectDB, disconnectDB, syncIndexes } from '../src/config/db.js';
import {
  User, InfluencerProfile, Campaign, CampaignApplication, CampaignInvitation,
  CampaignAgreement, Shortlist, Notification, Transaction, Conversation, Message
} from '../src/models/index.js';

const S = Date.now();
let brand, influencer, influencerId, campaignId;

function campaignBody(title, extra = {}) {
  return {
    title,
    description: 'A dashboard-test campaign promoting launch videos through creator reels.',
    niche: 'technology',
    budget: { total: 40000, currency: 'INR' },
    deliverables: [{ format: 'reel', quantity: 1 }],
    startDate: new Date(Date.now() + 5 * 86400000).toISOString(),
    endDate: new Date(Date.now() + 20 * 86400000).toISOString(),
    ...extra
  };
}

test('dashboard setup: isolated DB + users + one published campaign', async () => {
  await connectDB();
  await syncIndexes();
  await Promise.all([
    User.deleteMany({}), InfluencerProfile.deleteMany({}), Campaign.deleteMany({}),
    CampaignApplication.deleteMany({}), CampaignInvitation.deleteMany({}),
    CampaignAgreement.deleteMany({}), Shortlist.deleteMany({}), Notification.deleteMany({}),
    Transaction.deleteMany({}), Conversation.deleteMany({}), Message.deleteMany({})
  ]);

  brand = request.agent(app);
  const reg = await brand.post('/api/auth/register/brand').send({
    companyName: 'Insight Co', email: `insight-${S}@eztest.dev`, password: 'Passw0rd1', industry: 'technology'
  });
  assert.equal(reg.status, 201);

  // The creator signs in through the mock Instagram flow (dev mode) — the same
  // identity the brand will later invite, so id lookups must come from the DB.
  influencer = request.agent(app);
  const start = await request(app).get('/api/auth/instagram/start');
  const cb = await influencer.post('/api/auth/instagram/mock-callback').send({
    state: start.body.data.state, mockUser: 'dashcreator'
  });
  assert.equal(cb.status, 200);
  assert.equal(cb.body.data.role, 'influencer');

  const creator = await User.findOne({ 'instagram.providerId': 'mock-dashcreator' });
  assert.ok(creator, 'influencer user persisted by the OAuth flow');
  influencerId = String(creator._id);
  // the OAuth flow already creates the skeleton profile — complete it in place
  const profileRes = await InfluencerProfile.updateOne(
    { user: creator._id },
    {
      $set: {
        displayName: 'Dash Creator', username: 'dashcreator', niche: 'technology', isListed: true,
        rates: [{ format: 'reel', amount: 15000, currency: 'INR' }],
        audience: { followers: 24000, followersSource: 'meta_api' }
      }
    }
  );
  assert.equal(profileRes.matchedCount, 1, 'influencer profile exists after OAuth connect');

  const created = await brand.post('/api/brand/campaigns').send(campaignBody('Dashboard Launch'));
  assert.equal(created.status, 201);
  campaignId = created.body.data._id;
  const published = await brand.post(`/api/brand/campaigns/${campaignId}/transition`).send({ status: 'published' });
  assert.equal(published.status, 200);
});

test('overview requires authentication', async () => {
  const res = await request(app).get('/api/dashboard/overview');
  assert.equal(res.status, 401);
});

test('brand overview: empty-state shape before any activity', async () => {
  const res = await brand.get('/api/dashboard/overview');
  assert.equal(res.status, 200);
  const d = res.body.data;
  assert.equal(d.role, 'brand');
  assert.equal(d.totals.campaigns, 1);
  assert.equal(d.totals.campaignsDraft, 0);
  assert.equal(d.totals.campaignsLive, 1);
  assert.equal(d.totals.applicationsPending, 0);
  assert.equal(d.totals.shortlistedCreators, 0);
  assert.equal(d.spend.total, 0, 'no simulated payment recorded yet');
  assert.equal(d.spend.simulated, true);
  assert.equal(d.pipeline.length, 6, 'full agreement pipeline is always returned');
  assert.equal(d.pipeline.find((p) => p.status === 'paid').count, 0);
  assert.ok(Array.isArray(d.activity));
  assert.ok(d.checklist.some((c) => c.key === 'campaign' && c.done === true));
});

test('brand overview counts applications and shortlisted creators', async () => {
  const apply = await influencer.post(`/api/campaigns/${campaignId}/apply`).send({ proposedRate: 12000 });
  assert.equal(apply.status, 201);

  const list = await brand.post('/api/shortlists').send({ name: 'Q1 picks' });
  assert.equal(list.status, 201);
  const added = await brand.post(`/api/shortlists/${list.body.data._id}/items`).send({ influencerId });
  assert.equal(added.status, 201);

  const res = await brand.get('/api/dashboard/overview');
  const d = res.body.data;
  assert.equal(d.totals.applicationsPending, 1);
  assert.equal(d.totals.applicationsTotal, 1);
  assert.equal(d.totals.shortlistLists, 1);
  assert.equal(d.totals.shortlistedCreators, 1);

  // the application notification shows up in the brand's activity feed
  const notif = await Notification.findOne({ user: (await User.findOne({ role: 'brand' }))._id });
  assert.ok(notif, 'service should have notified the brand');
  assert.equal(d.activity[0].type, 'application_received');
  assert.equal(d.activity[0].unread, true);
});

test('influencer overview reflects invitations, applications and profile completeness', async () => {
  const inv = await brand.post(`/api/brand/campaigns/${campaignId}/invite`).send({ influencerId, proposedRate: 15000 });
  assert.equal(inv.status, 201);

  const res = await influencer.get('/api/dashboard/overview');
  assert.equal(res.status, 200);
  const d = res.body.data;
  assert.equal(d.role, 'influencer');
  assert.equal(d.totals.invitationsPending, 1);
  assert.equal(d.totals.applicationsPending, 1);
  assert.equal(d.totals.agreementsActive, 0);
  assert.equal(d.earnings.total, 0);
  assert.equal(d.earnings.simulated, true);
  assert.equal(d.totals.profileCompleteness, 100, 'niche + rates + followers are all set');
  assert.ok(d.activity.some((a) => a.type === 'invitation_received'));
});

test('influencer overview: agreements awaiting reply surface in the pipeline', async () => {
  const app1 = await CampaignApplication.findOne({ campaign: campaignId });
  const accept = await brand.post(`/api/applications/${app1._id}/accept`).send({ decisionNote: 'Nice portfolio' });
  assert.equal(accept.status, 200);

  // agreements are initiated from an accepted application (or invitation)
  const agreement = await brand.post('/api/agreements').send({
    applicationId: String(app1._id), agreedAmount: 12000
  });
  assert.equal(agreement.status, 201, `agreement initiate failed: ${JSON.stringify(agreement.body)}`);

  const res = await influencer.get('/api/dashboard/overview');
  const d = res.body.data;
  assert.equal(d.totals.agreementsAwaitingYou, 1, 'negotiating deals need the creator');
  assert.equal(d.pipeline.find((p) => p.status === 'negotiating').count, 1);
});

test('overview is read-only: unread message count tracks DMs, writes never happen', async () => {
  const conv = await influencer.post('/api/conversations').send({ campaignId });
  assert.ok([200, 201].includes(conv.status));
  const convId = conv.body.data._id;
  const sent = await brand.post(`/api/conversations/${convId}/messages`).send({ body: 'Hi! Excited to work together.' });
  assert.equal(sent.status, 201);

  const before = await influencer.get('/api/dashboard/overview');
  assert.equal(before.body.data.totals.unreadMessages, 1);

  // overview itself must not mutate anything
  const after = await influencer.get('/api/dashboard/overview');
  assert.equal(after.body.data.totals.unreadMessages, 1);
  const msgCount = await Message.countDocuments({ conversation: convId });
  assert.equal(msgCount, 1, 'reading the dashboard must not create or consume messages');
});

test('teardown: disconnect', async () => {
  await disconnectDB();
});
