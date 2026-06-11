import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// On GitHub Pages the app is served from /peak-state/; everywhere else
// (Cloudflare, local dev) it's served from the root.
export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/peak-state/' : '/',
  plugins: [react()],
});
