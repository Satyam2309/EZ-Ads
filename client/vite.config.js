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
      '/api': { target: 'http://localhost:5000', changeOrigin: true }
    }
  }
});
