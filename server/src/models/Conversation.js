import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Conversation — one per (campaign, brand user, influencer user).
 * Chat messages live only inside these conversations; Socket.IO room
 * authorization reads the `participants` array server-side on every join.
 */
const conversationSchema = new Schema(
  {
    campaign: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },

    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
      }
    ],

    lastMessageAt: { type: Date, index: true },
    lastMessagePreview: { type: String, maxlength: 140 }
  },
  { timestamps: true }
);

// unique conversation per campaign+pair of participants
conversationSchema.index(
  { campaign: 1, participants: 1 },
  { unique: true }
);
conversationSchema.index({ participants: 1, lastMessageAt: -1 });

export default mongoose.model('Conversation', conversationSchema);
