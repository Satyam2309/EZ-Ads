import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Social preview tags (og:image, og:url) only work with absolute URLs, so
 * index.html holds a %SITE_URL% placeholder instead of a hostname. Override it
 * per deploy with SITE_URL (or VITE_SITE_URL); the fallback is the Render
 * hostname render.yaml deploys to.
 */
const SITE_URL = (
  process.env.SITE_URL ||
  process.env.VITE_SITE_URL ||
  'https://ezads-api.onrender.com'
).replace(/\/+$/, '');

const siteUrlPlugin = {
  name: 'ezads-site-url',
  transformIndexHtml(html) {
    return html.replaceAll('%SITE_URL%', SITE_URL);
  }
};

export default defineConfig({
  plugins: [react(), tailwindcss(), siteUrlPlugin],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        // `npm run dev` starts a local API on 5000, so that is the default.
        // Point VITE_API_TARGET at the deployed API to test against it instead —
        // the server's origin guard rejects a localhost origin, so logging in
        // against production from here can never work.
        target: process.env.VITE_API_TARGET || 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      }
    }
  }
});
