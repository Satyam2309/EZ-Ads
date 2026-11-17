import { z } from 'zod';

export const BRAND_INDUSTRIES = [
  'fashion', 'beauty', 'food_beverage', 'health_fitness', 'technology', 'gaming',
  'education', 'finance', 'travel', 'entertainment', 'ecommerce', 'automotive',
  'home_living', 'sports', 'other'
];

// same rule the register + reset flows enforce, reused by the change-password form
const strongPassword = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(/[A-Za-z]/, 'Must include a letter')
  .regex(/[0-9]/, 'Must include a number');

export const registerBrandSchema = z.object({
  companyName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  password: strongPassword,
  industry: z.enum(BRAND_INDUSTRIES),
  website: z.string().trim().url().optional().or(z.literal('')),
  phone: z.string().trim().max(20).optional().or(z.literal(''))
});

// login inputs must be plain strings — mongoSanitize removes $ operators and
// leaves empty objects behind, so this also turns NoSQL-injection payloads into a 400
export const loginSchema = z.object({
  email: z.string().trim().min(3).max(200),
  password: z.string().min(1).max(128)
});

// password reset flow — clean 400s instead of silent misses for malformed bodies
export const passwordResetRequestSchema = z.object({
  email: z.string().trim().email('Enter a valid email').max(200)
});

export const passwordResetSchema = z.object({
  token: z.string().trim().min(10, 'Reset token is required').max(200),
  password: strongPassword
});

/* Self-service account edits from the settings page. Brands edit company details,
   creators edit their public profile — the service picks the fields that apply. */
export const selfProfileUpdateSchema = z
  .object({
    companyName: z.string().trim().min(2).max(120).optional(),
    displayName: z.string().trim().min(2).max(80).optional(),
    industry: z.enum(BRAND_INDUSTRIES).optional(),
    website: z.string().trim().url('Enter a valid URL (https://…)').max(300).optional().or(z.literal('')),
    phone: z.string().trim().max(20).optional().or(z.literal('')),
    city: z.string().trim().max(80).optional().or(z.literal('')),
    country: z.string().trim().max(80).optional().or(z.literal('')),
    about: z.string().max(2000).optional(),
    bio: z.string().max(1000).optional()
  })
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password').max(128),
  newPassword: strongPassword
});

// strip unknown keys so extra fields can never reach models controllers
export function parseBody(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) {
    const first = result.error.issues[0];
    const err = new Error(`${first.path.join('.') || 'body'}: ${first.message}`);
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  return result.data;
}
