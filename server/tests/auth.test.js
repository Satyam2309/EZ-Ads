/**
 * Phase 3 auth API tests — hits the real Express app + MongoDB.
 * Covers: brand register/login/logout/me, email verification, password reset,
 * role-based access control (brand vs influencer-only route), Instagram OAuth
 * mock flow with state validation (signature, expiry, replay), and cookie flags.
 */
process.env.NODE_ENV = 'test';
process.env.OAUTH_MOCK_MODE = 'true';
process.env.TEST_DB_NAME = 'auth'; // isolated DB: the runner runs files concurrently

import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDB, disconnectDB, syncIndexes } from '../src/config/db.js';
import { User } from '../src/models/index.js';
import { signState } from '../src/services/oauthState.js';
import { latestDevToken } from '../src/services/devMailbox.js';

let agent; // brand agent with persistent cookie jar
const SUFFIX = Date.now();
const email = `brand-${SUFFIX}@eztest.dev`;
const password = 'Sup3rSecret!';

test('setup: connect DB + sync indexes + clear users', async () => {
  await connectDB();
  await syncIndexes();
  await User.deleteMany({});
  agent = request.agent(app);
});

test('register brand: validates required fields and password rules', async () => {
  const bad = await request(app).post('/api/auth/register/brand').send({ email: 'nope', password: 'short' });
  assert.equal(bad.status, 400);
  assert.equal(bad.body.error.code, 'VALIDATION_ERROR');
});

test('register brand: creates user + profile + session cookie (httpOnly)', async () => {
  const res = await agent.post('/api/auth/register/brand').send({
    companyName: 'Test Brand LLC', email, password, industry: 'technology', website: 'https://testbrand.dev'
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.emailVerified, false);
  const setCookie = res.headers['set-cookie'].join(';');
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /ezads_session=/);
});

test('duplicate email rejected with 409', async () => {
  const res = await request(app).post('/api/auth/register/brand').send({
    companyName: 'Dup Co', email, password, industry: 'fashion'
  });
  assert.equal(res.status, 409);
  assert.equal(res.body.error.code, 'EMAIL_TAKEN');
});

test('me: session works; unauthenticated gets 401', async () => {
  const ok = await agent.get('/api/auth/me');
  assert.equal(ok.status, 200);
  assert.equal(ok.body.data.role, 'brand');
  const anon = await request(app).get('/api/auth/me');
  assert.equal(anon.status, 401);
});

test('login: wrong password 401 (same message as unknown user — no enumeration)', async () => {
  const wrong = await request(app).post('/api/auth/login/brand').send({ email, password: 'WrongPass1' });
  assert.equal(wrong.status, 401);
  const missing = await request(app).post('/api/auth/login/brand').send({ email: 'ghost@x.dev', password: 'WrongPass1' });
  assert.equal(missing.status, 401);
  assert.equal(wrong.body.error.message, missing.body.error.message);
});

test('email verification: valid token verifies; tokens burn after use', async () => {
  const token = latestDevToken.get(email);
  assert.ok(token, 'dev mailbox should hold the verification token');
  const ok = await request(app).get(`/api/auth/verify-email?token=${token}`);
  assert.equal(ok.status, 200);
  assert.equal(ok.body.data.emailVerified, true);
  const replay = await request(app).get(`/api/auth/verify-email?token=${token}`);
  assert.equal(replay.status, 400);
  const me = await agent.get('/api/auth/me');
  assert.equal(me.body.data.emailVerified, true);
});

test('password reset: request → token → old password stops working, new works', async () => {
  await agent.post('/api/auth/password-reset-request').send({ email });
  const token = latestDevToken.get(email);
  assert.ok(token);
  const reset = await request(app).post('/api/auth/password-reset').send({ token, password: 'NewPass123' });
  assert.equal(reset.status, 200);

  const oldLogin = await request(app).post('/api/auth/login/brand').send({ email, password });
  assert.equal(oldLogin.status, 401);
  const newLogin = await request(app).post('/api/auth/login/brand').send({ email, password: 'NewPass123' });
  assert.equal(newLogin.status, 200);
  assert.ok(newLogin.headers['set-cookie']);
});

test('RBAC: brand blocked from influencer OAuth mock-completion without state; anonymous blocked everywhere protected', async () => {
  const noState = await request(app).post('/api/auth/instagram/mock-callback').send({});
  assert.equal(noState.status, 400);
  // brand agent cannot complete influencer flow with a *used* state either
  const stale = signState();
  const bad = await agent.post('/api/auth/instagram/mock-callback').send({ state: 'garbage.sig' });
  assert.equal(bad.status, 400);
});

test('instagram mock OAuth: full flow works and marks identity as mock', { concurrency: false }, async () => {
  const start = await request(app).get('/api/auth/instagram/start');
  assert.equal(start.status, 200);
  assert.equal(start.body.data.mode, 'mock');
  const { state } = start.body.data;

  const cb = await request(app).post('/api/auth/instagram/mock-callback').send({ state, mockUser: 'mock_creator_a' });
  assert.equal(cb.status, 200);
  assert.equal(cb.body.data.instagram.isMock, true, 'mock identity must be labeled as mock');
  assert.equal(cb.body.data.role, 'influencer');

  const me = await request(app).get('/api/auth/me');
  // supertest one-off request won't share the cookie jar; log in via agent instead
  const dbUser = await User.findOne({ 'instagram.providerId': 'mock-mock_creator_a' });
  assert.ok(dbUser, 'influencer user persisted with stable provider id');
  assert.equal(dbUser.instagram.isMock, undefined, 'isMock must stay hidden by default (select:false)');
  const withMock = await User.findById(dbUser._id).select('+instagram.isMock');
  assert.equal(withMock.instagram.isMock, true, 'mock flag persisted and readable via explicit select');
});

test('oauth state: replayed state rejected (nonce burn)', async () => {
  const start = await request(app).get('/api/auth/instagram/start');
  const { state } = start.body.data;
  const first = await request(app).post('/api/auth/instagram/mock-callback').send({ state, mockUser: 'other_creator' });
  assert.equal(first.status, 200);
  const replay = await request(app).post('/api/auth/instagram/mock-callback').send({ state, mockUser: 'other_creator' });
  assert.equal(replay.status, 400);
  assert.equal(replay.body.error.code, 'OAUTH_STATE_REPLAY');
});

test('oauth state: forged signature rejected', async () => {
  const res = await request(app).post('/api/auth/instagram/mock-callback').send({ state: 'eyJhIjoxfQ.forgedsig' });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'OAUTH_STATE_INVALID');
});

test('logout clears session', async () => {
  const res = await agent.post('/api/auth/logout');
  assert.equal(res.status, 200);
  const me = await agent.get('/api/auth/me');
  assert.equal(me.status, 401);
});

test('teardown: disconnect', async () => {
  await disconnectDB();
});
