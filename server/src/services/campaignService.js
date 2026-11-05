/**
 * Campaign service — phase 5 core workflow logic.
 * Owns: state-transition legality, counters maintenance, commission math,
 * and the invariants that money fields must never be trusted from the client.
 */
import { Campaign, CampaignApplication, CampaignInvitation, CampaignAgreement, InfluencerProfile, User } from '../models/index.js';
import { AppError, notFound, forbidden, conflict, badRequest } from '../utils/errors.js';
import { notify } from './notificationService.js';
import { recordSimulatedPayout, announcePayout } from './paymentService.js';

/** Best-effort notification wrapper — workflow must not fail on notify slippage. */
const gentNotify = (...args) => { void notify(...args).catch(() => {}); };

export const CAMPAIGN_TRANSITIONS = {
  draft: ['published'],
  published: ['paused', 'completed', 'archived'],
  paused: ['published', 'archived'],
  archived: [],
  completed: []
};

/** Platform commission. Single source of truth — Phase 6 payments will read this too. */
export const PLATFORM_COMMISSION_PERCENT = 10;

export function computeMoney(agreedAmount, commissionPercent) {
  // whole-paise rounding on the commission; payout is exactly the remainder
  const commissionAmount = Math.round((agreedAmount * commissionPercent) / 100);
  return { commissionAmount, influencerPayout: agreedAmount - commissionAmount };
}

/* ---------------- Campaigns ---------------- */

export async function createCampaign(brandId, data) {
  return Campaign.create({ ...data, brand: brandId, status: 'draft' });
}

/**
 * Owner-scoped update. $set only — counters never client-editable, and status
 * change must go through the transition endpoint.
 */
export async function updateCampaign(brandId, campaignId, updates) {
  const clean = { ...updates };
  delete clean.status;
  delete clean.stats;
  delete clean.brand;
  const c = await Campaign.findOneAndUpdate({ _id: campaignId, brand: brandId }, { $set: clean }, {
    new: true, runValidators: true, context: 'query'
  });
  if (!c) throw notFound('Campaign not found');
  return c;
}

export async function transitionCampaign(brandId, campaignId, nextStatus) {
  const campaign = await Campaign.findOne({ _id: campaignId, brand: brandId });
  if (!campaign) throw notFound('Campaign not found');
  const allowed = CAMPAIGN_TRANSITIONS[campaign.status] || [];
  if (!allowed.includes(nextStatus)) {
    throw conflict(`Cannot move campaign from '${campaign.status}' to '${nextStatus}'`, 'INVALID_TRANSITION');
  }
  if (nextStatus === 'published') {
    if (!campaign.budget?.total) throw badRequest('Set a budget before publishing', 'BUDGET_REQUIRED');
    if (campaign.applicationDeadline && campaign.applicationDeadline < new Date()) {
      throw badRequest('Application deadline is in the past', 'DEADLINE_PAST');
    }
  }
  campaign.status = nextStatus;
  await campaign.save();
  return campaign;
}

export async function listBrandCampaigns(brandId, { status, page = 1, limit = 20 }) {
  const q = { brand: brandId };
  if (status) q.status = status;
  page = Math.max(1, Number(page) || 1);
  limit = Math.min(50, Math.max(1, Number(limit) || 20));
  const [items, total] = await Promise.all([
    Campaign.find(q).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Campaign.countDocuments(q)
  ]);
  return { items, total, page, pages: Math.ceil(total / limit) || 1 };
}

/** Public discovery feed for creators: published only, whitelisted fields. */
export async function listOpenCampaigns({ niche, page = 1, limit = 12 }) {
  const q = { status: 'published' };
  if (niche) q.niche = String(niche).toLowerCase().trim();
  page = Math.max(1, Number(page) || 1);
  limit = Math.min(50, Math.max(1, Number(limit) || 12));
  const [items, total] = await Promise.all([
    Campaign.find(q)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('title description niche budget deliverables applicationDeadline startDate endDate brand createdAt')
      .populate('brand', 'displayName avatarUrl brandCompanyName'),
    Campaign.countDocuments(q)
  ]);
  return { items, total, page, pages: Math.ceil(total / limit) || 1 };
}

export async function getCampaignForBrand(brandId, campaignId) {
  const campaign = await Campaign.findOne({ _id: campaignId, brand: brandId });
  if (!campaign) throw notFound('Campaign not found');
  return campaign;
}

/* ---------------- Applications ---------------- */

export async function applyToCampaign(influencerId, campaignId, data) {
  const campaign = await Campaign.findOne({ _id: campaignId, status: 'published' });
  if (!campaign) throw notFound('Campaign not found or not open for applications');

  const existing = await CampaignApplication.findOne({ campaign: campaignId, influencer: influencerId });
  if (existing && existing.status !== 'withdrawn') {
    throw conflict('You already have an active application on this campaign', 'APPLICATION_EXISTS');
  }
  if (existing) {
    // resubmit after withdrawal
    existing.set({ ...data, status: 'pending', decidedAt: undefined, decisionNote: undefined });
    await existing.save();
    return existing;
  }
  const app = await CampaignApplication.create({ campaign: campaignId, influencer: influencerId, ...data });
  await Campaign.updateOne({ _id: campaignId }, { $inc: { 'stats.applicationsCount': 1 } });
  gentNotify(campaign.brand, 'application_received', { campaign: campaignId, application: app._id, actor: influencerId },
    'New application', `Creator applied to “${campaign.title}”`);
  return app;
}

export async function withdrawApplication(influencerId, applicationId) {
  const app = await CampaignApplication.findOneAndUpdate(
    { _id: applicationId, influencer: influencerId, status: 'pending' },
    { status: 'withdrawn' },
    { new: true }
  );
  if (!app) throw notFound('Pending application not found');
  await Campaign.updateOne({ _id: app.campaign }, { $inc: { 'stats.applicationsCount': -1 } });
  return app;
}

/** Brand views applications on own campaign (joined with creator cards). */
export async function listCampaignApplications(brandId, campaignId) {
  await getCampaignForBrand(brandId, campaignId); // ownership gate
  const apps = await CampaignApplication.find({ campaign: campaignId })
    .sort({ createdAt: -1 })
    .populate('influencer', 'displayName avatarUrl');
  // attach creator profile snapshot
  const inflIds = apps.map((a) => a.influencer?._id).filter(Boolean);
  const profiles = await InfluencerProfile.find({ user: { $in: inflIds } })
    .select('user displayName niche audience minBudget maxBudget');
  const byUser = new Map(profiles.map((p) => [String(p.user), p]));
  return apps.map((a) => {
    const o = a.toObject();
    o.creator = byUser.get(String(a.influencer?._id)) || null;
    return o;
  });
}

/** Creator views own applications with campaign info joined. */
export async function listCreatorApplications(influencerId) {
  return CampaignApplication.find({ influencer: influencerId })
    .sort({ createdAt: -1 })
    .populate('campaign', 'title niche budget deliverables applicationDeadline status');
}

/** Brand decides. Accepting does NOT auto-create the agreement — that is a separate, explicit step. */
export async function decideApplication(brandId, applicationId, action, decisionNote) {
  const app = await CampaignApplication.findById(applicationId);
  if (!app) throw notFound('Application not found');
  const campaign = await getCampaignForBrand(brandId, app.campaign); // ownership gate
  const nextStatus = action === 'accept' ? 'accepted' : 'rejected';
  // decide pending only — no flip-flopping accepted applications
  const updated = await CampaignApplication.findOneAndUpdate(
    { _id: applicationId, status: 'pending' },
    { status: nextStatus, decidedAt: new Date(), decisionNote },
    { new: true }
  );
  if (!updated) throw conflict(`Application is not pending (current: ${app.status})`, 'NOT_PENDING');
  void campaign;
  gentNotify(app.influencer, nextStatus === 'accepted' ? 'application_accepted' : 'application_rejected',
    { campaign: app.campaign, application: app._id, actor: brandId },
    nextStatus === 'accepted' ? 'Application accepted 🎉' : 'Application rejected',
    decisionNote ? `Note from the brand: ${decisionNote}` : undefined);
  return updated;
}

/* ---------------- Invitations ---------------- */

export async function inviteInfluencer(brandId, campaignId, data) {
  const campaign = await getCampaignForBrand(brandId, campaignId); // ownership gate
  if (!['published', 'draft', 'paused'].includes(campaign.status)) {
    throw conflict('Campaign is not open for invitations', 'CAMPAIGN_CLOSED');
  }
  const infl = await User.findOne({ _id: data.influencerId, role: 'influencer', status: 'active' });
  if (!infl) throw badRequest('Influencer not found');

  // idempotent re-invite: revive a declined/expired/revoked invite instead of erroring
  const prior = await CampaignInvitation.findOne({ campaign: campaignId, influencer: data.influencerId });
  if (prior) {
    if (prior.status === 'pending') throw conflict('Invitation already pending', 'INVITATION_EXISTS');
    if (prior.status === 'accepted') throw conflict('Influencer already accepted this invitation', 'INVITATION_ACCEPTED');
    prior.set({ status: 'pending', message: data.message, proposedRate: data.proposedRate, respondedAt: undefined, invitedBy: brandId });
    await prior.save();
    gentNotify(data.influencerId, 'invitation_received', { campaign: campaignId, invitation: prior._id, actor: brandId },
      'Invitation received', `You were invited to “${campaign.title}”`);
    return prior;
  }
  const inv = await CampaignInvitation.create({
    campaign: campaignId, influencer: data.influencerId, invitedBy: brandId,
    message: data.message, proposedRate: data.proposedRate
  });
  await Campaign.updateOne({ _id: campaignId }, { $inc: { 'stats.invitationsCount': 1 } });
  gentNotify(data.influencerId, 'invitation_received', { campaign: campaignId, invitation: inv._id, actor: brandId },
    'Invitation received', `You were invited to “${campaign.title}”`);
  return inv;
}

export async function revokeInvitation(brandId, invitationId) {
  const inv = await CampaignInvitation.findOne({ _id: invitationId }).populate('campaign', 'brand');
  if (!inv) throw notFound('Invitation not found');
  if (String(inv.campaign.brand) !== String(brandId)) throw notFound('Invitation not found');
  const updated = await CampaignInvitation.findOneAndUpdate(
    { _id: invitationId, status: 'pending' },
    { status: 'revoked' },
    { new: true }
  );
  if (!updated) throw conflict('Invitation is not pending', 'NOT_PENDING');
  return updated;
}

export async function listCreatorInvitations(influencerId) {
  const items = await CampaignInvitation.find({ influencer: influencerId })
    .sort({ createdAt: -1 })
    .populate('campaign', 'title description niche budget deliverables applicationDeadline status')
    .populate('invitedBy', 'displayName avatarUrl');
  return items;
}

export async function listCampaignInvitations(brandId, campaignId) {
  await getCampaignForBrand(brandId, campaignId);
  return CampaignInvitation.find({ campaign: campaignId }).sort({ createdAt: -1 }).populate('influencer', 'displayName avatarUrl');
}

export async function respondToInvitation(influencerId, invitationId, accept, decisionNote) {
  const nextStatus = accept ? 'accepted' : 'declined';
  const inv = await CampaignInvitation.findOneAndUpdate(
    { _id: invitationId, influencer: influencerId, status: 'pending' },
    { status: nextStatus, respondedAt: new Date() },
    { new: true }
  );
  if (!inv) throw notFound('Pending invitation not found');
  void decisionNote;
  const camp = await Campaign.findById(inv.campaign).select('brand title');
  gentNotify(camp?.brand, nextStatus === 'accepted' ? 'invitation_accepted' : 'invitation_declined',
    { campaign: inv.campaign, invitation: inv._id, actor: influencerId },
    nextStatus === 'accepted' ? 'Invitation accepted' : 'Invitation declined',
    camp ? `For “${camp.title}”` : undefined);
  return inv;
}

/* ---------------- Agreements ---------------- */

/**
 * Initiates (or continues negotiating) the agreement from an accepted
 * application or invitation. Money validated: commission derived server-side,
 * never from the client beyond an optional percent clamp.
 */
export async function initiateAgreement(brandId, data) {
  let campaignId, influencerId;
  if (data.applicationId) {
    const app = await CampaignApplication.findOne({ _id: data.applicationId, status: 'accepted' });
    if (!app) throw notFound('Accepted application not found');
    campaignId = app.campaign;
    influencerId = app.influencer;
  } else {
    const inv = await CampaignInvitation.findOne({ _id: data.invitationId, status: 'accepted' });
    if (!inv) throw notFound('Accepted invitation not found');
    campaignId = inv.campaign;
    influencerId = inv.influencer;
  }
  const campaign = await getCampaignForBrand(brandId, campaignId); // ownership gate
  void campaign;

  const percent = data.commissionPercent ?? PLATFORM_COMMISSION_PERCENT;
  const { commissionAmount, influencerPayout } = computeMoney(data.agreedAmount, percent);

  // one agreement per (campaign, influencer): upsert into negotiating
  const existing = await CampaignAgreement.findOne({ campaign: campaignId, influencer: influencerId });
  if (existing) {
    if (['active', 'delivered', 'payout_pending', 'paid'].includes(existing.status)) {
      throw conflict('Agreement already locked for this creator', 'AGREEMENT_LOCKED');
    }
    existing.set({
      agreedAmount: data.agreedAmount,
      commissionPercent: percent,
      commissionAmount,
      influencerPayout,
      terms: data.terms,
      deliverableDeadline: data.deliverableDeadline
    });
    await existing.save();
    return existing;
  }
  return CampaignAgreement.create({
    campaign: campaignId,
    influencer: influencerId,
    brand: brandId,
    agreedAmount: data.agreedAmount,
    commissionPercent: percent,
    commissionAmount,
    influencerPayout,
    terms: data.terms,
    deliverableDeadline: data.deliverableDeadline
  });
}

/** Influencer accepts the proposed terms → agreement becomes active. */
export async function respondToAgreement(influencerId, agreementId, accept) {
  const nextStatus = accept ? 'active' : undefined;
  if (accept) {
    const a = await CampaignAgreement.findOneAndUpdate(
      { _id: agreementId, influencer: influencerId, status: 'negotiating' },
      { status: 'active' },
      { new: true }
    );
    if (!a) throw notFound('Negotiating agreement not found');
    gentNotify(a.brand, 'campaign_agreed', { campaign: a.campaign, actor: influencerId },
      'Agreement is active', `Creator accepted the terms of ₹${a.agreedAmount?.toLocaleString?.('en-IN') ?? a.agreedAmount} — deliverables can start.`);
    return a;
  }
  // declining while negotiating just deletes the proposal (brand can re-initiate)
  const a = await CampaignAgreement.findOneAndDelete({ _id: agreementId, influencer: influencerId, status: 'negotiating' });
  if (!a) throw notFound('Negotiating agreement not found');
  return { declined: true, id: agreementId };
}

export async function transitionAgreement(actor, agreementId, nextStatus) {
  const allowed = {
    active: ['delivered', 'cancelled'],
    delivered: ['payout_pending'],
    payout_pending: ['paid'],
    cancelled: [],
    paid: []
  };
  const query = { _id: agreementId };
  if (actor.role === 'brand') query.brand = actor.id;
  else throw forbidden('Only the brand advances delivery/payout states during phase 5', 'ROLE_TRANSITION');

  const current = await CampaignAgreement.findOne(query).select('+payoutPaidAt');
  if (!current) throw notFound('Agreement not found');
  // idempotency: once paid is set it is terminal; any repeat 'paid' call is ALREADY_PAID
  if (nextStatus === 'paid' && current.payoutPaidAt) {
    throw conflict('Agreement already paid', 'ALREADY_PAID');
  }
  if (!(allowed[current.status] || []).includes(nextStatus)) {
    throw conflict(`Cannot move agreement from '${current.status}' to '${nextStatus}'`, 'INVALID_TRANSITION');
  }
  if (nextStatus === 'paid') {
    const a = await CampaignAgreement.findOneAndUpdate(
      { _id: agreementId, payoutPaidAt: { $exists: false } },
      { status: nextStatus, payoutPaidAt: new Date() },
      { new: true, select: '+payoutPaidAt' }
    );
    if (a) {
      // simulated ledger rows (idempotent across retries) + creator notification
      const { recorded } = await recordSimulatedPayout(a);
      if (recorded) announcePayout(a);
    }
    return a;
  }
  return CampaignAgreement.findOneAndUpdate(query, { status: nextStatus }, { new: true });
}

export async function listCreatorAgreements(influencerId) {
  return CampaignAgreement.find({ influencer: influencerId }).sort({ createdAt: -1 })
    .populate('campaign', 'title niche');
}

export async function listBrandAgreements(brandId) {
  return CampaignAgreement.find({ brand: brandId }).sort({ createdAt: -1 })
    .populate('campaign', 'title niche');
}

/** Detail view for either party — object-level visibility, foreign agreements are 404. */
export async function getAgreementForParty(actor, agreementId) {
  const q = { _id: agreementId };
  if (actor.role === 'brand') q.brand = actor.id;
  else if (actor.role === 'influencer') q.influencer = actor.id;
  else throw forbidden('Admin agreement views arrive in phase 7');
  const a = await CampaignAgreement.findOne(q)
    .populate('campaign', 'title niche')
    .populate('influencer', 'displayName avatarUrl');
  if (!a) throw notFound('Agreement not found');
  return a;
}
