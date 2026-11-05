import { z } from 'zod';
import { parseBody } from './authSchemas.js';

export const PROMOTION_FORMATS = ['post', 'reel', 'story', 'video', 'custom'];
export const SOCIAL_PLATFORMS = ['youtube', 'tiktok', 'facebook', 'x', 'linkedin', 'other'];

export const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(2).max(80).optional(),
  niche: z.string().trim().min(2).max(60).optional(),
  contentCategories: z.array(z.string().trim().min(2).max(40)).max(10).optional(),
  bio: z.string().max(1000).optional(),
  languages: z.array(z.string().trim().max(30)).max(6).optional(),
  location: z
    .object({
      city: z.string().trim().max(80).optional(),
      country: z.string().trim().max(80).optional()
    })
    .optional(),
  audience: z
    .object({
      followers: z.number().int().min(0).max(500_000_000).optional(),
      engagementRate: z.number().min(0).max(100).optional()
    })
    .optional(),
  // Self-reported rates; API-derived values come only from OAuth sync
  rates: z
    .array(
      z.object({
        format: z.enum(PROMOTION_FORMATS),
        amount: z.number().min(0).max(10_000_000),
        currency: z.string().length(3).default('INR')
      })
    )
    .max(10)
    .optional(),
  minBudget: z.number().min(0).optional(),
  maxBudget: z.number().min(0).optional(),
  portfolio: z
    .array(
      z.object({
        title: z.string().trim().max(120).optional(),
        mediaUrl: z.string().url(),
        thumbnailUrl: z.string().url().optional(),
        description: z.string().max(500).optional()
      })
    )
    .max(12)
    .optional(),
  availability: z.enum(['available', 'limited', 'booked', 'paused']).optional(),
  isListed: z.boolean().optional()
});

export const socialAccountSchema = z.object({
  platform: z.enum(SOCIAL_PLATFORMS),
  username: z.string().trim().max(120).optional().or(z.literal('')),
  url: z.string().trim().url()
});

export const shortlistCreateSchema = z.object({
  name: z.string().trim().min(1).max(80)
});

export const shortlistItemSchema = z.object({
  influencerId: z.string().length(24).regex(/^[0-9a-fA-F]{24}$/, 'Invalid influencer id'),
  note: z.string().max(500).optional()
});

export { parseBody };
