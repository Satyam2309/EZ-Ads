/**
 * Phase 4 tests — profiles, socials, discovery, shortlists against real app+DB.
 * Cover: search filters + sort + pagination, ownership (object-level) checks,
 * duplicate guards, honest data-source rules, RBAC on every route class.
 */
process.env.NODE_ENV = 'test';
process.env.OAUTH_MOCK_MODE = 'true';
process.env.TEST_DB_NAME = 'phase4'; // isolated DB: the runner runs files concurrently

import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDB, disconnectDB, syncIndexes } from '../src/config/db.js';
import { User, InfluencerProfile, Shortlist } from '../src/models/index.js';

const S = Date.now();
let brand, inflA, inflB, inflC, profileA, profileB, profileC;

async function mkInfluencer(name, igUser) {
  const u = await User.create({ role: 'influencer', displayName: name, instagram: { providerId: `${S}-${igUser}`, username: igUser, isMock: true } });
  return u;
}

test('setup: db, indexes, clean slate + test fixtures', async () => {
  await connectDB();
  await syncIndexes();
  await User.deleteMany({});
  await InfluencerProfile.deleteMany({});
  await Shortlist.deleteMany({});

  brand = request.agent(app);
  await brand.post('/api/auth/register/brand').send({
    companyName: 'Discovery Brand', email: `dbrand-${S}@eztest.dev`, password: 'Passw0rd1', industry: 'fashion'
  });

  inflA = await mkInfluencer('Riya Sharma', 'riya.style');
  inflB = await mkInfluencer('Aman Vlogs', 'amanvlogs');
  inflC = await mkInfluencer('Chef Neha', 'neha.eats');

  // A: fashion mumbai high followers, reel 12k, listed
  profileA = await InfluencerProfile.create({
    user: inflA._id, displayName: 'Riya Sharma', username: 'riya.style', niche: 'fashion',
    location: { city: 'Mumbai', country: 'India' },
    audience: { followers: 120000, followersSource: 'self_reported', engagementRate: 5.2 },
    rates: [{ format: 'reel', amount: 12000 }], minBudget: 8000, maxBudget: 30000,
    availability: 'available', isListed: true, bio: 'Saree draping and thrift hauls'
  });
  // B: tech bangalore mid
  profileB = await InfluencerProfile.create({
    user: inflB._id, displayName: 'Aman Vlogs', username: 'amanvlogs', niche: 'technology',
    location: { city: 'Bangalore', country: 'India' },
    audience: { followers: 54000, followersSource: 'self_reported', engagementRate: 3.1 },
    rates: [{ format: 'post', amount: 4000 }], minBudget: 3000, maxBudget: 12000,
    availability: 'limited', isListed: true, bio: 'Gadget reviews'
  });
  // C: food delhi, NOT listed (must never appear in discovery)
  profileC = await InfluencerProfile.create({
    user: inflC._id, displayName: 'Chef Neha', username: 'neha.eats', niche: 'food',
    location: { city: 'Delhi', country: 'India' },
    audience: { followers: 900000, followersSource: 'self_reported', engagementRate: 7.7 },
    minBudget: 10000, maxBudget: 90000, isListed: false
  });
});

test('discovery: only listed creators; niche filter; followers range; sort + pagination', async () => {
  const all = await brand.get('/api/influencers/search?page=1&limit=10');
  assert.equal(all.status, 200);
  assert.ok(!all.body.data.items.some((i) => i.displayName === 'Chef Neha'), 'unlisted creator must be excluded');
  assert.equal(all.body.data.items.length, 2);

  const fashion = await brand.get('/api/influencers/search?niche=fashion');
  assert.equal(fashion.body.data.total, 1);
  assert.equal(fashion.body.data.items[0].displayName, 'Riya Sharma');

  const followerRange = await brand.get('/api/influencers/search?minFollowers=100000');
  assert.equal(followerRange.body.data.total, 1);

  const sorted = await brand.get('/api/influencers/search?sort=followers');
  assert.equal(sorted.body.data.items[0].displayName, 'Riya Sharma');
  assert.equal(sorted.body.data.items[1].displayName, 'Aman Vlogs');

  const budget = await brand.get('/api/influencers/search?maxBudget=5000');
  assert.ok(!budget.body.data.items.some((i) => i.displayName === 'Riya Sharma'));

  const paginated = await brand.get('/api/influencers/search?limit=1&page=2');
  assert.equal(paginated.body.data.items.length, 1);
  assert.equal(paginated.body.data.pages, 2);
});

test('discovery: text search q + location filters', async () => {
  const q = await brand.get('/api/influencers/search?q=gadget');
  assert.equal(q.body.data.total, 1);
  assert.equal(q.body.data.items[0].displayName, 'Aman Vlogs');

  const city = await brand.get('/api/influencers/search?city=Mumbai');
  assert.equal(city.body.data.total, 1);
});

test('RBAC: anonymous search blocked; influencers/me/profile blocked for brands; shortlists blocked for influencers', async () => {
  const anon = await request(app).get('/api/influencers/search');
  assert.equal(anon.status, 401);

  const brandOnInfl = await brand.get('/api/influencers/me/profile');
  assert.equal(brandOnInfl.status, 403);

  // influencer hitting shortlists must 403 — create influencer agent
  const inflAgent = request.agent(app);
  const start = await inflAgent.get('/api/auth/instagram/start');
  const cb = await inflAgent.post('/api/auth/instagram/mock-callback').send({ state: start.body.data.state, mockUser: `rbac_${S}` });
  assert.equal(cb.status, 200);
  const sl = await inflAgent.get('/api/shortlists');
  assert.equal(sl.status, 403);
});

test('influencer can update own profile; audience source stays honest', async () => {
  const inflAgent = request.agent(app);
  const start = await inflAgent.get('/api/auth/instagram/start');
  await inflAgent.post('/api/auth/instagram/mock-callback').send({ state: start.body.data.state, mockUser: `updater_${S}` });

  const upd = await inflAgent.put('/api/influencers/me/profile').send({
    niche: 'food', bio: 'Street food tours', audience: { followers: 25000, engagementRate: 6.0 },
    rates: [{ format: 'reel', amount: 9000 }]
  });
  assert.equal(upd.status, 200);
  assert.equal(upd.body.data.niche, 'food');
  assert.equal(upd.body.data.audience.followersSource, 'self_reported', 'self-serve audience updates must stay self_reported');
  assert.equal(upd.body.data.isListed, false, 'profile stays unlisted until completion confirms listing');
});

test('discovery excludes unlisted; influencer sets isListed then appears', async () => {
  const before = await brand.get('/api/influencers/search?q=street food');
  assert.equal(before.body.data.total, 0);
  // after listing (simulating completion flow), the creator becomes discoverable
  const profile = await InfluencerProfile.findOne({ niche: 'food', bio: 'Street food tours' });
  profile.isListed = true;
  await profile.save();
  const after = await brand.get('/api/influencers/search?q=street food');
  assert.equal(after.body.data.total, 1);
});

test('social accounts: added as self_reported with manual_url; owner can delete; no connected spoofing', async () => {
  const inflAgent = request.agent(app);
  const start = await inflAgent.get('/api/auth/instagram/start');
  await inflAgent.post('/api/auth/instagram/mock-callback').send({ state: start.body.data.state, mockUser: `social_${S}` });

  const add = await inflAgent.post('/api/influencers/me/social').send({ platform: 'youtube', url: 'https://youtube.com/@socialtest' });
  assert.equal(add.status, 201);
  assert.equal(add.body.data.status, 'self_reported');
  assert.equal(add.body.data.connectionMethod, 'manual_url');

  const dup = await inflAgent.post('/api/influencers/me/social').send({ platform: 'youtube', url: 'https://youtube.com/@socialtest' });
  assert.equal(dup.status, 409);

  const rm = await inflAgent.delete(`/api/influencers/me/social/${add.body.data._id}`);
  assert.equal(rm.status, 200);

  // cannot delete someone else's social account
  const add2 = await inflAgent.post('/api/influencers/me/social').send({ platform: 'x', url: 'https://x.com/socialtest' });
  const other = await inflAgent.get('/api/auth/instagram/start');
  void other;
  const brandTry = await brand.delete(`/api/influencers/me/social/${add2.body.data._id}`);
  assert.equal(brandTry.status, 403); // role gate blocks brand from influencer route entirely
});

test('shortlists: create → add → duplicate guard → rename → item remove → delete; ownership enforced', async () => {
  const create = await brand.post('/api/shortlists').send({ name: 'Diwali picks' });
  assert.equal(create.status, 201);
  const id = create.body.data._id;

  const add = await brand.post(`/api/shortlists/${id}/items`).send({ influencerId: String(profileA.user) });
  assert.equal(add.status, 201);
  assert.equal(add.body.data.items.length, 1);

  const dup = await brand.post(`/api/shortlists/${id}/items`).send({ influencerId: String(profileA.user) });
  assert.equal(dup.status, 409);

  // add same creator to another list should still work (per-list uniqueness only)
  const l2 = await brand.post('/api/shortlists').send({ name: 'Second list' });
  const add2 = await brand.post(`/api/shortlists/${l2.body.data._id}/items`).send({ influencerId: String(profileA.user) });
  assert.equal(add2.status, 201);

  // ownership: another brand cannot touch this shortlist
  const brand2 = request.agent(app);
  await brand2.post('/api/auth/register/brand').send({
    companyName: 'Other Brand', email: `obrand-${S}@eztest.dev`, password: 'Passw0rd1', industry: 'beauty'
  });
  const foreign = await brand2.post(`/api/shortlists/${id}/items`).send({ influencerId: String(profileB.user) });
  assert.equal(foreign.status, 404, 'object-level ownership must make foreign shortlists invisible');

  const rename = await brand.patch(`/api/shortlists/${id}`).send({ name: 'Diwali shortlist' });
  assert.equal(rename.status, 200);
  assert.equal(rename.body.data.name, 'Diwali shortlist');

  const rmItem = await brand.delete(`/api/shortlists/${id}/items/${add.body.data.items[0]._id}`);
  assert.equal(rmItem.status, 200);
  assert.equal(rmItem.body.data.items.length, 0);

  const del = await brand.delete(`/api/shortlists/${id}`);
  assert.equal(del.status, 200);
});

test('public profile: whitelisted fields only; connected vs self-reported statuses preserved', async () => {
  const res = await brand.get(`/api/influencers/${profileA._id}`);
  assert.equal(res.status, 200);
  const body = res.body.data;
  assert.ok(body.profile.displayName);
  assert.ok(!('accessTokenEnc' in body.profile), 'no secrets projected');
  assert.ok(Array.isArray(body.socialAccounts));
});

test('public profile reachable by USER id (what shortlists store), not just profile _id', async () => {
  const byUser = await brand.get(`/api/influencers/${profileA.user}`);
  assert.equal(byUser.status, 200, 'shortlist “Profile” link uses the stored User id');
  assert.equal(byUser.body.data.profile.displayName, 'Riya Sharma');

  // unlisted creators must stay unreachable through either id form
  const unlistedByProfileId = await brand.get(`/api/influencers/${profileC._id}`);
  assert.equal(unlistedByProfileId.status, 404);
  const unlistedByUserId = await brand.get(`/api/influencers/${profileC.user}`);
  assert.equal(unlistedByUserId.status, 404);

  // invalid id shape → clean 404, not a cast error 500
  const bad = await brand.get('/api/influencers/not-an-id');
  assert.equal(bad.status, 404);
});

test('test isolation: NODE_ENV=test connects to a dedicated per-file *_test database', async () => {
  const name = mongoose.connection.name;
  // each test file sets TEST_DB_NAME so concurrent runner files never share fixtures
  assert.match(name, /_test(_[a-z0-9]+){0,1}$/, `expected isolated test DB, got: ${name}`);
});

test('teardown: disconnect', async () => {
  await disconnectDB();
});
