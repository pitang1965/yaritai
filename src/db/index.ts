import { env } from 'cloudflare:workers';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

// D1 バインディングは process.env には出てこないので、Workers の ambient env から取る。
export function createDb() {
  return drizzle(env.DB, { schema });
}
