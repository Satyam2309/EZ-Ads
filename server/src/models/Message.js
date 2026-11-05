import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Message — a chat message inside a Conversation.
 * Persisted in MongoDB; read state tracked per reader.
 */
const messageSchema = new Schema(
  {
    conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    body: { type: String, trim: true, maxlength: 4000, required: true },

    readAt: { type: Date } // null = unread (single-thread DMs → one timestamp suffices)
  },
  { timestamps: true }
);

messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1, readAt: 1 });

export default mongoose.model('Message', messageSchema);
