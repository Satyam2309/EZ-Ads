import { InfluencerProfile, User, ConnectedSocialAccount, Shortlist } from '../models/index.js';
import { asyncHandler, badRequest, notFound, forbidden, conflict } from '../utils/errors.js';
import { searchInfluencers } from '../services/discoveryService.js';

/* ---------------- Influencer own-profile ---------------- */

export const getMyProfile = asyncHandler(async (req, res) => {
  let profile = await InfluencerProfile.findOne({ user: req.user._id });
  if (!profile) {
    // every influencer gets a skeleton at OAuth time; self-heal if missing
    profile = await InfluencerProfile.create({
      user: req.user._id,
      displayName: req.user.displayName || req.user.instagram?.username || 'Creator',
      username: req.user.instagram?.username,
      niche: 'unspecified',
      isListed: false
    });
  }
  res.json({ ok: true, data: profile });
});

export const updateMyProfile = asyncHandler(async (req, res) => {
  const updates = req.body; // parsed + stripped by validator middleware
  const disallowed = ['user', 'audience.followersSource', 'audience.engagementSource'];
  if (updates.audience?.followers !== undefined && req.user.instagram?.isMock) {
    // mock accounts may keep self_reported numbers but must not claim meta_api origin
    updates.audience.followersSource = 'self_reported';
  }
  const profile = await InfluencerProfile.findOneAndUpdate(
    { user: req.user._id },
    { $set: updates },
    { new: true, runValidators: true, context: 'query' }
  );
  if (!profile) throw notFound('Profile not found — get /me first');
  res.json({ ok: true, data: profile });
});

/* ---------------- Social accounts ---------------- */

export const listSocialAccounts = asyncHandler(async (req, res) => {
  const items = await ConnectedSocialAccount.find({ user: req.user._id }).sort({ platform: 1 });
  res.json({ ok: true, data: items });
});

export const addSocialAccount = asyncHandler(async (req, res) => {
  const { platform, username, url } = req.body;
  const dup = await ConnectedSocialAccount.findOne({ user: req.user._id, platform, url });
  if (dup) throw conflict('This account is already linked');
  const doc = await ConnectedSocialAccount.create({
    user: req.user._id,
    platform,
    username,
    url,
    status: 'self_reported', // URL format-validated only — NOT independently verified
    connectionMethod: 'manual_url',
    stats: { followersSource: 'self_reported' }
  });
  res.status(201).json({ ok: true, data: doc });
});

export const removeSocialAccount = asyncHandler(async (req, res) => {
  const doc = await ConnectedSocialAccount.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!doc) throw notFound('Account not found');
  res.json({ ok: true, data: { removed: doc._id } });
});

/* ---------------- Discovery (brands) ---------------- */

export const discoverySearch = asyncHandler(async (req, res) => {
  const result = await searchInfluencers(req.query);
  res.json({ ok: true, data: result });
});

export const getPublicProfile = asyncHandler(async (req, res) => {
  // Accept either the profile _id (from discovery cards) or the influencer's
  // User id (what shortlists store) — resolve to the profile either way.
  const { ObjectId } = (await import('mongoose')).default.Types;
  let profile = null;
  if (ObjectId.isValid(req.params.id)) {
    profile = await InfluencerProfile.findOne({ _id: req.params.id, isListed: true });
    if (!profile) profile = await InfluencerProfile.findOne({ user: req.params.id, isListed: true });
  }
  if (!profile) throw notFound('Creator not found');
  const socials = await ConnectedSocialAccount.find({ user: profile.user }).select(
    'platform username url status connectionMethod lastVerifiedAt stats'
  );
  res.json({ ok: true, data: { profile, socialAccounts: socials } });
});

/* ---------------- Shortlists ---------------- */

export const listShortlists = asyncHandler(async (req, res) => {
  const items = await Shortlist.find({ owner: req.user._id }).populate('items.influencer', 'displayName avatarUrl');
  res.json({ ok: true, data: items });
});

export const createShortlist = asyncHandler(async (req, res) => {
  const s = await Shortlist.create({ owner: req.user._id, name: req.body.name });
  res.status(201).json({ ok: true, data: s });
});

export const renameShortlist = asyncHandler(async (req, res) => {
  const s = await Shortlist.findOneAndUpdate(
    { _id: req.params.id, owner: req.user._id },
    { name: req.body.name },
    { new: true, runValidators: true }
  );
  if (!s) throw notFound('Shortlist not found');
  res.json({ ok: true, data: s });
});

export const deleteShortlist = asyncHandler(async (req, res) => {
  const s = await Shortlist.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
  if (!s) throw notFound('Shortlist not found');
  res.json({ ok: true, data: { removed: s._id } });
});

export const addToShortlist = asyncHandler(async (req, res) => {
  const { influencerId, note } = req.body;
  const infl = await User.findOne({ _id: influencerId, role: 'influencer', status: 'active' });
  if (!infl) throw badRequest('Influencer not found');

  // owner-only mutation: findOneAndUpdate on owner+id guarantees object-level check
  const s = await Shortlist.findOneAndUpdate(
    { _id: req.params.id, owner: req.user._id, 'items.influencer': { $ne: influencerId } },
    { $push: { items: { influencer: influencerId, note } } },
    { new: true }
  );
  if (!s) {
    const exists = await Shortlist.findOne({ _id: req.params.id, owner: req.user._id });
    if (!exists) throw notFound('Shortlist not found');
    throw conflict('Creator already in this shortlist');
  }
  res.status(201).json({ ok: true, data: s });
});

export const removeFromShortlist = asyncHandler(async (req, res) => {
  const s = await Shortlist.findOneAndUpdate(
    { _id: req.params.id, owner: req.user._id },
    { $pull: { items: { _id: req.params.itemId } } },
    { new: true }
  );
  if (!s) throw notFound('Shortlist or item not found');
  res.json({ ok: true, data: s });
});

export { asyncHandler };
