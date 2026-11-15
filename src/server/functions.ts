import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { and, count, eq, ne } from 'drizzle-orm';
import { z } from 'zod';
import { createDb } from '../db';
import { items, settings } from '../db/schema';
import { CATEGORIES } from '../domain/ideas';
import {
  COST,
  DEFAULT_PUBLISH,
  DEFAULT_SETTINGS,
  isPublic,
  type Item,
  PRI,
  type Publish,
  SCOPES,
  type Scope,
  type Settings,
  sortItems,
  TARGETS,
  WHEN,
} from '../domain/item';
import { createAuth, getUserId } from '../lib/auth';

const MAX_ITEMS = 2000;

const keys = <T extends { key: string }>(a: readonly T[]) =>
  a.map((x) => x.key) as [T['key'], ...T['key'][]];

const itemSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().trim().min(1).max(80),
  cat: z.enum(keys(CATEGORIES)),
  pri: z.enum(keys(PRI)),
  when: z.enum(keys(WHEN)),
  cost: z
    .number()
    .int()
    .refine((n) => COST.some((c) => c.key === n))
    .nullable(),
  memo: z.string().max(500),
  doneAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  pick: z.boolean(),
  src: z.string().max(64).nullable(),
  hidden: z.boolean(),
  createdAt: z.number().int(),
});

const settingsSchema = z.object({
  target: z
    .number()
    .int()
    .refine((n) => (TARGETS as readonly number[]).includes(n)),
  birth: z.number().int().min(1900).max(2100).nullable(),
  until: z.number().int().min(40).max(120),
});

const publishSchema = z.object({
  on: z.boolean(),
  scope: z.enum(keys(SCOPES)),
  name: z.string().trim().max(30),
});

/** 公開リンクの文字列。128ビットの乱数を base64url にした22文字。 */
const newToken = () =>
  btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
const TOKEN_RE = /^[A-Za-z0-9_-]{22}$/;

type SettingsRow = typeof settings.$inferSelect;
const toPublish = (s: SettingsRow | undefined): Publish =>
  s ? { on: s.pubOn, scope: s.pubScope as Scope, name: s.pubName, token: s.pubToken } : DEFAULT_PUBLISH;

async function requireUser(): Promise<string> {
  const uid = await getUserId(getRequest().headers);
  if (!uid) throw new Error('ログインしてください');
  return uid;
}

export type MyData =
  | { signedIn: false }
  | { signedIn: true; items: Item[]; settings: Settings; publish: Publish };

export const fetchMyData = createServerFn({ method: 'GET' }).handler(async (): Promise<MyData> => {
  const session = await createAuth().api.getSession({ headers: getRequest().headers });
  if (!session) return { signedIn: false };
  const uid = session.user.id;
  const db = createDb();
  const [rows, [s]] = await Promise.all([
    db.select().from(items).where(eq(items.userId, uid)),
    db.select().from(settings).where(eq(settings.userId, uid)),
  ]);
  return {
    signedIn: true,
    items: rows.map(({ userId: _, ...it }) => it as Item),
    settings: s ? { target: s.target, birth: s.birth, until: s.until } : DEFAULT_SETTINGS,
    publish: toPublish(s),
  };
});

/** 項目の追加・更新（同じ ID があれば上書き。他人の項目は書き換えない）。 */
export const saveItem = createServerFn({ method: 'POST' })
  .validator(itemSchema)
  .handler(async ({ data }) => {
    const uid = await requireUser();
    const db = createDb();
    const [{ n }] = await db.select({ n: count() }).from(items)
      .where(and(eq(items.userId, uid), ne(items.id, data.id))); // 更新は数えない
    if (n >= MAX_ITEMS) throw new Error(`項目は${MAX_ITEMS}件までです`);
    const { id, ...rest } = data;
    await db
      .insert(items)
      .values({ ...data, userId: uid })
      .onConflictDoUpdate({ target: items.id, set: rest, setWhere: eq(items.userId, uid) });
  });

export const deleteItem = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().min(1).max(64) }))
  .handler(async ({ data }) => {
    const uid = await requireUser();
    await createDb()
      .delete(items)
      .where(and(eq(items.id, data.id), eq(items.userId, uid)));
  });

export const saveSettings = createServerFn({ method: 'POST' })
  .validator(settingsSchema)
  .handler(async ({ data }) => {
    const uid = await requireUser();
    await createDb()
      .insert(settings)
      .values({ ...data, userId: uid })
      .onConflictDoUpdate({ target: settings.userId, set: data });
  });

/** 公開リンクの設定を保存する。初めてオンにしたときだけ URL の文字列を作る。 */
export const savePublish = createServerFn({ method: 'POST' })
  .validator(publishSchema)
  .handler(async ({ data }): Promise<Publish> => {
    const uid = await requireUser();
    const db = createDb();
    const [cur] = await db.select().from(settings).where(eq(settings.userId, uid));
    const set = {
      pubOn: data.on,
      pubScope: data.scope,
      pubName: data.name,
      pubToken: cur?.pubToken ?? (data.on ? newToken() : null),
    };
    const [row] = await db
      .insert(settings)
      .values({ ...set, userId: uid })
      .onConflictDoUpdate({ target: settings.userId, set })
      .returning();
    return toPublish(row);
  });

/** URL を作り直す。古い URL はすぐ見られなくなる。 */
export const renewPublishToken = createServerFn({ method: 'POST' }).handler(async (): Promise<Publish> => {
  const uid = await requireUser();
  const pubToken = newToken();
  const [row] = await createDb()
    .insert(settings)
    .values({ userId: uid, pubToken })
    .onConflictDoUpdate({ target: settings.userId, set: { pubToken } })
    .returning();
  return toPublish(row);
});

/** 公開ページに出す項目（メモ・本気度・時期・費用は送らない）。 */
export type PublicItem = Pick<Item, 'id' | 'title' | 'cat' | 'doneAt' | 'pick'>;
export type PublicList = { name: string; scope: Scope; items: PublicItem[]; origin: string } | null;

/** 公開リンクの中身。ログイン不要。オフや存在しない URL なら null。 */
export const fetchPublicList = createServerFn({ method: 'GET' })
  .validator(z.object({ token: z.string().max(64) }))
  .handler(async ({ data }): Promise<PublicList> => {
    if (!TOKEN_RE.test(data.token)) return null;
    const db = createDb();
    const [s] = await db
      .select()
      .from(settings)
      .where(and(eq(settings.pubToken, data.token), eq(settings.pubOn, true)));
    if (!s) return null;
    const scope = s.pubScope as Scope;
    const rows = await db.select().from(items).where(eq(items.userId, s.userId));
    return {
      name: s.pubName,
      scope,
      items: sortItems(rows.filter((x) => isPublic(x, scope)) as Item[]).map(({ id, title, cat, doneAt, pick }) => ({
        id,
        title,
        cat,
        doneAt,
        pick,
      })),
      origin: new URL(getRequest().url).origin,
    };
  });
