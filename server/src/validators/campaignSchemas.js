import { z } from 'zod';
import { parseBody } from './authSchemas.js';
import { DELIVERABLE_FORMATS } from '../models/Campaign.js';

export const targetAudienceSchema = z
  .object({
    ageRange: z.string().trim().max(20).optional(),
    gender: z.enum(['any', 'male', 'female']).optional(),
    interests: z.array(z.string().trim().max(40)).max(15).optional(),
    locations: z.array(z.string().trim().max(80)).max(15).optional()
  })
  .optional();

export const deliverableSchema = z
  .object({
    format: z.enum(DELIVERABLE_FORMATS),
    quantity: z.number().int().min(1).max(100).default(1),
    description: z.string().max(500).optional()
  })
  .optional();

const dateIso = z.string().datetime({ offset: true }).or(z.string().date());

export const campaignCreateSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(4000),
  productInfo: z.string().max(2000).optional(),
  objective: z.string().trim().max(200).optional(),
  targetAudience: targetAudienceSchema,
  niche: z.string().trim().min(2).max(60).optional(),
  requiredPlatforms: z.array(z.string().trim().max(40)).max(10).optional(),
  budget: z.object({
    total: z.number().min(0).max(1_000_000_000),
    currency: z.string().length(3).default('INR')
  }),
  deliverables: z.array(deliverableSchema).max(20).optional(),
  applicationDeadline: dateIso.optional(),
  startDate: dateIso.optional(),
  endDate: dateIso.optional()
});

// Brand-side edits keep the same shape minus required fields; status changes go
// through the transition endpoint, never through a blind update.
export const campaignUpdateSchema = campaignCreateSchema.partial().omit({ budget: false });

export const campaignTransitionSchema = z.object({
  // 'draft' is included so an illegal BACKWARD move gets the domain error
  // (409 INVALID_TRANSITION) instead of a validation error masking it as 400.
  status: z.enum(['draft', 'published', 'paused', 'archived', 'completed'])
});

export const applicationCreateSchema = z.object({
  proposedRate: z.number().min(0).max(10_000_000),
  message: z.string().max(2000).optional(),
  deliverableLinks: z.array(z.string().url()).max(10).optional()
});

export const applicationDecisionSchema = z.object({
  decisionNote: z.string().max(1000).optional()
});

export const invitationCreateSchema = z.object({
  influencerId: z.string().length(24).regex(/^[0-9a-fA-F]{24}$/, 'Invalid influencer id'),
  message: z.string().max(2000).optional(),
  proposedRate: z.number().min(0).max(10_000_000).optional()
});

export const agreementTransitionSchema = z.object({
  // delivery/payout states are their own state machine (paid is not a campaign status)
  status: z.enum(['active', 'delivered', 'payout_pending', 'paid', 'cancelled'])
});

export const invitationRespondSchema = z.object({
  accept: z.boolean(),
  decisionNote: z.string().max(1000).optional()
});

export const agreementInitiateSchema = z.object({
  applicationId: z.string().length(24).optional(),
  invitationId: z.string().length(24).optional(),
  agreedAmount: z.number().min(0).max(1_000_000_000),
  commissionPercent: z.number().min(0).max(100).optional(), // server default when absent
  terms: z.string().max(4000).optional(),
  deliverableDeadline: dateIso.optional()
}).refine((d) => Boolean(d.applicationId) !== Boolean(d.invitationId), {
  message: 'Provide exactly one of applicationId or invitationId'
});

export { parseBody };
