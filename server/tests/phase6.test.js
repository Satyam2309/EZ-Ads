/**
 * Phase 6 tests — chat, notifications, simulated payments, realtime sockets.
 * Runs against the real app + isolated ezads_test DB.
 * Covers: conversation authorization (no-relationship gate, pair uniqueness,
 * foreign user 404), messages persistence + read state, notification emission
 * + unread counts + mark-read, simulated ledger rows + idempotency + RBAC,
 * Socket.IO: unauthenticated handshake rejected, room authorization enforced.
 */
process.env.NODE_ENV = 'test';
process.env.OAUTH_MOCK_MODE = 'true';
process.env.TEST_DB_NAME = 'phase6'; // isolated DB: the runner runs files concurrently

import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import http from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient } from 'socket.io-client';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDB, disconnectDB, syncIndexes } from '../src/config/db.js';
import {
  User, Campaign, CampaignApplication, CampaignInvitation, CampaignAgreement,
  Conversation, Message, Notification, Transaction
} from '../src/models/index.js';
import { registerChatSockets } from '../src/sockets/chat.js';
import { recordSimulatedPayout } from '../src/services/paymentService.js';
import { signSessionToken } from '../src/utils/tokens.js';

const S = Date.now();
let brand, brand2;        // HTTP agents (brands)
let creatorAgent, otherAgent; // HTTP agents (influencers via mock OAuth)
let creatorUser, otherUser;   // User docs behind those agents
let campaignId, agreementId, convId;

async function mockLogin(agent, username) {
  const st = await agent.get('/api/auth/instagram/start');
  assert.equal(st.status, 200);
  const cb = await agent.post('/api/auth/instagram/mock-callback').send({ state: st.body.data.state, mockUser: username });
  assert.equal(cb.status, 200);
  const me = await agent.get('/api/auth/me');
  assert.equal(me.status, 200);
  return me.body.data;
}

test('phase6 setup: isolated DB + users', async () => {
  await connectDB();
  await syncIndexes();
  await Promise.all([
    User.deleteMany({}), Campaign.deleteMany({}), CampaignApplication.deleteMany({}),
    CampaignInvitation.deleteMany({}), CampaignAgreement.deleteMany({}),
    Conversation.deleteMany({}), Message.deleteMany({}), Notification.deleteMany({}), Transaction.deleteMany({})
  ]);

  brand = request.agent(app);
  await brand.post('/api/auth/register/brand').send({
    companyName: 'Phase6 Brand', email: `p6b-${S}@eztest.dev`, password: 'Passw0rd1', industry: 'technology'
  });
  brand2 = request.agent(app);
  await brand2.post('/api/auth/register/brand').send({
    companyName: 'Phase6 Other', email: `p6b2-${S}@eztest.dev`, password: 'Passw0rd1', industry: 'fashion'
  });

  // creators log in through the mock OAuth path (sessions carry their user ids)
  creatorAgent = request.agent(app);
  await mockLogin(creatorAgent, 'riya6');
  otherAgent = request.agent(app);
  await mockLogin(otherAgent, 'other6');

  creatorUser = await User.findOne({ 'instagram.username': 'riya6' });
  assert.ok(creatorUser, 'creator session user should exist');
  otherUser = await User.findOne({ 'instagram.username': 'other6' });
  assert.ok(otherUser, 'second creator session user should exist');
  assert.notEqual(String(creatorUser._id), String(otherUser._id));

  const created = await brand.post('/api/brand/campaigns').send({
    title: `Phase6 campaign ${S}`, description: 'Test campaign for the phase six chat, notifications and payments suite.',
    niche: 'technology', budget: { total: 80000 }
  });
  assert.equal(created.status, 201);
  campaignId = created.body.data._id;
  assert.equal((await brand.post(`/api/brand/campaigns/${campaignId}/transition`).send({ status: 'published' })).status, 200);
});

/* ---------- chat authorization ---------- */

test('chat: influencer without relationship cannot open a conversation (404)', async () => {
  const res = await otherAgent.post('/api/conversations').send({ campaignId });
  assert.equal(res.status, 404);
});

test('chat: creator applies → can open conversation; second create returns the same conversation', async () => {
  const apply = await creatorAgent.post(`/api/campaigns/${campaignId}/apply`).send({ proposedRate: 9000, message: 'hi brand' });
  assert.equal(apply.status, 201);

  const conv = await creatorAgent.post('/api/conversations').send({ campaignId });
  assert.equal(conv.status, 201);
  convId = conv.body.data._id;
  assert.ok(convId);

  const again = await creatorAgent.post('/api/conversations').send({ campaignId });
  assert.equal(String(again.body.data._id), String(convId));

  // brand side opens the same pair → same conversation id
  const fromBrand = await brand.post('/api/conversations').send({ campaignId, influencerId: String(creatorUser._id) });
  assert.equal(String(fromBrand.body.data._id), String(convId));
});

test('chat: foreign brand cannot open chat about it (404); stranger is 404 on list/send', async () => {
  const foreign = await brand2.post('/api/conversations').send({ campaignId });
  assert.equal(foreign.status, 404);

  const list = await otherAgent.get(`/api/conversations/${convId}/messages`);
  assert.equal(list.status, 404);
  const send = await otherAgent.post(`/api/conversations/${convId}/messages`).send({ body: 'sneaky' });
  assert.equal(send.status, 404);
});

test('chat: messages persist; read state isolated; unread counts work', async () => {
  const m1 = await brand.post(`/api/conversations/${convId}/messages`).send({ body: 'Hello creator!' });
  assert.equal(m1.status, 201);
  const m2 = await creatorAgent.post(`/api/conversations/${convId}/messages`).send({ body: 'Hello brand!' });
  assert.equal(m2.status, 201);

  const list = await brand.get(`/api/conversations/${convId}/messages`);
  assert.equal(list.status, 200);
  assert.equal(list.body.data.length, 2);
  assert.equal(list.body.data[list.body.data.length - 1].body, 'Hello brand!');

  // brand's own unread count counts only the creator's message
  let unread = await brand.get('/api/conversations');
  assert.equal(unread.body.data.unread, 1);

  const mark = await brand.post(`/api/conversations/${convId}/read`);
  assert.equal(mark.status, 200);
  assert.equal(mark.body.data.updated, 1);

  unread = await brand.get('/api/conversations');
  assert.equal(unread.body.data.unread, 0);

  const convDoc = await Conversation.findById(convId);
  assert.equal(convDoc.lastMessagePreview, 'Hello brand!');
});

/* ---------- notifications ---------- */

test('notifications: application_received was emitted to the brand; unread count + mark-read', async () => {
  const list = await brand.get('/api/notifications');
  assert.equal(list.status, 200);
  const got = list.body.data.items.find((n) => n.type === 'application_received');
  assert.ok(got, 'expected an application_received notification');
  assert.equal(String(got.refs.campaign), String(campaignId));
  assert.ok(list.body.data.unread > 0);

  const mark = await brand.post('/api/notifications/read').send({});
  assert.equal(mark.status, 200);
  const after = await brand.get('/api/notifications');
  assert.equal(after.body.data.unread, 0);

  const onlyUnread = await brand.get('/api/notifications?unreadOnly=true');
  assert.equal(onlyUnread.body.data.items.length, 0);
});

/* ---------- simulated payments ---------- */

test('payments: agreement flow → paid → exactly 3 ledger rows (SIMULATED labels, correct amounts)', async () => {
  const find = await brand.get(`/api/brand/campaigns/${campaignId}/applications`);
  const app = find.body.data.find((a) => String(a.influencer?._id || a.influencer) === String(creatorUser._id));
  assert.ok(app, 'application by session creator should exist');
  assert.equal((await brand.post(`/api/applications/${app._id}/accept`).send({})).status, 200);

  const agr = await brand.post('/api/agreements').send({ applicationId: app._id, agreedAmount: 10000 });
  assert.equal(agr.status, 201);
  agreementId = agr.body.data._id;
  assert.equal(agr.body.data.commissionAmount, 1000);
  assert.equal(agr.body.data.influencerPayout, 9000);

  assert.equal((await creatorAgent.post(`/api/agreements/${agreementId}/respond`).send({ accept: true })).status, 200);
  assert.equal((await brand.post(`/api/agreements/${agreementId}/transition`).send({ status: 'delivered' })).status, 200);
  assert.equal((await brand.post(`/api/agreements/${agreementId}/transition`).send({ status: 'payout_pending' })).status, 200);
  const paid = await brand.post(`/api/agreements/${agreementId}/transition`).send({ status: 'paid' });
  assert.equal(paid.status, 200);

  const rows = await Transaction.find({ agreement: agreementId }).sort({ createdAt: 1 });
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map((r) => r.amount).sort((a, b) => b - a), [10000, 9000, 1000]);
  for (const r of rows) {
    assert.equal(r.simulatedLabel, 'SIMULATED — no real money transferred');
    assert.equal(r.status, 'simulated_completed');
  }
});

test('payments: replaying the payout records nothing new (idempotent)', async () => {
  const agreement = await CampaignAgreement.findById(agreementId).select('+payoutPaidAt');
  const again = await recordSimulatedPayout(agreement);
  assert.equal(again.recorded, false);
  assert.equal(await Transaction.countDocuments({ agreement: agreementId }), 3);
});

test('payments: RBAC — brand sees own rows, foreign brand sees none, creator sees own rows', async () => {
  const mine = await brand.get('/api/payments');
  assert.equal(mine.status, 200);
  assert.equal(mine.body.data.items.length, 3);

  const everyone = await brand2.get('/api/payments');
  assert.equal(everyone.status, 200);
  assert.equal(everyone.body.data.items.length, 0);

  const creator = await creatorAgent.get('/api/payments');
  assert.equal(creator.status, 200);
  assert.equal(creator.body.data.items.length, 3);
  const payoutRow = creator.body.data.items.find((r) => r.type === 'influencer_payout');
  assert.equal(payoutRow.amount, 9000);
});

/* ---------- notifications from agreement milestones ---------- */

test('notifications: campaign_agreed reached the brand; payout_recorded (SIMULATED) reached the creator', async () => {
  const forBrand = await brand.get('/api/notifications');
  assert.ok(forBrand.body.data.items.find((n) => n.type === 'campaign_agreed'), 'brand should have campaign_agreed');

  const forCreator = await creatorAgent.get('/api/notifications');
  const payout = forCreator.body.data.items.find((n) => n.type === 'payout_recorded');
  assert.ok(payout, 'creator should have payout_recorded');
  assert.match(payout.body, /SIMULATED/i);
});

/* ---------- realtime (Socket.IO) ---------- */

test('sockets: unauthenticated handshake rejected; participant joins room; stranger cannot; realtime message received', async () => {
  const httpServer = http.createServer();
  const io = new SocketIOServer(httpServer, { transports: ['websocket'] });
  registerChatSockets(io);
  await new Promise((r) => httpServer.listen(0, r));
  const port = httpServer.address().port;
  const url = `http://localhost:${port}`;

  // 1. no cookie → rejected
  const anon = ioClient(url, { transports: ['websocket'], reconnection: false });
  const anonResult = await new Promise((resolve) => {
    anon.on('connect_error', (e) => resolve(e.message));
    setTimeout(() => resolve('timeout'), 4000);
  });
  assert.equal(anonResult, 'unauthorized');
  anon.close();

  // 2. authenticated creator (real session cookie) joins its conversation
  const creatorCookie = `ezads_session=${signSessionToken(creatorUser)}`;
  const client = ioClient(url, { transports: ['websocket'], reconnection: false, extraHeaders: { cookie: creatorCookie } });
  await waitForConnect(client);

  const join = await new Promise((resolve) => client.emit('conversation:join', { conversationId: convId }, resolve));
  assert.equal(join.ok, true);

  // stranger (valid session, not a participant) cannot join the room
  const strangerCookie = `ezads_session=${signSessionToken(otherUser)}`;
  const client2 = ioClient(url, { transports: ['websocket'], reconnection: false, extraHeaders: { cookie: strangerCookie } });
  await waitForConnect(client2);
  const badJoin = await new Promise((resolve) => client2.emit('conversation:join', { conversationId: convId }, resolve));
  assert.equal(badJoin.ok, false);

  // 3. realtime delivery: creator sends via socket; brand socket receives in-room only
  const brandDoc = await User.findOne({ role: 'brand' }).select('-passwordHash');
  const brandClient = ioClient(url, { transports: ['websocket'], reconnection: false, extraHeaders: { cookie: `ezads_session=${signSessionToken(brandDoc)}` } });
  await waitForConnect(brandClient);
  assert.equal((await new Promise((resolve) => brandClient.emit('conversation:join', { conversationId: convId }, resolve))).ok, true);

  const received = new Promise((resolve) => brandClient.on('message:new', resolve));
  const sent = await new Promise((resolve) => client.emit('conversation:message', { conversationId: convId, body: 'realtime hello' }, resolve));
  assert.equal(sent.ok, true);
  const msg = await Promise.race([received, new Promise((r) => setTimeout(() => r(null), 4000))]);
  assert.ok(msg, 'brand socket should receive message:new');
  assert.equal(msg.body, 'realtime hello');

  client.close(); client2.close(); brandClient.close();
  io.close();
  await new Promise((r) => httpServer.close(r));
});

async function waitForConnect(socket) {
  await new Promise((resolve, reject) => {
    socket.on('connect', resolve);
    socket.on('connect_error', reject);
    setTimeout(() => reject(new Error('socket connect timeout')), 4000);
  });
}

test('phase6 teardown: disconnect', async () => {
  await disconnectDB();
  void mongoose;
});
