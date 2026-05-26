import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  output: 'server',
  // configPath passes wrangler.toml to the Cloudflare vite plugin so dev mode
  // workerd picks up compatibility_flags = ["nodejs_compat"] — without it, the
  // module runner in workerd fails to load CJS deps like picomatch.
  adapter: cloudflare({ prerenderEnvironment: 'node', configPath: 'wrangler.toml' }),
  integrations: [preact(), sitemap()],
  vite: {
    plugins: [tailwindcss(), {
      // @cloudflare/vite-plugin detects top-level Vite 8 (isRolldown=true) and puts the
      // worker entry in rolldownOptions.input instead of rollupOptions.input.
      // Astro uses Vite 7 which only reads rollupOptions.input, so we bridge the gap here.
      name: 'fix-cloudflare-rolldown-to-rollup-input',
      enforce: 'post',
      config(config) {
        const envs = config.environments ?? {};
        for (const [name, envConfig] of Object.entries(envs)) {
          const rolldownInput = envConfig?.build?.rolldownOptions?.input;
          if (rolldownInput) {
            envConfig.build.rollupOptions ??= {};
            envConfig.build.rollupOptions.input ??= rolldownInput;
          }
        }
      },
    }],
    resolve: {
      tsconfigPaths: false,
      alias: {
        cookie: fileURLToPath(new URL('./src/shims/cookie.js', import.meta.url)),
      },
    },
    // picomatch is CJS-only. With nodejs_compat enabled (via wrangler.toml configPath),
    // the workerd module runner can load it natively via import() without Vite's
    // __commonJSMin wrapper which breaks in workerd's eval context.
    ssr: {
      optimizeDeps: {
        exclude: ['picomatch'],
      },
    },
  },
  site: 'https://publicviewing.totalsportsasia.com',
  i18n: {
    defaultLocale: 'ms',
    locales: ['ms', 'en'],
    routing: { prefixDefaultLocale: true },
    fallback: { en: 'ms' },
  },
});
