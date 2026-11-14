import { cloudflare } from '@cloudflare/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// 開発（vite dev）は wrangler.jsonc の D1 をローカル（Miniflare）で動かす。本番 D1 には触れない。
export default defineConfig({
  plugins: [
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tailwindcss(),
    tanstackStart(),
    react(),
  ],
  // Google OAuth のリダイレクト先（http://localhost:3000/api/auth/callback/google）と一致させる。
  server: { port: 3000, strictPort: true },
});
