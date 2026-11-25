/**
 * Discovery service — brand-side influencer search.
 * All inputs sanitized/coerced here; queries hit the compound indexes built in Phase 2.
 * Both numeric ranges are clamped to sane bounds to avoid absurd queries.
 */
import { InfluencerProfile } from '../models/index.js';
import { AppError } from '../utils/errors.js';

const SORTS = {
  relevance: { score: { $meta: 'textScore' } }, // text-search relevance when q is present
  followers: { 'audience.followers': -1 },
  engagement: { 'audience.engagementRate': -1 },
  price_low: { minBudget: 1 },
  price_high: { minBudget: -1 }
};

function num(v, { min = 0, max = 1_000_000_000, def } = {}) {
  if (v === undefined || v === null || v === '') return def;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new AppError('Invalid numeric filter', 400, 'VALIDATION_ERROR');
  return Math.min(Math.max(n, min), max);
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildDiscoveryQuery(params) {
  const {
    q, niche, platform, city, country, location, verifiedOnly,
    minFollowers, maxFollowers, minEngagement, minBudget, maxBudget, availability, sort
  } = params;

  const query = { isListed: true };
  const andClauses = [];

  if (niche) query.niche = String(niche).toLowerCase().trim();
  if (availability) query.availability = availability;
  if (verifiedOnly === 'true' || verifiedOnly === true) {
    query['audience.followersSource'] = 'meta_api';
  }
  if (country) query['location.country'] = new RegExp(`^${escapeRegex(String(country).trim())}`, 'i');
  if (city) query['location.city'] = new RegExp(`^${escapeRegex(String(city).trim())}`, 'i');
  if (location && String(location).trim()) {
    const locRx = new RegExp(escapeRegex(String(location).trim()), 'i');
    andClauses.push({ $or: [{ 'location.city': locRx }, { 'location.country': locRx }] });
  }

  // followers range
  const followerCond = {};
  const minF = num(minFollowers, { def: undefined });
  const maxF = num(maxFollowers, { def: undefined });
  if (minF !== undefined) followerCond.$gte = minF;
  if (maxF !== undefined) followerCond.$lte = maxF;
  if (Object.keys(followerCond).length) query['audience.followers'] = followerCond;

  const minE = num(minEngagement, { min: 0, max: 100, def: undefined });
  if (minE !== undefined) query['audience.engagementRate'] = { $gte: minE };

  // budget: influencer's minBudget <= our maxBudget AND maxBudget >= our minBudget (overlap)
  const minB = num(minBudget, { def: undefined });
  const maxB = num(maxBudget, { def: undefined });
  if (maxB !== undefined) query.minBudget = { ...(query.minBudget || {}), $lte: maxB };
  if (minB !== undefined) {
    andClauses.push({ $or: [{ maxBudget: { $gte: minB } }, { maxBudget: 0 }] });
  }

  if (q && String(q).trim()) {
    const cleanQ = String(q).trim().slice(0, 120);
    if (sort === 'relevance') {
      query.$text = { $search: cleanQ };
    } else {
      const rx = new RegExp(escapeRegex(cleanQ), 'i');
      andClauses.push({
        $or: [
          { displayName: rx },
          { username: rx },
          { niche: rx },
          { bio: rx },
          { 'location.city': rx },
          { 'location.country': rx }
        ]
      });
    }
  }

  if (andClauses.length) query.$and = andClauses;
  void platform;

  return query;
}

export async function searchInfluencers(params) {
  const page = Math.max(1, num(params.page, { min: 1, max: 10000, def: 1 }));
  const limit = Math.min(50, Math.max(1, num(params.limit, { min: 1, max: 50, def: 12 })));
  let sortKey = params.sort && SORTS[params.sort] ? params.sort : 'followers';
  // text-relevance sorting requires a $text query to exist; fall back otherwise
  if (sortKey === 'relevance' && !params.q) sortKey = 'followers';

  const query = buildDiscoveryQuery({ ...params, sort: sortKey });

  const [items, total] = await Promise.all([
    InfluencerProfile.find(query)
      .sort(SORTS[sortKey])
      .skip((page - 1) * limit)
      .limit(limit)
      .select('displayName username niche bio location audience rates minBudget maxBudget availability portfolio instagramInsights.profilePicture user')
      .populate('user', 'avatarUrl instagram.username instagram.accountType instagram.providerId instagram.connectedAt'),
    InfluencerProfile.countDocuments(query)
  ]);

  return {
    items,
    total,
    page,
    pages: Math.ceil(total / limit) || 1
  };
}

/** Public profile projection — privacy- and honesty-conscious field whitelist. */
export function publicProfileProjection() {
  return {
    displayName: 1, username: 1, niche: 1, contentCategories: 1, bio: 1, languages: 1,
    location: 1, audience: 1, rates: 1, minBudget: 1, maxBudget: 1, portfolio: 1,
    otherProfiles: 1, availability: 1, completionStep: 1,
    createdAt: 1
  };
}
