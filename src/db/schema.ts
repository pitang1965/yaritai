import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

const nowMs = sql`(cast(unixepoch('subsecond') * 1000 as integer))`;

// --- better-auth が使うテーブル（user / session / account / verification） ---

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(nowMs),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(nowMs)
    .$onUpdate(() => new Date()),
});

export const session = sqliteTable(
  'session',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(nowMs),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [index('session_user_id_idx').on(t.userId)],
);

export const account = sqliteTable(
  'account',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    providerId: text('provider_id').notNull(),
    accountId: text('account_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp_ms' }),
    refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp_ms' }),
    scope: text('scope'),
    password: text('password'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(nowMs),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [index('account_user_id_idx').on(t.userId)],
);

export const verification = sqliteTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(nowMs),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(nowMs)
      .$onUpdate(() => new Date()),
  },
  (t) => [index('verification_identifier_idx').on(t.identifier)],
);

// --- アプリのテーブル ---

/** マイリストの項目。達成は done_at が入っているかどうかで表す。 */
export const items = sqliteTable(
  'items',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    cat: text('cat').notNull(),
    pri: text('pri').notNull().default('want'),
    when: text('when_by').notNull().default('any'),
    cost: integer('cost'),
    memo: text('memo').notNull().default(''),
    doneAt: text('done_at'),
    pick: integer('pick', { mode: 'boolean' }).notNull().default(false),
    src: text('src'),
    hidden: integer('hidden', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('items_user_id_idx').on(t.userId)],
);

export const settings = sqliteTable('settings', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  target: integer('target').notNull().default(10),
  birth: integer('birth'),
  until: integer('until').notNull().default(85),
  // 公開リンク。token はオフにしても残し、オンに戻すと同じURLになる。
  pubOn: integer('pub_on', { mode: 'boolean' }).notNull().default(false),
  pubScope: text('pub_scope').notNull().default('all'),
  pubName: text('pub_name').notNull().default(''),
  pubToken: text('pub_token').unique(),
});
