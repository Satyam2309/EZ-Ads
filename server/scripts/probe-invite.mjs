process.env.NODE_ENV = 'test';
process.env.OAUTH_MOCK_MODE = 'true';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';

await connectDB();
const S = Date.now();
const brand = request.agent(app);
const reg = await brand.post('/api/auth/register/brand').send({ companyName: 'Probe Brand', email: `p${S}@eztest.dev`, password: 'Passw0rd1', industry: 'technology' });
console.log('register:', reg.status, JSON.stringify(reg.body).slice(0, 160));
const infl = request.agent(app);
const start = await infl.get('/api/auth/instagram/start');
const cb = await infl.post('/api/auth/instagram/mock-callback').send({ state: start.body.data.state, mockUser: 'probe5' });
const inviteeId = cb.body.data.id;
console.log('invitee session id:', inviteeId);

const c = await brand.post('/api/brand/campaigns').send({ title: 'Probe', description: 'probe campaign desc', budget: { total: 1000 }, niche: 'tech' });
console.log('create campaign:', c.status, JSON.stringify(c.body).slice(0, 180));
const cid = c.body.data._id;
await brand.post(`/api/brand/campaigns/${cid}/transition`).send({ status: 'published' });

const inv1 = await brand.post(`/api/brand/campaigns/${cid}/invite`).send({ influencerId: inviteeId });
console.log('invite1:', inv1.status, inv1.body.data?._id);

const mine = await infl.get('/api/influencer/invitations');
console.log('list:', mine.body.data.map((i) => ({ id: i._id, status: i.status, camp: String(i.campaign._id || i.campaign) })));

const invId = mine.body.data.find((i) => String(i.campaign._id || i.campaign) === cid)?._id;
const dec = await infl.post(`/api/invitations/${invId}/respond`).send({ accept: false });
console.log('decline:', dec.status, dec.body.data?.status, 'target was', invId);

const inv2 = await brand.post(`/api/brand/campaigns/${cid}/invite`).send({ influencerId: inviteeId });
console.log('revive:', inv2.status, 'returned _id:', inv2.body.data?._id, '=== invId?', String(inv2.body.data?._id) === String(invId));

const docs = await mongoose.connection.collection('campaigninvitations').find({}).toArray();
console.log('all invitation docs:', docs.map((d) => ({ _id: d._id, infl: String(d.influencer), status: d.status })));
await disconnectDB();
