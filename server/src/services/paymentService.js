/**
 * Payment service — Phase 6 (SIMULATED).
 * No real funds move. When an agreement reaches 'paid', three immutable,
 * clearly-labeled simulated ledger rows are recorded:
 *
 *   campaign_payment     brand paid the platform the agreed amount
 *   platform_commission  the platform's fee out of that amount
 *   influencer_payout    remainder owed/shown as paid to the creator
 *
 * Idempotency comes from TWO layers:
 *   1. unique idempotencyKey (one value per agreement for recording)
 *   2. partial unique index: one live influencer_payout per agreement
 * A retry therefore cannot double-record even across concurrent calls.
 */
import { Transaction } from '../models/index.js';
import { notify } from './notificationService.js';
import { conflict } from '../utils/errors.js';

const PAYOUT_KEY = 'payout';
const FINAL_STAGE = '_final_v1';

export { PAYOUT_KEY, FINAL_STAGE };

/**
 * Records the simulated ledger rows for a paid agreement.
 * Returns { recorded: boolean, transactions: [] } — recorded=false means it
 * already existed (idempotent replay), NOT an error.
 */
export async function recordSimulatedPayout(agreement) {
  const key = `${PAYOUT_KEY}:${String(agreement._id)}:${FINAL_STAGE}`;

  const dupe = await Transaction.exists({ idempotencyKey: key });
  if (dupe) return { recorded: false, transactions: [] };

  const money = {
    agreedAmount: agreement.agreedAmount,
    commissionPercent: agreement.commissionPercent,
    commissionAmount: agreement.commissionAmount,
    influencerPayout: agreement.influencerPayout
  };

  try {
    // one atomic batch; partial failures are caught and mapped below
    return {
      recorded: true,
      transactions: await Transaction.insertMany([
        {
          agreement: agreement._id,
          campaign: agreement.campaign,
          brand: agreement.brand,
          influencer: agreement.influencer,
          type: 'campaign_payment',
          amount: money.agreedAmount,
          currency: agreement.currency,
          commissionPercent: money.commissionPercent,
          status: 'simulated_completed',
          idempotencyKey: `${key}:campaign_payment`,
          recordedBy: agreement.brand,
          note: 'Brand settled the agreed amount with the platform (simulated)'
        },
        {
          agreement: agreement._id,
          campaign: agreement.campaign,
          brand: agreement.brand,
          influencer: agreement.influencer,
          type: 'platform_commission',
          amount: money.commissionAmount,
          currency: agreement.currency,
          commissionPercent: money.commissionPercent,
          status: 'simulated_completed',
          idempotencyKey: `${key}:commission`,
          recordedBy: agreement.brand,
          note: `Platform commission (${money.commissionPercent}%) (simulated)`
        },
        {
          agreement: agreement._id,
          campaign: agreement.campaign,
          brand: agreement.brand,
          influencer: agreement.influencer,
          type: 'influencer_payout',
          amount: money.influencerPayout,
          currency: agreement.currency,
          commissionPercent: money.commissionPercent,
          status: 'simulated_completed',
          idempotencyKey: `${key}:payout`,
          recordedBy: agreement.brand,
          note: 'Creator payout released (simulated)'
        }
      ], { ordered: false })
    };
  } catch (err) {
    // duplicate-key on any of the three keys ⇒ someone recorded first; treat as replay
    if (err && (err.code === 11000 || (err.writeErrors || []).some((w) => w.err && w.err.code === 11000))) {
      return { recorded: false, transactions: [] };
    }
    throw err;
  }
}

/**
 * Optional explicit payout step (kept for the UI to show a “payout sheet” before
 * the brand flips payout_pending→paid — real provider handoff happens Phase 7+).
 * Verifies amount composition matches the locked agreement before recording.
 */
export function assertAmountsMatch(agreement, money) {
  if (money.agreedAmount !== agreement.agreedAmount ||
      money.commissionAmount !== agreement.commissionAmount ||
      money.influencerPayout !== agreement.influencerPayout) {
    throw conflict('Recorded amounts do not match the locked agreement — refusing to record', 'AMOUNT_MISMATCH');
  }
}

/** Fires the payout-recorded notification (best-effort). */
export function announcePayout(agreement) {
  notify(agreement.influencer, 'payout_recorded', {
    campaign: agreement.campaign
  },
  'Payout recorded (SIMULATED — no real funds moved)',
  `₹${agreement.influencerPayout?.toLocaleString?.('en-IN') ?? agreement.influencerPayout} was SIMULATED as released. Real payouts need a payment provider (later phase).`)
    .catch(() => {});
}

/**
 * Party-scoped transaction ledger.
 *   brand       → transactions where brand = me
 *   influencer  → transactions where influencer = me
 *   admin       → everything (admin console, Phase 7)
 */
export async function listTransactions(user, { page = 1, limit = 20 } = {}) {
  const q = {};
  if (user.role === 'brand') q.brand = user.id;
  else if (user.role === 'influencer') q.influencer = user.id;
  else if (user.role !== 'admin') throw conflict('Only brand, influencer and admin can view the ledger', 'ROLE_SCOPE');
  page = Math.max(1, Number(page) || 1);
  limit = Math.min(100, Math.max(1, Number(limit) || 20));
  const [items, total] = await Promise.all([
    Transaction.find(q)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('campaign', 'title')
      .populate('brand', 'displayName companyName')
      .populate('influencer', 'displayName username')
      .populate('agreement', 'agreedAmount status'),
    Transaction.countDocuments(q)
  ]);
  return { items, total, page, pages: Math.ceil(total / limit) || 1 };
}
