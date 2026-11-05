import bcrypt from 'bcryptjs';
import { User, BrandProfile, AuditLog } from '../models/index.js';
import { AppError, badRequest, unauthorized, notFound } from '../utils/errors.js';
import { sha256, randomToken } from '../utils/tokens.js';
import { sendMail } from './emailService.js';
import { env, isTest, isProd } from '../config/env.js';

const BCRYPT_ROUNDS = 12;
const VERIFY_TTL_MS = 24 * 3600 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

async function audit(action, actorId, meta = {}, req = {}) {
  await AuditLog.create({
    actor: actorId, action, meta, ip: req.ip, userAgent: (req.headers?.['user-agent'] || '').slice(0, 300)
  });
}

export async function registerBrand(input, req) {
  const email = input.email.toLowerCase().trim();
  const existing = await User.findOne({ email });
  if (existing) throw new AppError('An account with this email already exists', 409, 'EMAIL_TAKEN');

  const user = await User.create({
    role: 'brand',
    email,
    passwordHash: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
    displayName: input.companyName,
    emailVerified: false
  });
  await BrandProfile.create({
    user: user._id,
    companyName: input.companyName,
    industry: input.industry,
    website: input.website,
    contact: { phone: input.phone }
  });

  const verifyToken = randomToken();
  await User.updateOne(
    { _id: user._id },
    { emailVerificationTokenHash: sha256(verifyToken) }
  );
  await sendVerificationEmail(email, input.companyName, verifyToken);
  await audit('auth.register.brand', user._id, { email }, req);
  return user;
}

async function sendVerificationEmail(email, name, token) {
  const verifyUrl = `${env.CLIENT_ORIGIN}/verify-email?token=${token}`;
  if (isEmailConfigured()) {
    await sendMail({
      to: email,
      subject: 'Verify your EZ Ads account',
      text: `Hi ${name},\n\nVerify your EZ Ads account: ${verifyUrl}\n\nLink expires in 24 hours.`
    });
  } else {
    // Dev fallback: never silently pretend email was sent. Log the link; in
    // tests the token is also returned so flows can complete deterministically.
    console.log(`[email] not configured — verification link for ${email}: ${verifyUrl}`);
    if (!isProd) {
      // dev mailbox: tests read it directly; the dev-only /auth/dev/mailbox
      // endpoint surfaces it to the SPA so email flows are completable without SMTP
      const { latestDevToken } = await import('./devMailbox.js');
      latestDevToken.set(email, token);
    }
  }
}

export function isEmailConfigured() {
  return Boolean(env.EMAIL_HOST && env.EMAIL_USER && env.EMAIL_PASS);
}

export async function verifyEmail(token) {
  const user = await User.findOne({ emailVerificationTokenHash: sha256(token) }).select('+emailVerificationTokenHash');
  if (!user) throw new AppError('Invalid or expired verification link', 400, 'INVALID_TOKEN');
  user.emailVerified = true;
  user.emailVerificationTokenHash = undefined;
  await user.save();
  await audit('auth.email_verified', user._id);
  return user;
}

export async function loginBrand(email, password, req) {
  const user = await User.findOne({ email: email.toLowerCase().trim(), role: 'brand' }).select('+passwordHash');
  // constant-ish response regardless of which half failed (no user enumeration)
  if (!user) {
    await bcrypt.compare(password, '$2a$12$0000000000000000000000000000000000000000000000000000');
    throw unauthorized('Invalid email or password');
  }
  if (user.status === 'suspended') throw new AppError('Account suspended — contact support', 403, 'ACCOUNT_SUSPENDED');
  const ok = await bcrypt.compare(password, user.passwordHash || '');
  if (!ok) {
    await audit('auth.login.brand.failed', user._id, {}, req);
    throw unauthorized('Invalid email or password');
  }
  await audit('auth.login.brand', user._id, {}, req);
  return user;
}

// Admin accounts are provisioned ONLY by scripts/seedAdmin.js — never public registration.
export async function loginAdmin(email, password, req) {
  const user = await User.findOne({ email: email.toLowerCase().trim(), role: 'admin' }).select('+passwordHash');
  if (!user) {
    await bcrypt.compare(password, '$2a$12$0000000000000000000000000000000000000000000000000000');
    throw unauthorized('Invalid admin credentials');
  }
  if (user.status === 'suspended') throw new AppError('Account suspended', 403, 'ACCOUNT_SUSPENDED');
  const ok = await bcrypt.compare(password, user.passwordHash || '');
  if (!ok) {
    await audit('auth.login.admin.failed', user._id, {}, req);
    throw unauthorized('Invalid admin credentials');
  }
  await audit('auth.login.admin', user._id, {}, req);
  return user;
}

export async function requestPasswordReset(email) {
  const user = await User.findOne({ email: email.toLowerCase().trim(), role: 'brand' });
  if (!user) return; // no enumeration: identical response either way
  const token = randomToken();
  await User.updateOne(
    { _id: user._id },
    { passwordResetTokenHash: sha256(token), passwordResetExpiresAt: new Date(Date.now() + RESET_TTL_MS) }
  );
  const resetUrl = `${env.CLIENT_ORIGIN}/reset-password?token=${token}`;
  if (isEmailConfigured()) {
    await sendMail({
      to: user.email,
      subject: 'Reset your EZ Ads password',
      text: `Reset your password: ${resetUrl}\n\nLink expires in 60 minutes. If you didn't request this, ignore this email.`
    });
  } else {
    console.log(`[email] not configured — password reset link for ${user.email}: ${resetUrl}`);
    if (!isProd) {
      const { latestDevToken } = await import('./devMailbox.js');
      latestDevToken.set(user.email, token);
    }
  }
}

export async function resetPassword(token, newPassword) {
  if (!newPassword || newPassword.length < 8) throw badRequest('Password must be at least 8 characters');
  if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    throw badRequest('Password must include letters and numbers');
  }
  const user = await User.findOne({
    passwordResetTokenHash: sha256(token),
    passwordResetExpiresAt: { $gt: new Date() }
  }).select('+passwordResetTokenHash');
  if (!user) throw new AppError('Invalid or expired reset link', 400, 'INVALID_TOKEN');
  user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpiresAt = undefined;
  await user.save();
  await audit('auth.password_reset', user._id);
  return user;
}
