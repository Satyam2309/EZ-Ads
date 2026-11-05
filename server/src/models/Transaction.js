import mongoose from 'mongoose';

const { Schema } = mongoose;

export const TRANSACTION_TYPES = ['campaign_payment', 'platform_commission', 'influencer_payout'];
export const TRANSACTION_STATUSES = ['simulated_pending', 'simulated_completed', 'simulated_failed'];

/**
 * Transaction — SIMULATED money ledger. No real funds move; every record is
 * explicitly labeled simulated and the API never claims real transfer.
 *
 * Idempotency: `idempotencyKey` is unique per (agreement, type) so a retried
 * payout request cannot create a second payout row (guards Phase 6 services).
 */
const transactionSchema = new Schema(
  {
    agreement: { type: Schema.Types.ObjectId, ref: 'CampaignAgreement', required: true, index: true },
    campaign: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true },
    brand: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    influencer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    type: { type: String, enum: TRANSACTION_TYPES, required: true },
    amount: { type: Number, min: 0, required: true },
    currency: { type: String, default: 'INR' },

    // negotiation originated amount = agreedAmount; commission generated from it
    commissionPercent: { type: Number, min: 0, max: 100 },

    status: { type: String, enum: TRANSACTION_STATUSES, default: 'simulated_pending', index: true },

    simulatedLabel: { type: String, default: 'SIMULATED — no real money transferred', immutable: true },

    idempotencyKey: { type: String, required: true },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    note: { type: String, maxlength: 500 }
  },
  { timestamps: true }
);

transactionSchema.index({ idempotencyKey: 1 }, { unique: true });
transactionSchema.index({ agreement: 1, type: 1 });
// prevents duplicate payout rows even if the unique key above somehow misses:
// at most one active/completed influencer_payout per agreement (failed records
// are allowed to coexist so a retry can record a fresh attempt).
// NOTE: partial indexes don't support $ne, so allowed statuses are enumerated.
transactionSchema.index(
  { agreement: 1, type: 1 },
  {
    name: 'unique_payout_per_agreement',
    unique: true,
    partialFilterExpression: {
      type: 'influencer_payout',
      status: { $in: ['simulated_pending', 'simulated_completed'] }
    }
  }
);

export default mongoose.model('Transaction', transactionSchema);
