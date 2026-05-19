import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({ prerenderEnvironment: 'node' }),
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
  },
  site: 'https://publicviewing.totalsportsasia.com',
  i18n: {
    defaultLocale: 'ms',
    locales: ['ms', 'en'],
    routing: { prefixDefaultLocale: true },
    fallback: { en: 'ms' },
  },
});
