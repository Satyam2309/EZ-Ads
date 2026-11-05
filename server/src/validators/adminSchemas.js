import { z } from 'zod';
import { REPORT_STATUSES } from '../models/Report.js';

/** Suspend / reinstate a non-admin user account. 'deleted' is never a client action — no endpoint deletes users. */
export const userStatusSchema = z.object({
  status: z.enum(['active', 'suspended'])
});

/**
 * Admin report transitions. Forward-only and terminal-checked in the service;
 * `resolutionNote` is required whenever the admin resolves actions/no-action/dismiss.
 */
export const reportUpdateSchema = z
  .object({
    status: z.enum(REPORT_STATUSES),
    resolutionNote: z.string().trim().max(1000).optional()
  })
  .refine(
    (d) => !['resolved_no_action', 'resolved_action_taken', 'dismissed'].includes(d.status) || (d.resolutionNote && d.resolutionNote.length > 0),
    { message: 'resolutionNote is required when closing a report' }
  );

export { parseBody } from './authSchemas.js';
