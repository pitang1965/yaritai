import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { and, count, eq } from 'drizzle-orm';
import { z } from 'zod';
import { createDb } from '../db';
import { items, settings } from '../db/schema';
import { CATEGORIES } from '../domain/ideas';
import { COST, DEFAULT_SETTINGS, type Item, PRI, type Settings, TARGETS, WHEN } from '../domain/item';
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

async function requireUser(): Promise<string> {
  const uid = await getUserId(getRequest().headers);
  if (!uid) throw new Error('ログインしてください');
  return uid;
}

export type MyData =
  | { signedIn: false }
  | { signedIn: true; name: string; items: Item[]; settings: Settings };

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
    name: session.user.name,
    items: rows.map(({ userId: _, ...it }) => it as Item),
    settings: s ? { target: s.target, birth: s.birth, until: s.until } : DEFAULT_SETTINGS,
  };
});

/** 項目の追加・更新（同じ ID があれば上書き。他人の項目は書き換えない）。 */
export const saveItem = createServerFn({ method: 'POST' })
  .validator(itemSchema)
  .handler(async ({ data }) => {
    const uid = await requireUser();
    const db = createDb();
    const [{ n }] = await db.select({ n: count() }).from(items).where(eq(items.userId, uid));
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
