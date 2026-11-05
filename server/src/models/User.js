import mongoose from 'mongoose';

const { Schema } = mongoose;

const ROLES = ['influencer', 'brand', 'admin'];
const STATUSES = ['active', 'suspended', 'deleted'];

/**
 * User — single identity per person/brand across roles.
 * Influencers authenticate via Instagram OAuth (provider fields set on first login).
 * Brands authenticate via email + passwordHash (bcrypt, set only for role=brand).
 * Admins are provisioned exclusively by scripts/seedAdmin.js — never via public signup.
 */
const userSchema = new Schema(
  {
    role: { type: String, enum: ROLES, required: true, index: true },

    // --- Brand identity ---
    email: {
      type: String,
      lowercase: true,
      trim: true,
      unique: true, // implies an index; do NOT also set index:true (name conflict)
      sparse: true, // unique among users that have one
      validate: {
        validator: (v) => v === null || v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        message: 'Invalid email address'
      }
    },
    passwordHash: { type: String, select: false }, // never returned unless explicitly selected
    emailVerified: { type: Boolean, default: false },
    emailVerificationTokenHash: { type: String, select: false },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpiresAt: { type: Date, select: false },

    // --- Instagram provider identity (influencers) ---
    instagram: {
      providerId: { type: String, unique: true, sparse: true }, // stable Meta account id
      username: { type: String, trim: true, lowercase: true },
      accountType: { type: String, enum: ['BUSINESS', 'CREATOR', 'UNKNOWN'], default: 'UNKNOWN' },
      accessTokenEnc: { type: String, select: false }, // encrypted at rest by services/oauth
      tokenExpiresAt: { type: Date, select: false },
      connectedAt: { type: Date },
      reauthRequired: { type: Boolean, default: false },
      // true ONLY when identity came from the clearly-labeled development mock.
      // Never true for real Meta OAuth — surfaces honestly in UI as development data.
      isMock: { type: Boolean, default: false, select: false }
    },

    displayName: { type: String, trim: true, maxlength: 80 },
    avatarUrl: { type: String },

    status: { type: String, enum: STATUSES, default: 'active', index: true }
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.passwordHash;
        delete ret.emailVerificationTokenHash;
        delete ret.passwordResetTokenHash;
        delete ret.passwordResetExpiresAt;
        delete ret.instagram?.accessTokenEnc;
        return ret;
      }
    }
  }
);

userSchema.index({ role: 1, status: 1 });
// provider-id + email uniqueness are declared on the paths themselves

export const USER_ROLES = ROLES;
export default mongoose.model('User', userSchema);
