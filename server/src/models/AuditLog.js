import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * AuditLog — append-only record of sensitive actions (auth, payments,
 * admin moderation, account status changes). Never updated or deleted once
 * written; admin UI in Phase 7 reads it.
 */
const auditLogSchema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User', index: true }, // null = system
    action: { type: String, required: true, maxlength: 80, index: true }, // e.g. 'user.suspend', 'auth.login.brand'
    targetType: { type: String, maxlength: 40 },
    targetId: { type: Schema.Types.ObjectId },

    // sanitized metadata only — NEVER include passwords, tokens, otps
    meta: { type: Schema.Types.Mixed },

    ip: { type: String },
    userAgent: { type: String, maxlength: 300 }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });
// append-only: no document updates
auditLogSchema.pre('save', function forbidUpdate() {
  if (!this.isNew && !this.$__.savingForAudit) {
    throw new Error('AuditLog entries are immutable');
  }
});
auditLogSchema.methods.updateOne = function forbidUpdateOne() {
  throw new Error('AuditLog entries are immutable');
};

export default mongoose.model('AuditLog', auditLogSchema);
