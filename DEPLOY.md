# Deploying EZ Ads

The app ships as **one service**: the Express API in `server/` also serves the built React
site from `client/dist`, so the SPA and `/api` share an origin (no CORS, no `VITE_API_URL`).
Anything that runs one Node process with a public HTTPS port can host it.

## What is already prepared in the repo

- `npm run build` (root) — installs client deps **including dev** (Vite lives there), builds
  the SPA, then installs server production deps.
- `npm start` (root) — runs `server/` so `client/dist` resolves via
  `path.resolve(process.cwd(), '../client/dist')` in `server/src/app.js`, and
  `process.env.PORT` is honored by `server/src/server.js`.
- `npm run pack:deploy` — stages only what the host needs and writes `deploy.zip` with
  `package.json` at the archive root. It skips `node_modules`, `.env*`, `tmp/`,
  `preview/`, `screenshot*.png`, and any prebuilt `client/dist`.

Verified locally in production mode: `/api/health` returns `ok:true`, `/pricing` returns the
SPA, `/favicon.svg` returns 200, and unknown `/api/*` routes return JSON (not HTML).

## What only you can do

I have no access to your GoDaddy account, MongoDB Atlas, Meta dashboard, or email mailbox.
Those steps are yours; everything below is exact so you are not guessing.

### 1. Confirm the hosting product

GoDaddy → **My Products → Web Hosting**. Look for **Node.js Hosting** / an app slot
(Economy allows 1 published app). If you only see cPanel/PHP, or you bought
**Website Builder**, use [Render](#fallback-render) instead.

### 2. Database — MongoDB Atlas (free M0)

1. https://www.mongodb.com/cloud/atlas/register → M0 cluster, nearest region.
2. **Database Access** → user + strong password (avoid `@ : / ?` in the password).
3. **Network Access** → allow `0.0.0.0/0` (host egress IPs are not published).
4. Copy the connection string and add the db name:
   `mongodb+srv://user:pass@cluster0.xxxx.mongodb.net/ezads?retryWrites=true&w=majority`

### 3. Secrets

```bash
cd server
npm run gen:secrets
```

Paste the three values into the host's environment. In production the server **refuses to
start** on the repo's dev defaults — confirmed:
`[env] FATAL: refusing to start in production — default dev secrets in use`.

### 4. Environment variables on the host

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `MONGODB_URI` | Atlas string from step 2 |
| `CLIENT_ORIGIN` | `https://yourdomain.com` (exact, no trailing slash) |
| `JWT_SECRET` | from `gen:secrets` |
| `OAUTH_STATE_SECRET` | from `gen:secrets` |
| `TOKEN_ENC_KEY` | from `gen:secrets` |
| `META_APP_ID` / `META_APP_SECRET` | Instagram app id + secret |
| `META_REDIRECT_URI` | `https://yourdomain.com/api/auth/instagram/callback` |
| `OAUTH_MOCK_MODE` | `false` |
| `RESEND_API_KEY` | from resend.com — **required on Render's free plan** (see below) |
| `EMAIL_HOST` | `smtpout.secureserver.net` (SMTP fallback; blocked on Render free) |
| `EMAIL_PORT` | `465` (falls back to `587` if 465 is blocked) |
| `EMAIL_USER` / `EMAIL_PASS` | your GoDaddy mailbox + its password |
| `EMAIL_FROM` | `EZ Ads <you@yourdomain.com>` (must be a verified sender domain) |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | only if you want image uploads |

Do **not** set `PORT`; the platform injects it. Never commit or zip a `.env`.

**Email on Render's free plan:** free web services cannot open outbound SMTP
connections to ports 25, 465 or 587 (Render changelog, 26 September 2025), so
GoDaddy SMTP times out in production even though it works on your laptop —
verification and password-reset mails are simply never sent. Fix: create a
Resend API key, verify `yourdomain.com` there (add the DNS records they show at
GoDaddy — this also fixes Gmail spam filtering), set `RESEND_API_KEY` in the
Render dashboard, and redeploy. `GET /api/health` reports `email.provider`
(`resend` / `smtp` / `none`) and the last send error, so you can confirm it.

### 5. Build, pack, deploy

```bash
# optional: the social-preview tags (og:url/og:image) are baked in at build time
# SITE_URL=https://yourdomain.com npm run build

npm run pack:deploy          # writes deploy.zip (~0.5 MB, 133 files)
```

Then either:

- **Dashboard:** Web Hosting → Node.js Hosting → create app → upload `deploy.zip` →
  open the private preview URL → attach your hosting plan → **Publish**.
- **CLI:**
  ```bash
  gddy auth login
  gddy hosting app create --app-type NODEJS --name ez-ads
  gddy hosting source upload --app-id <APP_ID> --file ./deploy.zip
  gddy hosting app get --app-id <APP_ID>      # preview URL
  gddy hosting log list --app-id <APP_ID>     # startup errors show here
  gddy hosting subscription attach --app-id <APP_ID> --subscription-id <SUB_ID>
  gddy hosting deployment publish --app-id <APP_ID>
  ```

If the preview fails, the log says which of three things broke: `client/dist not found`
(build step), Mongo refused (Atlas network access), or the prod-secrets fail-fast.

### 6. Domain + email

Connect the domain in the hosting dashboard (SSL is automatic). Manual DNS alternative:
`A @` → host IP, `CNAME www` → host hostname. **Leave `MX`, `SPF`, DKIM and DMARC alone** —
that is what keeps your GoDaddy email working.

### 7. Verify, then create your admin

```bash
curl https://yourdomain.com/api/health   # ok:true, db:"connected", oauthMode:"live"
```

Sign up a brand account and confirm the verification email arrives, then seed the admin from
your laptop against Atlas (the host gives you no shell):

```bash
cd server
MONGODB_URI="mongodb+srv://..." npm run seed:admin -- --email you@yourdomain.com --password 'Str0ngPass!'
```

### 8. Point Meta at the live callback

Meta app → Instagram → API setup with Instagram login → **Business login settings**: add
`https://yourdomain.com/api/auth/instagram/callback` (keeping the localhost URI). Public
(logged-out) users still need Advanced Access + App Review + Business Verification.

## Known limits of this setup

- Atlas M0 has **no backups** — `mongodump` before real users.
- Socket.IO may be forced to polling behind the host's proxy/CDN; test chat after deploy.
- Redeploying = re-run `npm run pack:deploy`, upload, publish.
- Root `package.json` also lists ~20 packages under `dependencies` that are really
  `concurrently`'s transitive deps (from an accidental install). Harmless — the server has
  its own dependency tree — but they can be deleted.

## Fallback: Render

`render.yaml` exists for a single-service deploy. Render's free web service sleeps when idle,
and its blueprint `databases:` block no longer provisions MongoDB — set `MONGODB_URI` from
Atlas manually. Build: `npm ci && cd ../client && npm ci --include=dev && npm run build`,
Start: `node src/server.js`, root dir `server`. Add the custom domain in Render and create the
`A`/`CNAME` records it shows at GoDaddy.
