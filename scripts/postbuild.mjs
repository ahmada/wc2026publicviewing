/**
 * Strips phantom bindings that @astrojs/cloudflare auto-adds but have no
 * corresponding Cloudflare account resources:
 *
 *   - SESSION KV (added by Astro sessions — we don't use sessions)
 *   - IMAGES binding (added from @cloudflare/workers-types)
 *
 * Run automatically as "postbuild" via npm scripts after `astro build`.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const path = 'dist/server/wrangler.json';

if (!existsSync(path)) {
  console.log('[postbuild] dist/server/wrangler.json not found — skipping');
  process.exit(0);
}

const config = JSON.parse(readFileSync(path, 'utf-8'));

// Remove KV namespaces with no id (phantom entries with no real resource)
if (Array.isArray(config.kv_namespaces)) {
  config.kv_namespaces = config.kv_namespaces.filter((kv) => kv.id);
  if (config.kv_namespaces.length === 0) delete config.kv_namespaces;
}

// Mirror cleanup for preview environment
if (config.previews?.kv_namespaces) {
  config.previews.kv_namespaces = config.previews.kv_namespaces.filter((kv) => kv.id);
  if (config.previews.kv_namespaces.length === 0) delete config.previews.kv_namespaces;
}

// Remove auto-detected Images binding (no Cloudflare Images account resource)
if (config.images) delete config.images;
if (config.previews?.images) delete config.previews.images;

// Remove pages_build_output_dir — inherited from wrangler.toml, causes wrangler deploy
// to auto-create an ASSETS binding which is reserved and rejected in Pages projects
if (config.pages_build_output_dir) delete config.pages_build_output_dir;

// Remove any ASSETS binding (belt-and-suspenders)
if (config.assets) delete config.assets;

writeFileSync(path, JSON.stringify(config, null, 2));
console.log('[postbuild] Cleaned dist/server/wrangler.json');
