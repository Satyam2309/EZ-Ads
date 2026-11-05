import {
  createCampaign, updateCampaign, transitionCampaign, listBrandCampaigns, listOpenCampaigns, getCampaignForBrand,
  applyToCampaign, withdrawApplication, listCampaignApplications, decideApplication, listCreatorApplications,
  inviteInfluencer, revokeInvitation, listCreatorInvitations, listCampaignInvitations, respondToInvitation,
  initiateAgreement, respondToAgreement, transitionAgreement, listCreatorAgreements, listBrandAgreements
} from '../services/campaignService.js';
import { asyncHandler, badRequest } from '../utils/errors.js';

/* ---------------- Campaign CRUD + transitions ---------------- */

export const createCampaignHandler = asyncHandler(async (req, res) => {
  const campaign = await createCampaign(req.user._id, req.body);
  res.status(201).json({ ok: true, data: campaign });
});

export const updateCampaignHandler = asyncHandler(async (req, res) => {
  const campaign = await updateCampaign(req.user._id, req.params.id, req.body);
  res.json({ ok: true, data: campaign });
});

export const transitionCampaignHandler = asyncHandler(async (req, res) => {
  const campaign = await transitionCampaign(req.user._id, req.params.id, req.body.status);
  res.json({ ok: true, data: campaign });
});

export const listMyCampaigns = asyncHandler(async (req, res) => {
  const result = await listBrandCampaigns(req.user._id, req.query);
  res.json({ ok: true, data: result });
});

export const getMyCampaign = asyncHandler(async (req, res) => {
  const campaign = await getCampaignForBrand(req.user._id, req.params.id);
  res.json({ ok: true, data: campaign });
});

/** Creator-facing feed of published campaigns. */
export const browseOpenCampaigns = asyncHandler(async (req, res) => {
  const result = await listOpenCampaigns(req.query);
  res.json({ ok: true, data: result });
});

/* ---------------- Applications ---------------- */

export const applyHandler = asyncHandler(async (req, res) => {
  const app = await applyToCampaign(req.user._id, req.params.id, req.body);
  res.status(201).json({ ok: true, data: app });
});

export const withdrawHandler = asyncHandler(async (req, res) => {
  const app = await withdrawApplication(req.user._id, req.params.id);
  res.json({ ok: true, data: app });
});

export const listApplicationsHandler = asyncHandler(async (req, res) => {
  const items = await listCampaignApplications(req.user._id, req.params.id);
  res.json({ ok: true, data: items });
});

export const decideApplicationHandler = asyncHandler(async (req, res) => {
  const action = req.params.action === 'accept' ? 'accept' : req.params.action === 'reject' ? 'reject' : null;
  if (!action) throw badRequest('Action must be accept or reject');
  const app = await decideApplication(req.user._id, req.params.applicationId, action, req.body.decisionNote);
  res.json({ ok: true, data: app });
});

export const listMyApplications = asyncHandler(async (req, res) => {
  const items = await listCreatorApplications(req.user._id);
  res.json({ ok: true, data: items });
});

/* ---------------- Invitations ---------------- */

export const inviteHandler = asyncHandler(async (req, res) => {
  const inv = await inviteInfluencer(req.user._id, req.params.id, req.body);
  res.status(201).json({ ok: true, data: inv });
});

export const revokeInvitationHandler = asyncHandler(async (req, res) => {
  const inv = await revokeInvitation(req.user._id, req.params.invitationId);
  res.json({ ok: true, data: inv });
});

export const listMyInvitations = asyncHandler(async (req, res) => {
  const items = await listCreatorInvitations(req.user._id);
  res.json({ ok: true, data: items });
});

export const listCampaignInvitationsHandler = asyncHandler(async (req, res) => {
  const items = await listCampaignInvitations(req.user._id, req.params.id);
  res.json({ ok: true, data: items });
});

export const respondInvitationHandler = asyncHandler(async (req, res) => {
  const inv = await respondToInvitation(req.user._id, req.params.invitationId, req.body.accept === true, req.body.decisionNote);
  res.json({ ok: true, data: inv });
});

/* ---------------- Agreements ---------------- */

export const initiateAgreementHandler = asyncHandler(async (req, res) => {
  const a = await initiateAgreement(req.user._id, req.body);
  res.status(201).json({ ok: true, data: a });
});

export const respondAgreementHandler = asyncHandler(async (req, res) => {
  const a = await respondToAgreement(req.user._id, req.params.agreementId, req.body.accept === true);
  res.json({ ok: true, data: a });
});

export const transitionAgreementHandler = asyncHandler(async (req, res) => {
  const a = await transitionAgreement({ role: req.user.role, id: String(req.user._id) }, req.params.agreementId, req.body.status);
  res.json({ ok: true, data: a });
});

export const listMyAgreementsCreator = asyncHandler(async (req, res) => {
  const items = await listCreatorAgreements(req.user._id);
  res.json({ ok: true, data: items });
});

export const listMyAgreementsBrand = asyncHandler(async (req, res) => {
  const items = await listBrandAgreements(req.user._id);
  res.json({ ok: true, data: items });
});

export { asyncHandler };
