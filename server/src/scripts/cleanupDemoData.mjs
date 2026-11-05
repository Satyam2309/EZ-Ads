/**
 * Cleans DEMO/TEST data out of a local DEV database.
 *
 *   npm run clean:demo -- --yes
 *
 * Scope is deliberately tight — it will NEVER touch a production DB:
 *  - brand users whose email ends in @eztest.dev (the demo/test domain used by
 *    seeds and E2E scripting)
 *  - influencer users created by the mock Instagram flow (providerId mock-*,
 *    i.e. isMock accounts — fake by construction)
 *  - every document that references those users or their campaigns:
 *    profiles, campaigns, shortlists, applications, invitations, agreements,
 *    simulated transactions, conversations, notifications, audit logs, reports
 *
 * Refuses to run: without --yes, against Atlas (mongodb+srv), or against a
 * non-localhost host. Real user data (any other email/provider) is untouched.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
// model imports must happen explicitly — the script is the only caller of these
// collections here, so nothing else triggers registration on mongoose.models
import {
  User, InfluencerProfile, Report, AuditLog, Notification, Conversation,
  Transaction, CampaignApplication, CampaignInvitation, Shortlist,
  CampaignAgreement, Campaign
} from '../models/index.js';

const args = process.argv.slice(2);
if (!args.includes('--yes')) {
  console.error('Refusing to run without --yes (dry-run first if you want: add --dry-run to only report).');
  process.exit(1);
}
const DRY_RUN = args.includes('--dry-run');

const uri = process.env.MONGODB_URI || env.MONGODB_URI;
const host = new URL(uri.replace('mongodb+srv://', 'https://').replace('mongodb://', 'https://')).hostname;
if (!uri.startsWith('mongodb://') || !['127.0.0.1', 'localhost', '[::1]'].includes(host)) {
  console.error(`Refusing: this cleanup targets localhost only. Got host: ${host}`);
  process.exit(1);
}

await mongoose.connect(uri, { maxPoolSize: 4 });
const M = {
  User, InfluencerProfile, Report, AuditLog, Notification, Conversation,
  Transaction, CampaignApplication, CampaignInvitation, Shortlist,
  CampaignAgreement, Campaign
};

/* ---------------- identify targets ---------------- */
const testBrands = await M.User.find({ role: 'brand', email: /@eztest\.dev$/i }, { _id: 1, email: 1 }).lean();
const mockInfluencers = await M.User.find(
  { role: 'influencer', 'instagram.providerId': /^mock-/ },
  { _id: 1, 'instagram.username': 1 }
).lean();

const brandIds = testBrands.map((u) => u._id);
const inflIds = mockInfluencers.map((u) => u._id);
const userIds = [...brandIds, ...inflIds];

console.log(`demo brand accounts:   ${brandIds.length}`);
testBrands.forEach((u) => console.log(`  - ${u.email}`));
console.log(`mock influencer accounts: ${inflIds.length}`);
mockInfluencers.forEach((u) => console.log(`  - @${u.instagram?.username || u.instagram?.providerId}`));
if (userIds.length === 0) { console.log('nothing to clean.'); await mongoose.disconnect(); process.exit(0); }

/* campaigns owned by demo brands */
const campaigns = await M.Campaign.find({ brand: { $in: brandIds } }, { _id: 1 }).lean();
const campaignIds = campaigns.map((c) => c._id);

/* agreements on/or tied to those users */
const agreements = await M.CampaignAgreement.find({
  $or: [
    { campaign: { $in: campaignIds } },
    { influencer: { $in: inflIds } },
    { brand: { $in: brandIds } }
  ]
}, { _id: 1 }).lean();
const agreementIds = agreements.map((a) => a._id);

/* ---------------- dependent deletes ---------------- */
const steps = [
  ['BrandProfile', { user: { $in: brandIds } }], // demo brands' company profile rows (was missed once, leaving danglers)
  ['InfluencerProfile', { user: { $in: inflIds } }],
  ['Report', { $or: [{ reporter: { $in: userIds } }, { targetUser: { $in: userIds } }] }],
  ['AuditLog', { actor: { $in: [...userIds, ...campaignIds] } }],
  ['Notification', { $or: [{ user: { $in: userIds } }, { 'refs.campaign': { $in: campaignIds } }] }],
  ['Conversation', { $or: [{ campaign: { $in: campaignIds } }, { participants: { $in: userIds } }] }],
  ['Transaction', { $or: [{ campaign: { $in: campaignIds } }, { agreement: { $in: agreementIds } }] }],
  ['CampaignApplication', { $or: [{ campaign: { $in: campaignIds } }, { influencer: { $in: inflIds } }] }],
  ['CampaignInvitation', { $or: [{ campaign: { $in: campaignIds } }, { influencer: { $in: inflIds } }] }],
  ['Shortlist', { $or: [{ owner: { $in: brandIds } }, { 'items.influencer': { $in: inflIds } }] }],
  ['CampaignAgreement', { _id: { $in: agreementIds } }],
  ['Campaign', { _id: { $in: campaignIds } }],
  ['User', { _id: { $in: userIds } }]
];

let failure = false;
for (const [model, filter] of steps) {
  const coll = M[model];
  if (!coll) { console.warn(`missing model skipped: ${model}`); continue; }
  const count = await coll.countDocuments(filter);
  if (DRY_RUN) {
    console.log(`(dry) ${model}: would delete ${count}`);
  } else {
    const res = await coll.deleteMany(filter);
    console.log(`del   ${model}: ${res.deletedCount}`);
    if (res.deletedCount !== count) failure = true; // concurrent writes, report rather than hide
  }
}

await mongoose.disconnect();
console.log(DRY_RUN ? '\nDRY-RUN COMPLETE (re-run without --dry-run, with --yes, to delete)' : '\nDEMO DATA CLEANED');
process.exit(failure ? 2 : 0);
