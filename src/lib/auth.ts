import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { env } from 'cloudflare:workers';
import { createDb } from '../db';
import * as schema from '../db/schema';

// Workers ではバインディングがリクエスト中にしか使えないので、モジュール直下では作らない。
export function createAuth() {
  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(createDb(), { provider: 'sqlite', schema, transaction: false }),
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        prompt: 'select_account',
      },
    },
  });
}

/** ログイン中のユーザー ID。未ログインなら null。 */
export async function getUserId(headers: Headers): Promise<string | null> {
  const session = await createAuth().api.getSession({ headers });
  return session?.user.id ?? null;
}
