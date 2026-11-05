import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/session.js';
import { attachUser } from '../middleware/session.js';
import { parseBody } from '../validators/authSchemas.js';
import {
  profileUpdateSchema, socialAccountSchema, shortlistCreateSchema, shortlistItemSchema
} from '../validators/profileSchemas.js';
import { asyncHandler } from '../utils/errors.js';
import {
  getMyProfile, updateMyProfile,
  listSocialAccounts, addSocialAccount, removeSocialAccount,
  discoverySearch, getPublicProfile,
  listShortlists, createShortlist, renameShortlist, deleteShortlist,
  addToShortlist, removeFromShortlist
} from '../controllers/profileController.js';

const router = Router();
router.use(attachUser);

/* ---------- Influencer: own profile + socials ---------- */
router.get('/influencers/me/profile', requireAuth, requireRole('influencer'), asyncHandler(getMyProfile));
router.put('/influencers/me/profile', requireAuth, requireRole('influencer'),
  asyncHandler(async (req, res, next) => {
    req.body = parseBody(profileUpdateSchema, req.body);
    next();
  }),
  asyncHandler(updateMyProfile));

router.get('/influencers/me/social', requireAuth, requireRole('influencer'), asyncHandler(listSocialAccounts));
router.post('/influencers/me/social', requireAuth, requireRole('influencer'),
  asyncHandler(async (req, res, next) => {
    req.body = parseBody(socialAccountSchema, req.body);
    next();
  }),
  asyncHandler(addSocialAccount));
router.delete('/influencers/me/social/:id', requireAuth, requireRole('influencer'), asyncHandler(removeSocialAccount));

/* ---------- Discovery (public to any authenticated brand/admin; influencer browsing allowed too) ---------- */
router.get('/influencers/search', requireAuth, asyncHandler(discoverySearch));
router.get('/influencers/:id', requireAuth, asyncHandler(getPublicProfile));

/* ---------- Shortlists (brand-only, owner-scoped) ---------- */
router.get('/shortlists', requireAuth, requireRole('brand'), asyncHandler(listShortlists));
router.post('/shortlists', requireAuth, requireRole('brand'),
  asyncHandler(async (req, res, next) => { req.body = parseBody(shortlistCreateSchema, req.body); next(); }),
  asyncHandler(createShortlist));
router.patch('/shortlists/:id', requireAuth, requireRole('brand'),
  asyncHandler(async (req, res, next) => { req.body = parseBody(shortlistCreateSchema.partial({ name: true }), req.body); next(); }),
  asyncHandler(renameShortlist));
router.delete('/shortlists/:id', requireAuth, requireRole('brand'), asyncHandler(deleteShortlist));
router.post('/shortlists/:id/items', requireAuth, requireRole('brand'),
  asyncHandler(async (req, res, next) => { req.body = parseBody(shortlistItemSchema, req.body); next(); }),
  asyncHandler(addToShortlist));
router.delete('/shortlists/:id/items/:itemId', requireAuth, requireRole('brand'), asyncHandler(removeFromShortlist));

export default router;
