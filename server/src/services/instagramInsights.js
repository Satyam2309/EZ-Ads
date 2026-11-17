/**
 * Instagram Insights Service — fetches real data from Meta Graph API
 * and stores it on InfluencerProfile.instagramInsights.
 *
 * Required token scope: instagram_business_basic, instagram_business_insights
 * The access token is stored encrypted on User.instagram.accessTokenEnc.
 */
import { User, InfluencerProfile } from '../models/index.js';
import { AppError } from '../utils/errors.js';
import { decryptSecret } from './instagramOAuth.js';

const GRAPH = 'https://graph.facebook.com/v23.0';

async function graphGet(path, params, token) {
  const url = new URL(`${GRAPH}/${path}`);
  Object.entries({ ...params, access_token: token }).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.message || `Graph API error ${res.status}`;
    throw new AppError(msg, 502, 'GRAPH_API_ERROR');
  }
  return json;
}

export async function fetchAndStoreInsights(userId) {
  const user = await User.findById(userId).select('+instagram.accessTokenEnc +instagram.tokenExpiresAt');
  if (!user?.instagram?.accessTokenEnc) throw new AppError('Instagram not connected', 400, 'NOT_CONNECTED');
  if (!user.instagram.providerId) throw new AppError('No Instagram account linked', 400, 'NOT_CONNECTED');

  const token = decryptSecret(user.instagram.accessTokenEnc);
  const igId = user.instagram.providerId;

  // ---- 1. Basic profile ----
  let profile = {};
  try {
    profile = await graphGet(igId, {
      fields: 'followers_count,media_count,biography,website,profile_picture_url,username,name,account_type'
    }, token);
  } catch (e) {
    console.warn('[insights] profile fetch failed:', e.message);
  }

  // ---- 2. Media engagement (last 20 posts) ----
  let engagementRate = 0, avgLikes = 0, avgComments = 0;
  try {
    const media = await graphGet(`${igId}/media`, {
      fields: 'like_count,comments_count,timestamp,media_type',
      limit: 20
    }, token);
    if (media?.data?.length) {
      const posts = media.data;
      const totalLikes = posts.reduce((s, p) => s + (p.like_count || 0), 0);
      const totalComments = posts.reduce((s, p) => s + (p.comments_count || 0), 0);
      avgLikes = Math.round(totalLikes / posts.length);
      avgComments = Math.round(totalComments / posts.length);
      const followers = profile.followers_count || 1;
      engagementRate = parseFloat((((totalLikes + totalComments) / posts.length / followers) * 100).toFixed(2));
    }
  } catch (e) { console.warn('[insights] media fetch failed:', e.message); }

  // ---- 3. Account-level insights (daily, last 30 days) ----
  const since = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
  const until = Math.floor(Date.now() / 1000);
  let totalReach = 0, totalImpressions = 0, profileViews = 0, websiteTaps = 0, newFollows = 0;
  let reachTrend = [], impressionsTrend = [], followersTrend = [];

  try {
    const insightsRes = await graphGet(`${igId}/insights`, {
      metric: 'reach,impressions,profile_views,website_clicks,follower_count',
      period: 'day',
      since: String(since),
      until: String(until)
    }, token);
    for (const metric of insightsRes?.data || []) {
      const vals = metric.values || [];
      if (metric.name === 'reach') {
        totalReach = vals.reduce((s, v) => s + (v.value || 0), 0);
        reachTrend = vals.map(v => ({ date: v.end_time?.slice(0, 10), value: v.value || 0 }));
      }
      if (metric.name === 'impressions') {
        totalImpressions = vals.reduce((s, v) => s + (v.value || 0), 0);
        impressionsTrend = vals.map(v => ({ date: v.end_time?.slice(0, 10), value: v.value || 0 }));
      }
      if (metric.name === 'profile_views') profileViews = vals.reduce((s, v) => s + (v.value || 0), 0);
      if (metric.name === 'website_clicks') websiteTaps = vals.reduce((s, v) => s + (v.value || 0), 0);
      if (metric.name === 'follower_count') {
        newFollows = vals.reduce((s, v) => s + (v.value || 0), 0);
        followersTrend = vals.map(v => ({ date: v.end_time?.slice(0, 10), value: v.value || 0 }));
      }
    }
  } catch (e) { console.warn('[insights] account insights failed:', e.message); }

  // ---- 4. Audience demographics (lifetime) ----
  let audienceCountry = [], audienceAge = [], audienceGender = null;
  try {
    const audienceRes = await graphGet(`${igId}/insights`, {
      metric: 'audience_country,audience_age,audience_gender',
      period: 'lifetime'
    }, token);
    for (const metric of audienceRes?.data || []) {
      const vals = metric.values?.[0]?.value || {};
      const total = Object.values(vals).reduce((s, v) => s + v, 0) || 1;
      if (metric.name === 'audience_country') {
        audienceCountry = Object.entries(vals)
          .sort((a, b) => b[1] - a[1]).slice(0, 6)
          .map(([country, count]) => ({ country, pct: parseFloat(((count / total) * 100).toFixed(1)) }));
      }
      if (metric.name === 'audience_age') {
        audienceAge = Object.entries(vals)
          .map(([range, count]) => ({ range, pct: parseFloat(((count / total) * 100).toFixed(1)) }));
      }
      if (metric.name === 'audience_gender') {
        audienceGender = {
          M: parseFloat((((vals.M || 0) / total) * 100).toFixed(1)),
          F: parseFloat((((vals.F || 0) / total) * 100).toFixed(1)),
          U: parseFloat((((vals.U || 0) / total) * 100).toFixed(1))
        };
      }
    }
  } catch (e) { console.warn('[insights] audience demographics failed:', e.message); }

  // ---- 5. Persist to DB ----
  const avgReach = reachTrend.length ? Math.round(totalReach / reachTrend.length) : 0;
  const avgImpressions = impressionsTrend.length ? Math.round(totalImpressions / impressionsTrend.length) : 0;

  await InfluencerProfile.findOneAndUpdate(
    { user: userId },
    {
      $set: {
        'audience.followers': profile.followers_count || 0,
        'audience.followersSource': 'meta_api',
        'audience.followersSyncedAt': new Date(),
        'audience.engagementRate': engagementRate,
        'audience.engagementSource': 'meta_api',
        instagramInsights: {
          followersCount: profile.followers_count || 0,
          mediaCount: profile.media_count || 0,
          engagementRate,
          avgLikes,
          avgComments,
          totalReach,
          avgReach,
          totalImpressions,
          avgImpressions,
          profileViews,
          websiteTaps,
          newFollows,
          reachTrend,
          impressionsTrend,
          followersTrend,
          audienceCountry,
          audienceAge,
          audienceGender,
          profilePicture: profile.profile_picture_url || null,
          biography: profile.biography || null,
          website: profile.website || null,
          syncedAt: new Date()
        }
      }
    },
    { upsert: true }
  );

  return { success: true };
}

export async function getInsights(userId) {
  const profile = await InfluencerProfile.findOne({ user: userId }).select('instagramInsights');
  return profile?.instagramInsights || null;
}
