# TSA Public Viewing — Task Tracker

## In Progress
(all phases complete — build passing)

## Pending
- [ ] Post-deploy: Create Cloudflare KV namespace for rate limiting, add binding to wrangler.toml
- [ ] Post-deploy: Add CF Web Analytics beacon to Base.astro
- [ ] Post-deploy: Create `public/og-image.jpg` (1200×630 static OG image — placeholder used for now)
- [ ] Dev test: Walk all 9 form steps, verify POST reaches /api/register
- [ ] Deploy: `wrangler pages publish dist` / Cloudflare Pages Git integration

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

## Build Fix Notes
Three build errors resolved:
1. `cookie` CJS → ESM shim (`src/shims/cookie.js` + vite alias)
2. Tailwind `tsconfigPaths` → `vite.resolve.tsconfigPaths: false`
3. `rollupOptions.input html` error → `fix-cloudflare-rolldown-to-rollup-input` Vite plugin (bridges @cloudflare/vite-plugin Vite 8 rolldownOptions to Vite 7 rollupOptions)
