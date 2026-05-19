# Lessons Learned

## Format: [date] | what went wrong | rule to prevent it

2026-05-19 | `npm create astro` won't scaffold into a non-empty directory | Scaffold to /tmp first, then copy files to target
2026-05-19 | `cookie` CJS package fails in Cloudflare Workerd's `runInlinedModule` | Create ESM shim at `src/shims/cookie.js` + alias it via `vite.resolve.alias`
2026-05-19 | `@tailwindcss/vite` triggers Rolldown's missing `tsconfigPaths` field error | Set `vite.resolve.tsconfigPaths: false` explicitly
2026-05-19 | Build fails: "rollupOptions.input should not be an html file when building for SSR" | Root cause: `@cloudflare/vite-plugin` imports top-level Vite 8 (`isRolldown=true`) and puts worker entry in `rolldownOptions.input`. Astro's Vite 7 reads `rollupOptions.input` → undefined → falls back to index.html. Fix: add `enforce: 'post'` Vite plugin that copies `rolldownOptions.input` → `rollupOptions.input` for each environment
