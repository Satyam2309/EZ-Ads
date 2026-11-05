import mongoose from 'mongoose';

const { Schema } = mongoose;

export const SOCIAL_PLATFORMS = ['youtube', 'tiktok', 'facebook', 'x', 'linkedin', 'other'];
export const CONNECT_STATUS = ['connected', 'self_reported', 'unavailable'];

/**
 * ConnectedSocialAccount — an influencer's non-Instagram social profile.
 * Status semantics (enforced here, displayed honestly in the UI):
 *  - connected      : official platform OAuth completed with granted permission
 *  - self_reported  : public URL validated by format only, NOT independently verified
 *  - unavailable    : no official verification mechanism for this platform/was revoked
 * dataSource records where any statistics came from. Follower numbers coming from
 * an official API are only set when status is 'connected'.
 */
const connectedSocialAccountSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    platform: { type: String, enum: SOCIAL_PLATFORMS, required: true },
    username: { type: String, trim: true, maxlength: 120 },
    url: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (v) => /^https?:\/\/.+\..+/.test(v),
        message: 'Profile URL must be a valid http(s) URL'
      }
    },

    // OAuth identity on that platform when a real connection exists
    providerAccountId: { type: String, sparse: true },

    status: { type: String, enum: CONNECT_STATUS, required: true, default: 'self_reported' },
    connectionMethod: { type: String, enum: ['oauth', 'manual_url'], default: 'manual_url' },

    stats: {
      followers: { type: Number, min: 0 },
      followersSource: { type: String, enum: ['platform_api', 'self_reported'], default: 'self_reported' },
      syncedAt: { type: Date }
    },

    lastVerifiedAt: { type: Date }
  },
  { timestamps: true }
);

// A user cannot double-list the same platform account
connectedSocialAccountSchema.index({ user: 1, platform: 1, providerAccountId: 1 }, { unique: true, sparse: true });
connectedSocialAccountSchema.index({ user: 1, platform: 1, url: 1 });

export default mongoose.model('ConnectedSocialAccount', connectedSocialAccountSchema);
