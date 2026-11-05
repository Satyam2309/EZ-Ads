# EZ Ads — Premium Influencer Marketing Marketplace

MERN marketplace connecting brands with Instagram influencers.

- Influencers sign in via official **Meta/Instagram OAuth** (Business Login for Instagram, professional accounts only).
- Brands register with email + password, verified by email, with reset flow and rate limiting.
- Core feature: brand-side **influencer discovery** with search, filters, shortlists, and campaign invites.
- Campaigns, applications, invitations, agreements, chat (Socket.IO), simulated payments, admin dashboard.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite, Tailwind CSS, React Router, Zod, axios |
| Backend | Node.js + Express, Socket.IO |
| Database | MongoDB (Atlas) + Mongoose |
| Auth | Meta OAuth + JWT httpOnly sessions, bcrypt |
| Images | Cloudinary |
| Tests | Vitest + Supertest |

## Quick start (Windows, from repo root)

```bash
npm run install:all
copy .env.example server\.env
:: edit server/.env — set MONGODB_URI (Atlas) and JWT_SECRET
npm run dev
```

- Backend: http://localhost:5000 (health: `GET /api/health`)
- Frontend: http://localhost:5173

## Folder structure

```
server/   Express API — routes / controllers / services / models / middleware / validators / sockets / utils / tests
client/   React SPA — pages / components / layouts / hooks / context / api / validators
```

## Admin provisioning (no public admin signup)

Admins exist only through the server-side script — never register them via an API.

```bash
cd server
npm run seed:admin -- --email ops@example.com --password 'Str0ngPass!'   # or set ADMIN_INITIAL_EMAIL / ADMIN_INITIAL_PASSWORD and run without flags
```

- Idempotent: an existing admin is untouched; pass `--reset` to replace only the password.
- In production the password must be ≥ 12 chars with letters + numbers.
- Every provisioning attempt is recorded in the append-only audit log.
- Log in at `/admin/login`; the console covers users/suspensions, reports, the simulated ledger and the audit trail.

## Deployment (Render — `render.yaml` at repo root)

The API process serves both the backend and the built SPA (in production Express serves `client/dist`), so one service handles everything:

1. Push the repo, then in Render: **New → Blueprint** → select this repo (renders from `render.yaml`).
2. Set the `sync: false` env vars when prompted: `ADMIN_INITIAL_EMAIL` / `ADMIN_INITIAL_PASSWORD`, optionally Meta OAuth and SMTP values (leave Meta empty to stay in clearly-labeled mock mode).
3. Once deployed, run the one-off `ezads-provision-admin` job (or use the Render shell: `npm run seed:admin`) — then **delete** those env vars.
4. Update `CLIENT_ORIGIN` (and `META_REDIRECT_URI`) to the final `https://<your-service>.onrender.com` origin.
5. In the Meta app settings add the production redirect URI (`/api/auth/instagram/callback`); Advanced Access is still required for real (non-test) users.

Health check: `GET /api/health`. Logs, scaling and zero-downtime deploys are managed by Render; the MongoDB connection string comes from the managed database resource.

## Status

See `PHASE_CHECKLIST.md` for the live feature checklist.
