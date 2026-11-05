import mongoose from 'mongoose';

const { Schema } = mongoose;

export const REPORT_SUBJECT_TYPES = ['influencer_profile', 'campaign', 'user'];
export const REPORT_STATUSES = ['open', 'reviewing', 'resolved_no_action', 'resolved_action_taken', 'dismissed'];

/**
 * Report — a complaint filed by any user against a profile/campaign/user.
 * Admins process these in Phase 7; status transitions are admin-only.
 */
const reportSchema = new Schema(
  {
    reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    subjectType: { type: String, enum: REPORT_SUBJECT_TYPES, required: true },
    subjectId: { type: Schema.Types.ObjectId, required: true },

    reason: { type: String, enum: ['inappropriate_content', 'scam_or_fraud', 'fake_engagement', 'misleading_information', 'off_platform_contact', 'other'], required: true },
    details: { type: String, maxlength: 2000 },

    attachments: [{ type: String }], // media URLs (Cloudinary, Phase 4+)

    status: { type: String, enum: REPORT_STATUSES, default: 'open', index: true },
    handledBy: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    handledAt: { type: Date },
    resolutionNote: { type: String, maxlength: 1000 }
  },
  { timestamps: true }
);

// report a given subject at most once per reporter
reportSchema.index({ reporter: 1, subjectType: 1, subjectId: 1 }, { unique: true });
reportSchema.index({ status: 1, createdAt: 1 });

export default mongoose.model('Report', reportSchema);
