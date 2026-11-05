/**
 * Chat service — Phase 6.
 * Owns: conversation creation rules, participant authorization, message
 * persistence, read state, conversation-list previews.
 *
 * Authorization model: every conversation has exactly two participants (the
 * brand user and the influencer user). A user may only see/join/send in
 * conversations they are a participant of — all queries are participant-scoped,
 * so foreign or non-existent ids yield the same 'not found'.
 *
 * Who may open a conversation about a campaign:
 *   - the campaign's owning brand, or
 *   - an influencer with any accepted/pending application, invitation, or
 *     an agreement on that campaign (i.e. there is a real business reason to talk).
 */
import { Conversation, Message, Campaign, CampaignApplication, CampaignInvitation, CampaignAgreement, User } from '../models/index.js';
import { badRequest, notFound } from '../utils/errors.js';
import { notify } from './notificationService.js';

const PREVIEW_LEN = 140;

/** Deterministic participant ordering so the unique index matches regardless of who opens first. */
function sortedPair(a, b) {
  return [String(a), String(b)].sort();
}

/** The conversation's other participant (userId as String). */
export function otherParticipantId(conversation, userId) {
  return conversation.participants.map((p) => String(p._id || p)).find((id) => id !== String(userId));
}

/** Participant check used by both REST and the Socket.IO layer. */
export async function canAccessConversation(userId, conversationId) {
  const conv = await Conversation.findOne({
    _id: conversationId,
    participants: userId
  });
  return conv || null;
}

/**
 * Finds or creates the (campaign, brand, influencer) conversation for the actor.
 * The actor must be the brand owner or an involved influencer (see header).
 */
export async function ensureConversation(userId, campaignId) {
  const campaign = await Campaign.findById(campaignId);
  if (!campaign) throw notFound('Campaign not found');
  const uid = String(userId);
  const brandId = String(campaign.brand);

  let influencerId = null;
  if (uid === brandId) {
    // brand picks the partner explicitly (body.influencerId validated by route)
    influencerId = arguments[2];
    if (!influencerId) throw badRequest('influencerId is required when the brand opens a chat');
    const involved = await Promise.all([
      CampaignApplication.exists({ campaign: campaignId, influencer: influencerId }),
      CampaignInvitation.exists({ campaign: campaignId, influencer: influencerId }),
      CampaignAgreement.exists({ campaign: campaignId, influencer: influencerId })
    ]);
    if (!involved.some(Boolean)) throw notFound('That creator has no application, invitation or agreement for this campaign');
  } else {
    // influencer: must be involved in this campaign at all
    const [app, inv, agr] = await Promise.all([
      CampaignApplication.exists({ campaign: campaignId, influencer: uid }),
      CampaignInvitation.exists({ campaign: campaignId, influencer: uid }),
      CampaignAgreement.exists({ campaign: campaignId, influencer: uid })
    ]);
    if (!app && !inv && !agr) throw notFound('You have no relationship with this campaign yet — apply or get invited first');
    influencerId = uid; // brand is the other side
  }

  const participants = sortedPair(brandId, influencerId);
  const existing = await Conversation.findOne({ campaign: campaignId, participants });
  if (existing) return existing;
  return Conversation.create({
    campaign: campaignId,
    participants, // stored sorted; both members find themselves via $in lookup
    lastMessageAt: null
  });
}

/** Inbox list: conversations the user belongs to, with the other party + campaign joined. */
export async function listConversations(userId) {
  const convs = await Conversation.find({ participants: userId })
    .sort({ lastMessageAt: -1, createdAt: -1 })
    .populate('participants', 'displayName role avatarUrl')
    .populate('campaign', 'title');
  return convs.map((c) => {
    const other = (c.participants || []).find((p) => String(p._id) !== String(userId)) || null;
    return {
      _id: c._id,
      campaign: c.campaign,
      other,
      lastMessageAt: c.lastMessageAt,
      lastMessagePreview: c.lastMessagePreview,
      createdAt: c.createdAt
    };
  });
}

/** Participant-scoped message history (ascending). Cursor: before=ISO date. */
export async function listMessages(userId, conversationId, { before, limit = 50 } = {}) {
  const conv = await canAccessConversation(userId, conversationId);
  if (!conv) throw notFound('Conversation not found');
  const q = { conversation: conversationId };
  if (before) {
    const d = new Date(before);
    if (Number.isNaN(d.getTime())) throw badRequest('Invalid cursor');
    q.createdAt = { $lt: d };
  }
  const n = Math.min(100, Math.max(1, Number(limit) || 50));
  // fetch newest n, then flip to ascending for display
  const items = await Message.find(q).sort({ createdAt: -1 }).limit(n).populate('sender', 'displayName role');
  return items.reverse();
}

/** Persists a message, refreshes the conversation preview, notifies the other party. */
export async function sendMessage(userId, conversationId, body) {
  const conv = await canAccessConversation(userId, conversationId);
  if (!conv) throw notFound('Conversation not found');
  const text = String(body || '').trim();
  if (!text) throw badRequest('Message body is required');
  if (text.length > 4000) throw badRequest('Message too long (max 4000)');

  const msg = await Message.create({ conversation: conversationId, sender: userId, body: text });

  await Conversation.updateOne(
    { _id: conversationId },
    { $set: { lastMessageAt: msg.createdAt, lastMessagePreview: text.slice(0, PREVIEW_LEN) } }
  );

  if (conv.lastMessageAt === null) await conv.updateOne({ $set: { lastMessageAt: msg.createdAt } });

  const otherId = otherParticipantId(conv, userId);
  notify(otherId, 'message_received', {
    conversation: conversationId,
    campaign: conv.campaign,
    actor: userId
  }, 'New message', text.slice(0, 120)).catch(() => {}); // best-effort; chat must not fail on notification slippage

  return msg.populate('sender', 'displayName role');
}

/** Marks the other party's messages read for this user. */
export async function markConversationRead(userId, conversationId) {
  const conv = await canAccessConversation(userId, conversationId);
  if (!conv) throw notFound('Conversation not found');
  const res = await Message.updateMany(
    { conversation: conversationId, sender: { $ne: userId }, readAt: null },
    { $set: { readAt: new Date() } }
  );
  return { updated: res.modifiedCount || 0 };
}

/** Unread count across all of the user's conversations (for the navbar badge). */
export async function unreadMessageCount(userId) {
  const convs = await Conversation.find({ participants: userId }).select('_id');
  if (convs.length === 0) return 0;
  return Message.countDocuments({
    conversation: { $in: convs.map((c) => c._id) },
    sender: { $ne: userId },
    readAt: null
  });
}

export { User };
