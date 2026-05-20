# TSA Public Viewing Registration Portal

FIFA World Cup 2026 Malaysia public viewing authorisation portal for Total Sports Asia.

**Stack:** Astro 6 + Preact island + Tailwind CSS 4 — deployed to Cloudflare Workers (via Workers Assets).

---

## Local Development

```sh
cp .env.example .env.local   # fill in dev secrets
npm install
npm run dev                  # http://localhost:4321
```

## Build

```sh
npm run build
# Runs astro build, then scripts/postbuild.mjs to clean the generated wrangler config
```

## Project Structure

```
src/
  components/    Astro + Preact components
  i18n/          en.json + ms.json translation files
  layouts/       Base.astro layout
  lib/           email, rate-limit, turnstile service modules
  pages/
    api/         register.ts  — POST endpoint
    en/          English locale pages
    ms/          Bahasa Malaysia locale pages
  types/         Zod schema for form validation
  styles/        global.css
scripts/
  postbuild.mjs  Strips phantom SESSION/IMAGES bindings from generated wrangler config
.github/
  workflows/
    deploy.yml   GitHub Actions → Cloudflare Workers deployment
```

---

## Deployment

This project uses `@astrojs/cloudflare` v13 which outputs **Cloudflare Workers Assets** format.
Deployment is via **GitHub Actions** (`wrangler deploy`), NOT Cloudflare Pages CI/CD.

### Why not Cloudflare Pages CI/CD?

`@astrojs/cloudflare` v13 generates a Worker with an `ASSETS` binding for static files.
Cloudflare Pages CI/CD reserves the name `ASSETS` for its own internal use, so
`wrangler deploy` always fails in that environment. GitHub Actions runs outside the
Pages context, so the restriction doesn't apply.

### One-time setup

**1. Create a Cloudflare API token**

Cloudflare dashboard → My Profile → API Tokens → Create Token
→ Use the "Edit Cloudflare Workers" template → Create Token
→ Copy the token value

**2. Find your Cloudflare Account ID**

Cloudflare dashboard → Workers & Pages → any Worker → right sidebar shows Account ID

**3. Add GitHub repository secrets**

GitHub repo → Settings → Secrets and variables → Actions → New repository secret

| Secret name | Value |
|-------------|-------|
| `CLOUDFLARE_API_TOKEN` | token from step 1 |
| `CLOUDFLARE_ACCOUNT_ID` | account ID from step 2 |

**4. Disable Cloudflare Pages CI/CD for this project**

To avoid double-deployments, go to the Cloudflare Pages project → Settings →
Builds & Deployments → disable automatic deployments. Or delete the Pages project
once the Workers deployment is confirmed working.

**5. Set production secrets on the Worker**

After the first successful deploy, add runtime secrets via the Cloudflare dashboard:

Workers & Pages → tsa-publicviewing → Settings → Variables and Secrets

| Variable | Type | Description |
|----------|------|-------------|
| `RESEND_API_KEY` | Secret | Resend API key for email delivery |
| `BREVO_API_KEY` | Secret | Brevo API key (if using Brevo instead) |
| `NOTIFICATION_EMAIL` | Secret | TSA inbox for registration notifications |
| `TURNSTILE_SECRET_KEY` | Secret | Cloudflare Turnstile secret |
| `EMAIL_PROVIDER` | Plain text | `resend` or `brevo` |

**6. Custom domain**

Workers & Pages → tsa-publicviewing → Settings → Domains & Routes → Add custom domain
→ `publicviewing.totalsportsasia.com`

---

## Cloudflare Bindings

| Binding | Type | Required | Notes |
|---------|------|----------|-------|
| `RATE_LIMIT_KV` | KV namespace | Optional | Rate limiting (3/hr, 20/day per IP). API falls back silently if absent. Create in Workers & Pages → KV, then bind in Worker settings. |

---

## Environment Variables (Local)

Copy `.env.example` to `.env.local` for local dev. Never commit either file.

Required for local API testing:
- `RESEND_API_KEY` or `BREVO_API_KEY`
- `NOTIFICATION_EMAIL`
- `TURNSTILE_SECRET_KEY` (use a Turnstile test key for local dev)

---

## i18n

Two locales: `ms` (Bahasa Malaysia, default) and `en` (English).
Translation files: `src/i18n/ms.json` and `src/i18n/en.json`.
Routes: `/ms/` and `/en/` (both prefixed; `/` redirects to `/ms/`).

---

## Common Issues

| Issue | Fix |
|-------|-----|
| `ASSETS is reserved in Pages projects` | Don't use Cloudflare Pages CI/CD. Use GitHub Actions deploy workflow instead. |
| `SESSION` / `IMAGES` in generated wrangler.json | Handled automatically by `scripts/postbuild.mjs` after each build. |
| Rate limiting not working | Create a KV namespace and bind it as `RATE_LIMIT_KV` in Worker settings. |
| Emails not sending | Check that `RESEND_API_KEY` / `BREVO_API_KEY` and `NOTIFICATION_EMAIL` are set as Worker secrets. |
