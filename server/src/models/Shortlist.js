import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Shortlist — a brand's named list of creators.
 * Every write validates membership on `owner` server-side; one brand never
 * touches another's shortlists (object-level ownership check in controllers).
 */
const shortlistSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, trim: true, maxlength: 80, required: true },

    items: [
      {
        influencer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        addedAt: { type: Date, default: Date.now },
        note: { type: String, maxlength: 500 }
      }
    ]
  },
  { timestamps: true }
);

shortlistSchema.index({ owner: 1, name: 1 });
// no duplicate creator inside one list
shortlistSchema.index({ owner: 1, 'items.influencer': 1 });

export default mongoose.model('Shortlist', shortlistSchema);
