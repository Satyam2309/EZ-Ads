import mongoose from 'mongoose';

const { Schema } = mongoose;

const INDUSTRIES = [
  'fashion', 'beauty', 'food_beverage', 'health_fitness', 'technology', 'gaming',
  'education', 'finance', 'travel', 'entertainment', 'ecommerce', 'automotive',
  'home_living', 'sports', 'other'
];

/**
 * BrandProfile — company details for a User with role 'brand'.
 * Authoritative identity fields (email, password, status) live on User;
 * this document holds only brand-specific business data.
 */
const brandProfileSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

    companyName: { type: String, trim: true, maxlength: 120, required: true },
    industry: { type: String, enum: INDUSTRIES, required: true },
    website: {
      type: String,
      trim: true,
      validate: {
        validator: (v) => !v || /^https?:\/\/.+\..+/.test(v),
        message: 'Website must be a valid URL (http(s)://...)'
      }
    },
    logoUrl: { type: String },

    contact: {
      phone: { type: String, trim: true, maxlength: 20 },
      city: { type: String, trim: true, maxlength: 80 },
      country: { type: String, trim: true, maxlength: 80 }
    },

    about: { type: String, maxlength: 2000 },
    verified: { type: Boolean, default: false } // future: domain/registration check, never self-assigned
  },
  { timestamps: true }
);

brandProfileSchema.index({ companyName: 'text', industry: 1 });

export const BRAND_INDUSTRIES = INDUSTRIES;
export default mongoose.model('BrandProfile', brandProfileSchema);
