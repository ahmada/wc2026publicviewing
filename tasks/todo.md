# TSA Public Viewing — Task Tracker

## In Progress
(all phases complete — dev mode fully operational)

## Pending
- [ ] Post-deploy: Create Cloudflare KV namespace for rate limiting, add binding to wrangler.toml
- [ ] Post-deploy: Add CF Web Analytics beacon to Base.astro
- [ ] Post-deploy: Create `public/og-image.jpg` (1200×630 static OG image — placeholder used for now)
- [ ] Deploy: `wrangler pages publish dist` / Cloudflare Pages Git integration
- [ ] Production verify: Confirm `cloudflare:workers` env works correctly in production deploy

## Completed
- [x] Phase 0: Scaffolding (Astro + deps + configs)
- [x] Phase 1: Types + i18n + env.d.ts
- [x] Phase 2: Global styles (Tailwind 4 + design tokens)
- [x] Phase 3: Base layout + SVG decoratives
- [x] Phase 4: Static sections (Nav, Hero, Compliance, Who, HowItWorks, WhatsApp, Footer)
- [x] Phase 5: Email library (adapter + templates)
- [x] Phase 6: Security library (Turnstile + rate limiter)
- [x] Phase 7: Preact form island (9 steps)
- [x] Phase 8: API endpoint /api/register
- [x] Phase 9: Pages (ms/index, en/index, ms/privacy, en/privacy)
- [x] Phase 10: Build verified — `npm run build` passes, dist/_headers + _redirects + robots.txt present
- [x] Dev mode fix: picomatch CJS incompatibility resolved (configPath + optimizeDeps.exclude)
- [x] Dev mode fix: `locals.runtime.env` → `cloudflare:workers` env import
- [x] Dev mode fix: `handleSubmit` non-JSON error handling (try/catch around res.json())
- [x] Fee reference: Three-touch fee mention added (HowItWorks, StepWelcome, step 3 desc)
- [x] Dev verified: POST /api/register returns 400 TURNSTILE_FAILED (correct behavior)

## Build Fix Notes
Three build errors resolved:
1. `cookie` CJS → ESM shim (`src/shims/cookie.js` + vite alias)
2. Tailwind `tsconfigPaths` → `vite.resolve.tsconfigPaths: false`
3. `rollupOptions.input html` error → `fix-cloudflare-rolldown-to-rollup-input` Vite plugin (bridges @cloudflare/vite-plugin Vite 8 rolldownOptions to Vite 7 rollupOptions)

## Dev Mode Fix Notes
Three dev mode issues resolved (2026-05-20):
1. picomatch CJS → add `configPath: 'wrangler.toml'` to cloudflare adapter + `vite.ssr.optimizeDeps.exclude: ['picomatch']`
2. `locals.runtime.env` removed in Astro v6 → use `import { env as cfEnv } from 'cloudflare:workers'` in API routes
3. Non-JSON 501 response showing "Network error" → wrap `res.json()` in try/catch before `res.ok` check
