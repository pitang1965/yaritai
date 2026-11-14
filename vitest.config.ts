import { defineConfig } from 'vitest/config';

// vite.config.ts（Cloudflare プラグイン入り）を読ませないため、テスト用は別にする。
export default defineConfig({ test: { include: ['src/**/*.test.ts'] } });
