import type { CategoryKey } from './ideas';

export const PRI = [
  { key: 'must', name: '絶対' },
  { key: 'want', name: 'できれば' },
  { key: 'someday', name: 'いつか' },
] as const;
export const WHEN = [
  { key: 'year', name: '今年' },
  { key: '5y', name: '5年以内' },
  { key: '10y', name: '10年以内' },
  { key: 'any', name: 'いつでも' },
] as const;
export const COST = [
  { key: 0, name: 'ほぼ0円' },
  { key: 1, name: '〜1万円' },
  { key: 2, name: '〜10万円' },
  { key: 3, name: '10万円〜' },
] as const;
export const TARGETS = [5, 10, 20, 30, 50, 100] as const;

export type Pri = (typeof PRI)[number]['key'];
export type When = (typeof WHEN)[number]['key'];
export type Cost = (typeof COST)[number]['key'];

/** マイリストの項目。 */
export interface Item {
  id: string;
  title: string;
  cat: CategoryKey;
  pri: Pri;
  when: When;
  cost: Cost | null;
  memo: string;
  /** 達成した日（YYYY-MM-DD）。未達成なら null。 */
  doneAt: string | null;
  /** 厳選に入っているか。 */
  pick: boolean;
  /** アイデア集から取り込んだ場合のアイデア ID。 */
  src: string | null;
  /** 非公開（公開リンクでは見せない）。 */
  hidden: boolean;
  createdAt: number;
}

export interface Settings {
  /** 厳選する件数の上限。 */
  target: number;
  birth: number | null;
  until: number;
}

export const SCOPES = [
  { key: 'all', name: '全部' },
  { key: 'pick', name: '厳選' },
] as const;
export type Scope = (typeof SCOPES)[number]['key'];

/** 公開リンクの設定。token は止めても消さず、オンに戻すと同じURLになる。 */
export interface Publish {
  on: boolean;
  scope: Scope;
  /** 表示名。空なら名前を出さない。 */
  name: string;
  token: string | null;
}

export const DEFAULT_PUBLISH: Publish = { on: false, scope: 'all', name: '', token: null };

/** 公開リンクに出る項目か（非公開は公開範囲より優先）。 */
export const isPublic = (it: Pick<Item, 'hidden' | 'pick'>, scope: Scope) =>
  !it.hidden && (scope === 'all' || it.pick);

/** 公開ページのタイトル（OGP にも使う）。 */
export const publicTitle = (name: string) =>
  name ? `${name} の死ぬまでにやりたいこと` : '死ぬまでにやりたいこと';

/** 公開ページの OGP 説明文。items は表示順に並んでいること。 */
export function publicDescription(items: Pick<Item, 'title' | 'doneAt'>[]): string {
  if (!items.length) return 'まだ公開されている項目はありません。';
  const done = items.filter((x) => x.doneAt).length;
  const head = items.slice(0, 3).map((x) => x.title).join('／');
  return `${items.length}件のうち${done}件を達成。${head}${items.length > 3 ? '／…' : ''}`;
}

export const DEFAULT_SETTINGS: Settings = { target: 10, birth: null, until: 85 };

/** 同じ項目かどうかを比べるためのタイトル（空白と句読点を除く）。 */
export const norm = (s: string) =>
  s.replace(/\s+/g, '').replace(/[。．.、，,!！?？]/g, '').toLowerCase();

const PRI_RANK: Record<Pri, number> = { must: 0, want: 1, someday: 2 };
const WHEN_RANK: Record<When, number> = { year: 0, '5y': 1, '10y': 2, any: 3 };

/** 未達成が先、次に本気度、次に時期、最後は新しい順。 */
export function sortItems(items: Item[]): Item[] {
  return [...items].sort(
    (a, b) =>
      Number(!!a.doneAt) - Number(!!b.doneAt) ||
      PRI_RANK[a.pri] - PRI_RANK[b.pri] ||
      WHEN_RANK[a.when] - WHEN_RANK[b.when] ||
      b.createdAt - a.createdAt,
  );
}

/** 目安の年齢までの残り年数。生まれた年が未設定なら null。 */
export function yearsLeft(s: Settings, thisYear = new Date().getFullYear()): number | null {
  if (!s.birth) return null;
  return Math.max(0, s.birth + s.until - thisYear);
}

/** 厳選画面の案内文。 */
export function pickMessage(items: Item[], s: Settings, years: number | null): string {
  const picks = items.filter((x) => x.pick);
  const done = picks.filter((x) => x.doneAt).length;
  let msg =
    picks.length < s.target
      ? `あと${s.target - picks.length}件、マイリストから ★ で選びましょう。`
      : `厳選がそろいました。達成 ${done}/${s.target} 件。`;
  if (years != null && years > 0) {
    const rest = s.target - done;
    msg +=
      rest > 0
        ? ` 残り約${years}年なので、だいたい${Math.round((years / rest) * 10) / 10}年に1件のペースです。`
        : ` 残り約${years}年。すべて達成済みです。`;
  }
  return msg;
}

export const today = () => new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD（端末の日付）
