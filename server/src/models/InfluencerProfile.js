import mongoose from 'mongoose';

const { Schema } = mongoose;

export const PROMOTION_FORMATS = ['post', 'reel', 'story', 'video', 'custom'];

const rateSchema = new Schema(
  {
    format: { type: String, enum: PROMOTION_FORMATS, required: true },
    amount: { type: Number, min: 0, required: true },
    currency: { type: String, default: 'INR', required: true }
  },
  { _id: false }
);

const portfolioItemSchema = new Schema(
  {
    title: { type: String, trim: true, maxlength: 120 },
    mediaUrl: { type: String, required: true },
    thumbnailUrl: { type: String },
    description: { type: String, maxlength: 500 }
  },
  { _id: true }
);

/**
 * InfluencerProfile — editable, searchable profile for an influencer User.
 * Discovery indexes: niche, location, followers, engagement, rate range, text search.
 */
const influencerProfileSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

    displayName: { type: String, trim: true, maxlength: 80, required: true },
    username: { type: String, trim: true, lowercase: true, maxlength: 40 },

    niche: { type: String, trim: true, lowercase: true, maxlength: 60, required: true },
    contentCategories: [{ type: String, trim: true, lowercase: true, maxlength: 40 }],

    location: {
      city: { type: String, trim: true, maxlength: 80 },
      country: { type: String, trim: true, maxlength: 80 }
    },

    bio: { type: String, maxlength: 1000 },
    languages: [{ type: String, trim: true, maxlength: 30 }],

    // Audience metrics. Each field records where the number came from so the UI
    // can label honestly: 'meta_api' (from Instagram OAuth) vs 'self_reported'.
    audience: {
      followers: { type: Number, min: 0, default: 0 },
      followersSource: { type: String, enum: ['meta_api', 'self_reported'], default: 'self_reported' },
      followersSyncedAt: { type: Date },
      engagementRate: { type: Number, min: 0, max: 100 }, // percent
      engagementSource: { type: String, enum: ['meta_api', 'self_reported'], default: 'self_reported' }
    },

    rates: [rateSchema],
    minBudget: { type: Number, min: 0, default: 0 },
    maxBudget: { type: Number, min: 0, default: 0 },

    portfolio: [portfolioItemSchema],

    otherProfiles: [
      {
        platform: { type: String, required: true, trim: true, lowercase: true },
        username: { type: String, trim: true },
        url: { type: String, required: true },
        status: { type: String, enum: ['connected', 'self_reported', 'unavailable'], default: 'self_reported' }
      }
    ],

    availability: { type: String, enum: ['available', 'limited', 'booked', 'paused'], default: 'available', index: true },

    isListed: { type: Boolean, default: true, index: true }, // brand-discovery visibility
    completionStep: { type: Number, min: 0, default: 0 } // onboarding progress
  },
  { timestamps: true }
);

// Discovery compound indexes (see services/discovery for usage)
influencerProfileSchema.index({ isListed: 1, 'audience.followers': -1 });
influencerProfileSchema.index({ isListed: 1, niche: 1, 'audience.followers': -1 });
influencerProfileSchema.index({ isListed: 1, 'audience.engagementRate': -1 });
influencerProfileSchema.index({ isListed: 1, minBudget: 1, maxBudget: 1 });
influencerProfileSchema.index({ 'location.country': 1, 'location.city': 1 });
influencerProfileSchema.index({ displayName: 'text', username: 'text', niche: 'text', bio: 'text' });

export default mongoose.model('InfluencerProfile', influencerProfileSchema);
