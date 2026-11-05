import mongoose from 'mongoose';

const { Schema } = mongoose;

export const INVITATION_STATUSES = ['pending', 'accepted', 'declined', 'revoked', 'expired'];

/**
 * CampaignInvitation — a brand inviting an influencer to a campaign.
 * partialFilterExpression: at most one ACTIVE invitation per (campaign, influencer);
 * past declined/expired invitations do not block a fresh invite.
 * Requires a MongoDB replica set (Transactionsafe in Phase 5); unique index also
 * enforces the invariant on standalone mongod.
 */
const campaignInvitationSchema = new Schema(
  {
    campaign: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
    influencer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    message: { type: String, maxlength: 2000 },
    proposedRate: { type: Number, min: 0 },

    status: { type: String, enum: INVITATION_STATUSES, default: 'pending', index: true },
    respondedAt: { type: Date }
  },
  { timestamps: true }
);

campaignInvitationSchema.index(
  { campaign: 1, influencer: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } }
);
campaignInvitationSchema.index({ influencer: 1, status: 1, createdAt: -1 });

export default mongoose.model('CampaignInvitation', campaignInvitationSchema);
