/**
 * Dashboard service — read-only aggregates for the role dashboards.
 *
 * Everything here is derived from existing records; nothing is fabricated.
 * Money figures are sums over the SIMULATED ledger and are labeled as such
 * by the client, exactly like the payments screen does.
 */
import {
  Campaign, CampaignApplication, CampaignInvitation, CampaignAgreement,
  Shortlist, Conversation, Message, Notification, Transaction, InfluencerProfile
} from '../models/index.js';

const AGREEMENT_ORDER = ['negotiating', 'active', 'delivered', 'payout_pending', 'paid', 'cancelled'];

/** Unread direct messages addressed to this user (never their own sends). */
async function unreadMessages(userId) {
  const convs = await Conversation.find({ participants: userId }).select('_id').lean();
  if (convs.length === 0) return 0;
  return Message.countDocuments({
    conversation: { $in: convs.map((c) => c._id) },
    sender: { $ne: userId },
    readAt: null
  });
}

async function unreadNotifications(userId) {
  return Notification.countDocuments({ user: userId, readAt: null });
}

async function recentActivity(userId, limit = 6) {
  const items = await Notification.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('type title body createdAt readAt refs')
    .lean();
  return items.map((n) => ({
    id: String(n._id),
    type: n.type,
    title: n.title,
    body: n.body,
    createdAt: n.createdAt,
    unread: !n.readAt,
    campaignId: n.refs?.campaign ? String(n.refs.campaign) : null
  }));
}

/** Sum a single transaction type/status combination (SIMULATED ledger). */
async function sumTransactions(filter) {
  const rows = await Transaction.aggregate([
    { $match: filter },
    { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
  ]);
  return { total: rows[0]?.total || 0, count: rows[0]?.count || 0 };
}

async function pipelineCounts(filter) {
  const rows = await CampaignAgreement.aggregate([
    { $match: filter },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
  const map = Object.fromEntries(rows.map((r) => [r._id, r.count]));
  return AGREEMENT_ORDER.map((status) => ({ status, count: map[status] || 0 }));
}

/* ---------------- Brand ---------------- */

async function brandOverview(userId) {
  const [campaignsByStatus, applicationRows, invitationRows, shortlists, agreements, spend, unread, activity] = await Promise.all([
    Campaign.aggregate([{ $match: { brand: userId } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    // applications only on this brand's campaigns
    CampaignApplication.aggregate([
      { $lookup: { from: 'campaigns', localField: 'campaign', foreignField: '_id', as: 'c' } },
      { $unwind: '$c' },
      { $match: { 'c.brand': userId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    CampaignInvitation.aggregate([
      { $lookup: { from: 'campaigns', localField: 'campaign', foreignField: '_id', as: 'c' } },
      { $unwind: '$c' },
      { $match: { 'c.brand': userId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    Shortlist.aggregate([
      { $match: { owner: userId } },
      { $group: { _id: null, lists: { $sum: 1 }, creators: { $sum: { $size: '$items' } } } }
    ]),
    pipelineCounts({ brand: userId }),
    // brand-side committed spend = campaign_payment rows (SIMULATED)
    sumTransactions({ brand: userId, type: 'campaign_payment', status: { $in: ['simulated_pending', 'simulated_completed'] } }),
    Promise.all([unreadMessages(userId), unreadNotifications(userId)]),
    recentActivity(userId)
  ]);

  const campaignMap = Object.fromEntries(campaignsByStatus.map((r) => [r._id, r.count]));
  const appMap = Object.fromEntries(applicationRows.map((r) => [r._id, r.count]));
  const invMap = Object.fromEntries(invitationRows.map((r) => [r._id, r.count]));
  const live = (campaignMap.published || 0) + (campaignMap.paused || 0);
  const short = shortlists[0] || { lists: 0, creators: 0 };
  const awarded = agreements.filter((a) => !['cancelled', 'negotiating'].includes(a.status)).reduce((n, a) => n + a.count, 0);

  return {
    role: 'brand',
    totals: {
      campaigns: campaignsByStatus.reduce((n, r) => n + r.count, 0),
      campaignsDraft: campaignMap.draft || 0,
      campaignsLive: live,
      applicationsPending: appMap.pending || 0,
      applicationsTotal: Object.values(appMap).reduce((n, v) => n + v, 0),
      invitationsPending: invMap.pending || 0,
      shortlistLists: short.lists,
      shortlistedCreators: short.creators,
      agreementsActive: awarded,
      unreadMessages: unread[0],
      unreadNotifications: unread[1]
    },
    pipeline: agreements,
    spend: { ...spend, simulated: true, currency: 'INR' },
    activity,
    checklist: [
      { key: 'email', label: 'Verify your brand email', to: null, done: false },
      { key: 'campaign', label: 'Create your first campaign', to: '/brand/campaigns', done: (campaignsByStatus.reduce((n, r) => n + r.count, 0)) > 0 },
      { key: 'creators', label: 'Shortlist at least 3 creators', to: '/brand/discovery', done: short.creators >= 3 },
      { key: 'publish', label: 'Publish a campaign so creators can apply', to: '/brand/campaigns', done: live > 0 }
    ]
  };
}

/* ---------------- Influencer ---------------- */

async function influencerOverview(userId) {
  const [invitationRows, applicationRows, agreements, earnings, unread, activity, profile] = await Promise.all([
    CampaignInvitation.aggregate([{ $match: { influencer: userId } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    CampaignApplication.aggregate([{ $match: { influencer: userId } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    pipelineCounts({ influencer: userId }),
    // creator-side earnings = influencer_payout rows (SIMULATED)
    sumTransactions({ influencer: userId, type: 'influencer_payout', status: 'simulated_completed' }),
    Promise.all([unreadMessages(userId), unreadNotifications(userId)]),
    recentActivity(userId),
    InfluencerProfile.findOne({ user: userId }).lean()
  ]);

  const invMap = Object.fromEntries(invitationRows.map((r) => [r._id, r.count]));
  const appMap = Object.fromEntries(applicationRows.map((r) => [r._id, r.count]));
  const active = agreements.find((a) => a.status === 'active')?.count || 0;
  const awaiting = (agreements.find((a) => a.status === 'negotiating')?.count || 0);

  // profile completeness drives discovery visibility — surface it as a checklist
  const hasAudience = Boolean(profile?.audience?.followers);
  const hasRates = Boolean(profile?.rates?.length);
  const hasNiche = Boolean(profile?.niche && profile.niche !== 'unspecified');
  const complete = [hasAudience, hasRates, hasNiche].filter(Boolean).length;

  return {
    role: 'influencer',
    totals: {
      invitationsPending: invMap.pending || 0,
      invitationsTotal: Object.values(invMap).reduce((n, v) => n + v, 0),
      applicationsPending: appMap.pending || 0,
      applicationsAccepted: appMap.accepted || 0,
      agreementsActive: active,
      agreementsAwaitingYou: awaiting,
      unreadMessages: unread[0],
      unreadNotifications: unread[1],
      profileCompleteness: Math.round((complete / 3) * 100)
    },
    pipeline: agreements,
    earnings: { ...earnings, simulated: true, currency: 'INR' },
    activity,
    checklist: [
      { key: 'instagram', label: 'Connect your Instagram professional account', to: '/auth/instagram', done: Boolean(profile?.username) },
      { key: 'niche', label: 'Set your niche', to: '/influencer/dashboard', done: hasNiche },
      { key: 'rates', label: 'Publish your rate card', to: '/influencer/dashboard', done: hasRates },
      { key: 'explore', label: 'Apply to an open campaign', to: '/influencer/explore', done: Object.values(appMap).reduce((n, v) => n + v, 0) > 0 }
    ]
  };
}

export async function getDashboardOverview(user) {
  const id = user._id;
  if (user.role === 'brand') return brandOverview(id);
  if (user.role === 'influencer') return influencerOverview(id);
  return { role: user.role, totals: {}, pipeline: [], activity: [], checklist: [] };
}
