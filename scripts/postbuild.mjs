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

// Strip configPath / userConfigPath — these point back to root wrangler.toml which
// wrangler merges at deploy time. That merge re-introduces pages_build_output_dir,
// causing wrangler to create a reserved ASSETS binding and break the Worker deploy.
delete config.configPath;
delete config.userConfigPath;

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

// Remove pages_build_output_dir — causes wrangler to treat this as a Pages project,
// which reserves the ASSETS name and blocks the Workers Assets binding.
if (config.pages_build_output_dir) delete config.pages_build_output_dir;

writeFileSync(path, JSON.stringify(config, null, 2));
console.log('[postbuild] Cleaned dist/server/wrangler.json');
