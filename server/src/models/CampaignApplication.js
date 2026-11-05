import mongoose from 'mongoose';

const { Schema } = mongoose;

export const APPLICATION_STATUSES = ['pending', 'accepted', 'rejected', 'withdrawn'];

/**
 * CampaignApplication — an influencer applying to a published campaign.
 * A user has at most one active application per campaign (unique index).
 */
const campaignApplicationSchema = new Schema(
  {
    campaign: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
    influencer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    proposedRate: { type: Number, min: 0, required: true },
    currency: { type: String, default: 'INR' },
    message: { type: String, maxlength: 2000 },

    // influencer-submitted work links attached to the application itself
    deliverableLinks: [{ type: String }],

    status: { type: String, enum: APPLICATION_STATUSES, default: 'pending', index: true },
    decidedAt: { type: Date },
    decisionNote: { type: String, maxlength: 1000 }
  },
  { timestamps: true }
);

campaignApplicationSchema.index({ campaign: 1, influencer: 1 }, { unique: true });
campaignApplicationSchema.index({ influencer: 1, status: 1 });

export default mongoose.model('CampaignApplication', campaignApplicationSchema);
