import { z } from 'zod';

export const conversationCreateSchema = z.object({
  campaignId: z.string().length(24).regex(/^[0-9a-fA-F]{24}$/, 'Invalid campaign id'),
  influencerId: z.string().length(24).regex(/^[0-9a-fA-F]{24}$/, 'Invalid influencer id').optional()
});

export const messageBodySchema = z.object({
  body: z.string().trim().min(1).max(4000)
});

export { parseBody } from './authSchemas.js';
