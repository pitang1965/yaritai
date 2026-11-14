import { defineConfig } from 'drizzle-kit';

// マイグレーション SQL の生成だけに使う（適用は wrangler d1 migrations apply）。
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  out: './drizzle',
});
