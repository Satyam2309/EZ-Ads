/**
 * Admin service — Phase 7.
 * Every function here trusts that the caller is an authenticated admin (routes
 * gate with requireRole('admin')). Sensitive mutations write append-only audit
 * entries; admin accounts can never be suspended through these endpoints.
 */
import {
  User, Campaign, CampaignAgreement, CampaignApplication, CampaignInvitation,
  Report, Transaction, AuditLog, Conversation, Message, InfluencerProfile, BrandProfile
} from '../models/index.js';
import { notFound, badRequest, forbidden } from '../utils/errors.js';
import { REPORT_STATUSES } from '../models/Report.js';

function escapeRegex(q) {
  return q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function paginate({ page = 1, limit = 20 } = {}, max = 100) {
  page = Math.max(1, Number(page) || 1);
  limit = Math.min(max, Math.max(1, Number(limit) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

/* ---------------- Stats ---------------- */

export async function getPlatformStats() {
  const [usersByRole, usersByStatus, campaignsByStatus, appsByStatus, invitesByStatus, agreementsByStatus, reportsByStatus, txByType, conversations, messages] =
    await Promise.all([
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      User.aggregate([{ $match: { status: { $ne: 'active' } } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Campaign.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      CampaignApplication.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      CampaignInvitation.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      CampaignAgreement.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Report.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Transaction.aggregate([{ $group: { _id: '$type', count: { $sum: 1 }, amount: { $sum: '$amount' } } }]),
      Conversation.countDocuments({}),
      Message.countDocuments({})
    ]);

  const toMap = (rows) => Object.fromEntries(rows.map((r) => [r._id, r.count ?? r.amount]));
  const txMap = Object.fromEntries(txByType.map((r) => [r._id, { count: r.count, amount: r.amount }]));

  return {
    users: {
      total: usersByRole.reduce((s, r) => s + r.count, 0),
      byRole: toMap(usersByRole),
      byNonActiveStatus: toMap(usersByStatus)
    },
    campaigns: { total: campaignsByStatus.reduce((s, r) => s + r.count, 0), byStatus: toMap(campaignsByStatus) },
    applications: { byStatus: toMap(appsByStatus) },
    invitations: { byStatus: toMap(invitesByStatus) },
    agreements: { byStatus: toMap(agreementsByStatus) },
    reports: { byStatus: toMap(reportsByStatus) },
    // every transaction row is SIMULATED — the label lives on the model itself
    simulatedLedger: {
      byType: txMap,
      totalSimulatedVolume: txByType.reduce((s, r) => s + r.amount, 0)
    },
    chat: { conversations, messages }
  };
}

/* ---------------- Users ---------------- */

export async function listUsers({ role, status, q, page, limit } = {}) {
  const qd = paginate({ page, limit });
  const filter = {};
  if (role && User.schema.path('role').enumValues.includes(role)) filter.role = role;
  else if (role) throw badRequest('Unknown role filter');
  if (status && User.schema.path('status').enumValues.includes(status)) filter.status = status;
  else if (status) throw badRequest('Unknown status filter');
  if (q && q.trim()) {
    const rx = new RegExp(escapeRegex(q.trim()), 'i');
    filter.$or = [{ email: rx }, { displayName: rx }, { 'instagram.username': rx }];
  }

  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(qd.skip).limit(qd.limit),
    User.countDocuments(filter)
  ]);

  // lightweight profile hints for the table
  const ids = items.map((u) => u._id);
  const [profiles, brands] = await Promise.all([
    InfluencerProfile.find({ user: { $in: ids } }).select('user niche audience'),
    BrandProfile.find({ user: { $in: ids } }).select('user companyName')
  ]);
  const byUser = (rows) => new Map(rows.map((r) => [String(r.user), r]));
  const inflBy = byUser(profiles);
  const brandBy = byUser(brands);

  return {
    items: items.map((u) => ({
      ...u.toJSON(),
      niche: inflBy.get(String(u._id))?.niche,
      followers: inflBy.get(String(u._id))?.audience?.followers,
      companyName: brandBy.get(String(u._id))?.companyName
    })),
    total,
    page: qd.page,
    pages: Math.ceil(total / qd.limit) || 1
  };
}

const SETTABLE_STATUS = ['active', 'suspended'];

export async function setUserStatus(adminId, userId, status, req = {}) {
  if (!SETTABLE_STATUS.includes(status)) throw badRequest('status must be active or suspended');
  const user = await User.findById(userId);
  if (!user) throw notFound('User not found');
  if (user.role === 'admin') throw forbidden('Admin accounts cannot be modified through this endpoint');
  if (user.status === status) return user; // idempotent no-op

  user.status = status;
  await user.save();

  await AuditLog.create({
    actor: adminId,
    action: status === 'suspended' ? 'admin.user.suspend' : 'admin.user.reinstate',
    targetType: 'user',
    targetId: user._id,
    meta: { role: user.role, email: user.email },
    ip: req.ip,
    userAgent: (req.headers?.['user-agent'] || '').slice(0, 300)
  });
  return user;
}

export async function getUserDetail(adminId, userId) {
  const user = await User.findById(userId);
  if (!user) throw notFound('User not found');
  const [profile, brand, audits] = await Promise.all([
    InfluencerProfile.findOne({ user: user._id }),
    BrandProfile.findOne({ user: user._id }),
    user.role === 'admin' ? Promise.resolve([]) : AuditLog.find({ $or: [{ actor: user._id }, { targetId: user._id }] }).sort({ createdAt: -1 }).limit(20)
  ]);
  return { user, profile, brand, audits };
}

/* ---------------- Reports (disputes) ---------------- */

const REPORT_TRANSITIONS = {
  open: ['reviewing', 'resolved_no_action', 'resolved_action_taken', 'dismissed'],
  reviewing: ['resolved_no_action', 'resolved_action_taken', 'dismissed'],
  resolved_no_action: [],
  resolved_action_taken: [],
  dismissed: []
};

export async function listReports({ status, page, limit } = {}) {
  const qd = paginate({ page, limit });
  const filter = {};
  if (status && REPORT_STATUSES.includes(status)) filter.status = status;
  else if (status) throw badRequest('Unknown report status filter');

  const [items, total] = await Promise.all([
    Report.find(filter).sort({ createdAt: 1 }).skip(qd.skip).limit(qd.limit)
      .populate('reporter', 'role displayName email instagram.username status')
      .populate('handledBy', 'displayName'),
    Report.countDocuments(filter)
  ]);

  // resolve subject summaries so the admin can see WHAT was reported
  const campaigns = await Campaign.find({ _id: { $in: items.filter((r) => r.subjectType === 'campaign').map((r) => r.subjectId) } }).select('title status');
  const profiles = await InfluencerProfile.find({ _id: { $in: items.filter((r) => r.subjectType === 'influencer_profile').map((r) => r.subjectId) } }).select('displayName user');
  const users = await User.find({ _id: { $in: items.filter((r) => r.subjectType === 'user').map((r) => r.subjectId) } }).select('role displayName email status');
  const cMap = new Map(campaigns.map((c) => [String(c._id), c]));
  const pMap = new Map(profiles.map((p) => [String(p._id), p]));
  const uMap = new Map(users.map((u) => [String(u._id), u]));

  return {
    items: items.map((r) => ({
      ...r.toJSON(),
      subject: r.subjectType === 'campaign'
        ? { kind: 'campaign', id: r.subjectId, title: cMap.get(String(r.subjectId))?.title, status: cMap.get(String(r.subjectId))?.status }
        : r.subjectType === 'influencer_profile'
          ? { kind: 'influencer_profile', id: r.subjectId, displayName: pMap.get(String(r.subjectId))?.displayName, user: pMap.get(String(r.subjectId))?.user }
          : { kind: 'user', id: r.subjectId, displayName: uMap.get(String(r.subjectId))?.displayName, role: uMap.get(String(r.subjectId))?.role, status: uMap.get(String(r.subjectId))?.status }
    })),
    total,
    page: qd.page,
    pages: Math.ceil(total / qd.limit) || 1
  };
}

export async function updateReport(adminId, reportId, { status, resolutionNote }, req = {}) {
  const report = await Report.findById(reportId);
  if (!report) throw notFound('Report not found');
  const from = report.status;
  if (report.status === status) throw badRequest('Report is already in that status');
  if (!REPORT_TRANSITIONS[report.status].includes(status)) {
    throw badRequest(`Cannot move report from ${report.status} to ${status}`, 'INVALID_TRANSITION');
  }

  report.status = status;
  report.handledBy = adminId;
  report.handledAt = new Date();
  if (resolutionNote) report.resolutionNote = resolutionNote;
  await report.save();

  await AuditLog.create({
    actor: adminId,
    action: 'admin.report.update',
    targetType: 'report',
    targetId: report._id,
    meta: { from, to: status, resolutionNote: resolutionNote || report.resolutionNote || null },
    ip: req.ip,
    userAgent: (req.headers?.['user-agent'] || '').slice(0, 300)
  });
  return report;
}

/* ---------------- Simulated ledger (read-only) ---------------- */

export async function listAllTransactions({ page, limit } = {}) {
  const qd = paginate({ page, limit });
  const [items, total] = await Promise.all([
    Transaction.find({}).sort({ createdAt: -1 }).skip(qd.skip).limit(qd.limit)
      .populate('campaign', 'title')
      .populate('brand', 'displayName email')
      .populate('influencer', 'displayName instagram.username')
      .populate('agreement', 'agreedAmount status'),
    Transaction.countDocuments({})
  ]);
  return { items, total, page: qd.page, pages: Math.ceil(total / qd.limit) || 1 };
}

/* ---------------- Audit log (read-only) ---------------- */

export async function listAuditLogs({ action, actorId, targetType, page, limit } = {}) {
  const qd = paginate({ page, limit });
  const filter = {};
  if (action) filter.action = { $regex: `^${escapeRegex(action)}` }; // prefix match: 'admin.' lists all admin actions
  if (actorId) filter.actor = actorId;
  if (targetType) filter.targetType = targetType;

  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(qd.skip).limit(qd.limit)
      .populate('actor', 'role displayName email'),
    AuditLog.countDocuments(filter)
  ]);
  return { items, total, page: qd.page, pages: Math.ceil(total / qd.limit) || 1 };
}
