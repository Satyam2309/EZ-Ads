import mongoose from 'mongoose';

const { Schema } = mongoose;

export const NOTIFICATION_TYPES = [
  'invitation_received',
  'invitation_accepted',
  'invitation_declined',
  'application_received',
  'application_accepted',
  'application_rejected',
  'campaign_agreed',
  'message_received',
  'campaign_status_changed',
  'payout_recorded'
];

/**
 * Notification — one user's news feed entry. Emitted by services when
 * invitations/applications/agreements change; consumed by the SPA via REST
 * (Phase 6 adds Socket.IO push).
 */
const notificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    type: { type: String, enum: NOTIFICATION_TYPES, required: true },

    // light-weight context: which documents this is about
    refs: {
      campaign: { type: Schema.Types.ObjectId, ref: 'Campaign' },
      application: { type: Schema.Types.ObjectId, ref: 'CampaignApplication' },
      invitation: { type: Schema.Types.ObjectId, ref: 'CampaignInvitation' },
      conversation: { type: Schema.Types.ObjectId, ref: 'Conversation' },
      actor: { type: Schema.Types.ObjectId, ref: 'User' } // who triggered it
    },

    title: { type: String, required: true, maxlength: 120 },
    body: { type: String, maxlength: 500 },

    readAt: { type: Date }
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, readAt: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
