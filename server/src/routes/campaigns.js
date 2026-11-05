import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/session.js';
import { parseBody } from '../validators/authSchemas.js';
import {
  campaignCreateSchema, campaignUpdateSchema, campaignTransitionSchema,
  applicationCreateSchema, applicationDecisionSchema,
  invitationCreateSchema, invitationRespondSchema,
  agreementInitiateSchema, agreementTransitionSchema
} from '../validators/campaignSchemas.js';
import { asyncHandler } from '../utils/errors.js';
import { listOpenCampaigns } from '../services/campaignService.js';
import * as C from '../controllers/campaignController.js';

const router = Router();

/* ---------- Creator-facing (also exposes open campaigns to any authed user) ---------- */
router.get('/campaigns/open', requireAuth, asyncHandler(C.browseOpenCampaigns));

router.use(requireAuth);

/* ---------- Brand campaign CRUD (brand-only) ---------- */
const brandOnly = requireRole('brand');
router.get('/brand/campaigns', brandOnly, asyncHandler(C.listMyCampaigns));
router.post('/brand/campaigns', brandOnly,
  asyncHandler((req, _res, next) => { req.body = parseBody(campaignCreateSchema, req.body); next(); }),
  asyncHandler(C.createCampaignHandler));
router.get('/brand/campaigns/:id', brandOnly, asyncHandler(C.getMyCampaign));
router.patch('/brand/campaigns/:id', brandOnly,
  asyncHandler((req, _res, next) => { req.body = parseBody(campaignUpdateSchema.partial(), req.body); next(); }),
  asyncHandler(C.updateCampaignHandler));
router.post('/brand/campaigns/:id/transition', brandOnly,
  asyncHandler((req, _res, next) => { req.body = parseBody(campaignTransitionSchema, req.body); next(); }),
  asyncHandler(C.transitionCampaignHandler));

/* Applications on a brand's campaign */
router.get('/brand/campaigns/:id/applications', brandOnly, asyncHandler(C.listApplicationsHandler));
router.get('/brand/campaigns/:id/invitations', brandOnly, asyncHandler(C.listCampaignInvitationsHandler));
router.post('/brand/campaigns/:id/invite', brandOnly,
  asyncHandler((req, _res, next) => { req.body = parseBody(invitationCreateSchema, req.body); next(); }),
  asyncHandler(C.inviteHandler));

/* ---------- Applications (influencer) ---------- */
router.get('/influencer/applications', requireRole('influencer'), asyncHandler(C.listMyApplications));
router.post('/campaigns/:id/apply', requireRole('influencer'),
  asyncHandler((req, _res, next) => { req.body = parseBody(applicationCreateSchema, req.body); next(); }),
  asyncHandler(C.applyHandler));
router.post('/applications/:id/withdraw', requireRole('influencer'), asyncHandler(C.withdrawHandler));

/* Brand decides on pending applications */
router.post('/applications/:applicationId/:action', requireRole('brand'),
  asyncHandler((req, _res, next) => { req.body = parseBody(applicationDecisionSchema.partial(), req.body); next(); }),
  asyncHandler(C.decideApplicationHandler));

/* ---------- Invitations (influencer side) ---------- */
router.get('/influencer/invitations', requireRole('influencer'), asyncHandler(C.listMyInvitations));
router.post('/invitations/:invitationId/respond', requireRole('influencer'),
  asyncHandler((req, _res, next) => { req.body = parseBody(invitationRespondSchema, req.body); next(); }),
  asyncHandler(C.respondInvitationHandler));
router.post('/invitations/:invitationId/revoke', brandOnly, asyncHandler(C.revokeInvitationHandler));

/* ---------- Agreements ---------- */
router.post('/agreements', brandOnly,
  asyncHandler((req, _res, next) => { req.body = parseBody(agreementInitiateSchema, req.body); next(); }),
  asyncHandler(C.initiateAgreementHandler));
router.get('/influencer/agreements', requireRole('influencer'), asyncHandler(C.listMyAgreementsCreator));
router.get('/brand/agreements', brandOnly, asyncHandler(C.listMyAgreementsBrand));
router.post('/agreements/:agreementId/respond', requireRole('influencer'),
  asyncHandler((req, _res, next) => { req.body = parseBody(invitationRespondSchema, req.body); next(); }),
  asyncHandler(C.respondAgreementHandler));
router.post('/agreements/:agreementId/transition', brandOnly,
  asyncHandler((req, _res, next) => { req.body = parseBody(agreementTransitionSchema, req.body); next(); }),
  asyncHandler(C.transitionAgreementHandler));

/* Agreement listing by agreement id for both parties (detail view) */
router.get('/agreements/:id', requireAuth, asyncHandler(async (req, res, next) => {
  // both parties may see their own agreement; enforced in service
  next();
}), asyncHandler(async (req, res) => {
  const { getAgreementForParty } = await import('../services/campaignService.js');
  const a = await getAgreementForParty({ role: req.user.role, id: String(req.user._id) }, req.params.id);
  res.json({ ok: true, data: a });
}));

export default router;
