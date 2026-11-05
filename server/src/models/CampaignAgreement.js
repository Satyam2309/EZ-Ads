import mongoose from 'mongoose';

const { Schema } = mongoose;

export const AGREEMENT_STATUSES = ['negotiating', 'active', 'delivered', 'payout_pending', 'paid', 'cancelled'];

/**
 * CampaignAgreement — locked commercial terms between brand and influencer
 * once an application is accepted (or invitation accepted).
 *
 * Money invariants (enforced here + service-level validations):
 *  - commissionAmount = round(agreedAmount * commissionPercent/100)
 *  - influencerPayout = agreedAmount - commissionAmount
 *  - one agreement per (campaign, influencer) — unique index
 *  - status may only advance forward (negotiating→active→delivered→payout_pending→paid);
 *    'paid' is terminal and set once (guarded by payoutPaidAt flag in services)
 */
const campaignAgreementSchema = new Schema(
  {
    campaign: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
    influencer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    brand: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    agreedAmount: { type: Number, min: 0, required: true },
    currency: { type: String, default: 'INR' },
    commissionPercent: { type: Number, min: 0, max: 100, required: true },
    commissionAmount: { type: Number, min: 0, required: true },
    influencerPayout: { type: Number, min: 0, required: true },

    terms: { type: String, maxlength: 4000 },
    deliverableDeadline: { type: Date },

    status: { type: String, enum: AGREEMENT_STATUSES, default: 'negotiating', index: true },

    payoutPaidAt: { type: Date, select: false } // idempotency flag for the payout transition
  },
  { timestamps: true }
);

campaignAgreementSchema.index({ campaign: 1, influencer: 1 }, { unique: true });
campaignAgreementSchema.index({ status: 1, deliverableDeadline: 1 });

export default mongoose.model('CampaignAgreement', campaignAgreementSchema);
