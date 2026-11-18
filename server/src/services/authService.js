import bcrypt from 'bcryptjs';
import { User, BrandProfile, InfluencerProfile, AuditLog } from '../models/index.js';
import { AppError, badRequest, unauthorized, notFound } from '../utils/errors.js';
import { sha256, randomToken } from '../utils/tokens.js';
import { sendMail, buildVerificationEmail, buildWelcomeEmail, buildPasswordResetEmail } from './emailService.js';
import { env, isTest, isProd, clientOrigins } from '../config/env.js';

const BCRYPT_ROUNDS = 12;

/**
 * Base URL for links inside emails. Production always uses CLIENT_ORIGIN; in
 * development the request tells us which frontend the person is really using,
 * so a link mailed while testing on localhost opens localhost instead of the
 * live site (where the freshly created account does not exist).
 */
function linkOrigin(req) {
  if (!isProd) {
    const header = req?.headers?.origin || req?.headers?.referer;
    if (header) {
      try {
        const origin = new URL(header).origin;
        if (clientOrigins.includes(origin)) return origin;
      } catch {
        // malformed header — fall back to the configured origin
      }
    }
  }
  return env.CLIENT_ORIGIN;
}
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
  try {
    await sendVerificationEmail(email, input.companyName, verifyToken, req);
  } catch (err) {
    console.error('[email] non-fatal verification send error:', err.message);
  }
  await audit('auth.register.brand', user._id, { email }, req);
  return user;
}

async function sendVerificationEmail(email, name, token, req) {
  const verifyUrl = `${linkOrigin(req)}/verify-email?token=${token}`;
  if (isEmailConfigured()) {
    // Send branded HTML verification email
    const { html, text } = buildVerificationEmail(name, verifyUrl);
    await sendMail({ to: email, subject: 'Verify your EZ Ads account', text, html });
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

async function sendWelcomeEmail(email, name) {
  if (!isEmailConfigured()) return;
  const { html, text } = buildWelcomeEmail(name);
  await sendMail({ to: email, subject: `Welcome to EZ Ads, ${name}! 🎉`, text, html });
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
  // Send branded welcome email after successful verification
  await sendWelcomeEmail(user.email, user.displayName || 'there');
  return user;
}

export async function registerCreator(input, req) {
  const email = input.email.toLowerCase().trim();
  const existing = await User.findOne({ email });
  if (existing) throw new AppError('An account with this email already exists', 409, 'EMAIL_TAKEN');

  const igHandle = input.instagramUsername.replace(/^@/, '').toLowerCase().trim();

  const user = await User.create({
    role: 'influencer',
    email,
    passwordHash: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
    displayName: input.displayName,
    emailVerified: false,
    instagram: { username: igHandle }
  });
  await InfluencerProfile.create({
    user: user._id,
    displayName: input.displayName,
    username: igHandle,
    niche: input.niche
  });

  const verifyToken = randomToken();
  await User.updateOne(
    { _id: user._id },
    { emailVerificationTokenHash: sha256(verifyToken) }
  );
  try {
    await sendVerificationEmail(email, input.displayName, verifyToken, req);
  } catch (err) {
    console.error('[email] non-fatal verification send error:', err.message);
  }
  await audit('auth.register.creator', user._id, { email, instagramUsername: igHandle }, req);
  return user;
}

export async function loginCreator(email, password, req) {
  const user = await User.findOne({ email: email.toLowerCase().trim(), role: 'influencer' }).select('+passwordHash');
  if (!user) {
    await bcrypt.compare(password, '$2a$12$0000000000000000000000000000000000000000000000000000');
    throw unauthorized('Invalid email or password');
  }
  if (user.status === 'suspended') throw new AppError('Account suspended — contact support', 403, 'ACCOUNT_SUSPENDED');
  const ok = await bcrypt.compare(password, user.passwordHash || '');
  if (!ok) {
    await audit('auth.login.creator.failed', user._id, {}, req);
    throw unauthorized('Invalid email or password');
  }
  await audit('auth.login.creator', user._id, {}, req);
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

export async function requestPasswordReset(email, req) {
  const user = await User.findOne({ email: email.toLowerCase().trim(), role: { $in: ['brand', 'influencer'] } });
  if (!user) return; // no enumeration: identical response either way
  const token = randomToken();
  await User.updateOne(
    { _id: user._id },
    { passwordResetTokenHash: sha256(token), passwordResetExpiresAt: new Date(Date.now() + RESET_TTL_MS) }
  );
  const resetUrl = `${linkOrigin(req)}/reset-password?token=${token}`;
  if (isEmailConfigured()) {
    // Send branded HTML password reset email
    const { html, text } = buildPasswordResetEmail(resetUrl);
    await sendMail({ to: user.email, subject: 'Reset your EZ Ads password', text, html });
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

/* ---------------- Self-service account settings ----------------
   Brands edit company details, creators edit their public profile. Account
   identity (email, role, status) is never writable from here. */

export async function getOwnAccount(user) {
  const profile = user.role === 'brand'
    ? await BrandProfile.findOne({ user: user._id })
    : user.role === 'influencer'
      ? await InfluencerProfile.findOne({ user: user._id })
      : null;
  return {
    id: user._id,
    role: user.role,
    email: user.email,
    emailVerified: user.emailVerified,
    displayName: user.displayName,
    status: user.status,
    // creators now sign in with email+password, same as brands
    canChangePassword: true,
    profile
  };
}

export async function updateOwnAccount(user, input, req) {
  const name = input.companyName ?? input.displayName;
  if (name) await User.updateOne({ _id: user._id }, { $set: { displayName: name } });

  if (user.role === 'brand') {
    const set = {};
    if (input.companyName) set.companyName = input.companyName;
    if (input.industry) set.industry = input.industry;
    if (input.website !== undefined) set.website = input.website || undefined;
    if (input.phone !== undefined) set['contact.phone'] = input.phone || undefined;
    if (input.city !== undefined) set['contact.city'] = input.city || undefined;
    if (input.country !== undefined) set['contact.country'] = input.country || undefined;
    if (input.about !== undefined) set.about = input.about;
    if (Object.keys(set).length) {
      await BrandProfile.updateOne({ user: user._id }, { $set: set }, { runValidators: true });
    }
  } else if (user.role === 'influencer') {
    const set = {};
    if (name) set.displayName = name;
    if (input.bio !== undefined) set.bio = input.bio;
    if (input.city !== undefined) set['location.city'] = input.city || undefined;
    if (input.country !== undefined) set['location.country'] = input.country || undefined;
    if (Object.keys(set).length) {
      await InfluencerProfile.updateOne({ user: user._id }, { $set: set }, { runValidators: true });
    }
  }

  await audit('account.profile.update', user._id, { fields: Object.keys(input) }, req);
  return { updated: Object.keys(input) };
}

export async function changeOwnPassword(user, { currentPassword, newPassword }, req) {
  const doc = await User.findById(user._id).select('+passwordHash');
  if (!doc?.passwordHash) throw badRequest('No password is set on this account.');

  const ok = await bcrypt.compare(currentPassword, doc.passwordHash);
  if (!ok) throw new AppError('Current password is incorrect', 401, 'INVALID_PASSWORD');
  if (currentPassword === newPassword) {
    throw badRequest('Choose a new password that is different from the current one');
  }

  doc.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  // any outstanding reset link stops working once the owner picks a password
  doc.passwordResetTokenHash = undefined;
  doc.passwordResetExpiresAt = undefined;
  await doc.save();
  await audit('account.password.change', user._id, {}, req);
  return { changed: true };
}
