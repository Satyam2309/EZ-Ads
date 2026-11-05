/**
 * Phase 2 model smoke tests — run against the configured MongoDB (local dev DB).
 * Verifies: all 15 models load + register, validation works, unique indexes
 * enforce invariants (provider id, chat pairing, duplicate application),
 * and discovery compound-index queries execute.
 */
process.env.NODE_ENV = 'test';
process.env.TEST_DB_NAME = 'models'; // isolated DB: the runner runs files concurrently

import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { connectDB, disconnectDB, syncIndexes } from '../src/config/db.js';
import {
  User,
  InfluencerProfile,
  BrandProfile,
  ConnectedSocialAccount,
  Campaign,
  CampaignApplication,
  CampaignInvitation,
  CampaignAgreement,
  Shortlist,
  Conversation,
  Message,
  Notification,
  Transaction,
  Report,
  AuditLog
} from '../src/models/index.js';

// isolated namespace so tests never touch real dev data
const PREFIX = `ezads_test_${Date.now()}`;

async function uniqueId() {
  return new mongoose.Types.ObjectId().toString();
}

test('setup: connect to MongoDB and build indexes', async () => {
  await connectDB();
  assert.equal(mongoose.connection.readyState, 1);
  // Clean leftovers from earlier failed test runs (runs before unique indexes
  // existed could leave duplicates that block a unique index build).
  for (const name of Object.keys(mongoose.models)) {
    await mongoose.models[name].deleteMany({});
  }
  await syncIndexes(); // ensure unique indexes exist before duplicate-insert tests
});

test('all 15 models are registered', () => {
  const names = mongoose.modelNames();
  for (const m of [
    'User', 'InfluencerProfile', 'BrandProfile', 'ConnectedSocialAccount',
    'Campaign', 'CampaignApplication', 'CampaignInvitation', 'CampaignAgreement',
    'Shortlist', 'Conversation', 'Message', 'Notification', 'Transaction',
    'Report', 'AuditLog'
  ]) {
    assert.ok(names.includes(m), `missing model ${m}`);
  }
});

test('user validation: rejects bad role and invalid email', async () => {
  const u = new User({ role: 'wizard' });
  const err = u.validateSync();
  assert.ok(err, 'should fail on bad role');
  const u2 = new User({ role: 'brand', email: 'not-an-email' });
  assert.ok(u2.validateSync(), 'should fail on bad email');
});

test('brand user + profile persist and unique email is enforced', async (t) => {
  const email = `${PREFIX}-brand@example.com`;
  const user = await User.create({ role: 'brand', email, passwordHash: 'x'.repeat(10) });
  const profile = await BrandProfile.create({
    user: user._id, companyName: `Test Co ${PREFIX}`, industry: 'fashion', website: 'https://example.com'
  });
  assert.ok(profile._id);

  await assert.rejects(
    () => User.create({ role: 'brand', email, passwordHash: 'y'.repeat(10) }),
    /duplicate|E11000/i
  );
  t.after(async () => {
    await BrandProfile.deleteOne({ user: user._id });
    await User.deleteOne({ _id: user._id });
  });
});

test('influencer: oauth identity + profile persist; provider id unique', async (t) => {
  const providerId = `${PREFIX}-ig-1`;
  const u1 = await User.create({ role: 'influencer', instagram: { providerId, username: 'creator_one' } });
  const prof = await InfluencerProfile.create({
    user: u1._id, displayName: 'Creator One', niche: 'fashion',
    audience: { followers: 48000, followersSource: 'meta_api', engagementRate: 4.6 },
    rates: [{ format: 'reel', amount: 12000 }], minBudget: 8000, maxBudget: 25000
  });

  await assert.rejects(
    () => User.create({ role: 'influencer', instagram: { providerId } }),
    (err) => err.code === 11000 || /duplicate/i.test(err.message)
  );

  // discovery query uses the isListed+followers compound index
  const found = await InfluencerProfile.find({ isListed: true, 'audience.followers': { $gte: 10000 } })
    .sort({ 'audience.followers': -1 })
    .limit(5)
    .lean();
  assert.ok(found.some((f) => String(f.user) === String(u1._id)));
  t.after(async () => {
    await InfluencerProfile.deleteOne({ _id: prof._id });
    await User.deleteOne({ _id: u1._id });
  });
});

test('campaign + application: unique per (campaign, influencer)', async (t) => {
  const brandUser = await User.create({ role: 'brand', email: `${PREFIX}-b2@example.com`, passwordHash: 'x'.repeat(10) });
  const infUser = await User.create({ role: 'influencer', instagram: { providerId: `${PREFIX}-ig-2` } });
  const campaign = await Campaign.create({
    brand: brandUser._id, title: `Campaign ${PREFIX}`, description: 'test', niche: 'fashion',
    budget: { total: 50000 }, status: 'published'
  });
  const app1 = await CampaignApplication.create({
    campaign: campaign._id, influencer: infUser._id, proposedRate: 12000
  });
  assert.equal(app1.status, 'pending');
  await assert.rejects(
    () => CampaignApplication.create({ campaign: campaign._id, influencer: infUser._id, proposedRate: 9000 }),
    (err) => err.code === 11000 || /duplicate/i.test(err.message)
  );
  t.after(async () => {
    await CampaignApplication.deleteOne({ _id: app1._id });
    await Campaign.deleteOne({ _id: campaign._id });
    await User.deleteMany({ _id: { $in: [brandUser._id, infUser._id] } });
  });
});

test('chat: conversation unique per (campaign, participants) and message timestamps set', async (t) => {
  const brandUser = await User.create({ role: 'brand', email: `${PREFIX}-b3@example.com`, passwordHash: 'x'.repeat(10) });
  const infUser = await User.create({ role: 'influencer', instagram: { providerId: `${PREFIX}-ig-3` } });
  const conv = await Conversation.create({ campaign: new mongoose.Types.ObjectId(), participants: [brandUser._id, infUser._id] });
  const msg = await Message.create({ conversation: conv._id, sender: infUser._id, body: 'hello' });
  assert.ok(msg.createdAt);
  await assert.rejects(
    () => Conversation.create({ campaign: conv.campaign, participants: [infUser._id, brandUser._id] }),
    (err) => err.code === 11000 || /duplicate/i.test(err.message)
  );
  t.after(async () => {
    await Message.deleteOne({ _id: msg._id });
    await Conversation.deleteOne({ _id: conv._id });
    await User.deleteMany({ _id: { $in: [brandUser._id, infUser._id] } });
  });
});

test('transaction: idempotency key unique (no double payouts)', async (t) => {
  const brandUser = await User.create({ role: 'brand', email: `${PREFIX}-b4@example.com`, passwordHash: 'x'.repeat(10) });
  const infUser = await User.create({ role: 'influencer', instagram: { providerId: `${PREFIX}-ig-4` } });
  const agreementData = {
    campaign: new mongoose.Types.ObjectId(),
    influencer: infUser._id,
    brand: brandUser._id,
    agreedAmount: 10000,
    commissionPercent: 10,
    commissionAmount: 1000,
    influencerPayout: 9000
  };
  const agreement = await CampaignAgreement.create(agreementData);
  const key = `${PREFIX}-payout-1`;
  const tx1 = await Transaction.create({
    agreement: agreement._id, campaign: agreementData.campaign, brand: brandUser._id, influencer: infUser._id,
    type: 'influencer_payout', amount: 9000, status: 'simulated_completed', idempotencyKey: key
  });
  assert.equal(tx1.simulatedLabel, 'SIMULATED — no real money transferred');
  await assert.rejects(
    () => Transaction.create({
      agreement: agreement._id, campaign: agreementData.campaign, brand: brandUser._id, influencer: infUser._id,
      type: 'influencer_payout', amount: 9000, status: 'simulated_completed', idempotencyKey: key
    }),
    (err) => err.code === 11000 || /duplicate/i.test(err.message)
  );
  t.after(async () => {
    await Transaction.deleteOne({ _id: tx1._id });
    await CampaignAgreement.deleteOne({ _id: agreement._id });
    await User.deleteMany({ _id: { $in: [brandUser._id, infUser._id] } });
  });
});

test('audit log is append-only', async (t) => {
  const entry = await AuditLog.create({ action: 'test.event', meta: { ok: true } });
  await assert.rejects(async () => {
    entry.action = 'tampered';
    await entry.save();
  }, /immutable/i);
  t.after(() => AuditLog.deleteOne({ _id: entry._id }));
});

test('teardown: disconnect', async () => {
  await disconnectDB();
});
