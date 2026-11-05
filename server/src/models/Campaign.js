import mongoose from 'mongoose';

const { Schema } = mongoose;

export const CAMPAIGN_STATUSES = ['draft', 'published', 'paused', 'archived', 'completed'];
export const DELIVERABLE_FORMATS = ['post', 'reel', 'story', 'video', 'custom'];

const deliverableSchema = new Schema(
  {
    format: { type: String, enum: DELIVERABLE_FORMATS, required: true },
    quantity: { type: Number, min: 1, default: 1 },
    description: { type: String, maxlength: 500 }
  },
  { _id: false }
);

/**
 * Campaign — a brand's promotion campaign.
 * State transitions (draft → published ⇄ paused → archived/completed)
 * are enforced in controllers, not here; the enum sets the valid set.
 * Only the owning brand manages it; admins can moderate.
 */
const campaignSchema = new Schema(
  {
    brand: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    title: { type: String, trim: true, maxlength: 120, required: true },
    description: { type: String, maxlength: 4000, required: true },
    productInfo: { type: String, maxlength: 2000 },

    objective: { type: String, trim: true, maxlength: 200 },
    targetAudience: {
      ageRange: { type: String, trim: true, maxlength: 20 },
      gender: { type: String, enum: ['any', 'male', 'female'], default: 'any' },
      interests: [{ type: String, trim: true, maxlength: 40 }],
      locations: [{ type: String, trim: true, maxlength: 80 }]
    },

    niche: { type: String, trim: true, lowercase: true, maxlength: 60, index: true },
    requiredPlatforms: [{ type: String, lowercase: true, trim: true }],

    budget: {
      total: { type: Number, min: 0, required: true },
      currency: { type: String, default: 'INR' }
    },
    deliverables: { type: [deliverableSchema], default: [] },

    applicationDeadline: { type: Date },
    startDate: { type: Date },
    endDate: { type: Date },

    status: { type: String, enum: CAMPAIGN_STATUSES, default: 'draft', index: true },

    // denormalized counters maintained by services (updated atomically)
    stats: {
      applicationsCount: { type: Number, default: 0 },
      invitationsCount: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);

campaignSchema.index({ brand: 1, status: 1, createdAt: -1 });
campaignSchema.index({ status: 1, niche: 1, 'budget.total': -1 });
campaignSchema.index({ title: 'text', description: 'text' });

export default mongoose.model('Campaign', campaignSchema);
