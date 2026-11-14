import { describe, expect, it } from 'vitest';
import { IDEAS } from './ideas';
import { type Item, norm, pickMessage, sortItems, yearsLeft } from './item';

const item = (o: Partial<Item>): Item => ({
  id: 'x',
  title: 't',
  cat: 'travel',
  pri: 'want',
  when: 'any',
  cost: null,
  memo: '',
  doneAt: null,
  pick: false,
  src: null,
  createdAt: 0,
  ...o,
});

describe('sortItems', () => {
  it('未達成→本気度→時期→新しい順', () => {
    const list = [
      item({ id: 'done', doneAt: '2026-01-01', pri: 'must' }),
      item({ id: 'old', createdAt: 1 }),
      item({ id: 'new', createdAt: 2 }),
      item({ id: 'year', when: 'year' }),
      item({ id: 'must', pri: 'must' }),
    ];
    expect(sortItems(list).map((x) => x.id)).toEqual(['must', 'year', 'new', 'old', 'done']);
  });
});

describe('yearsLeft', () => {
  it('生まれた年がなければ null、あれば目安までの年数（0未満にしない）', () => {
    expect(yearsLeft({ target: 10, birth: null, until: 85 }, 2026)).toBeNull();
    expect(yearsLeft({ target: 10, birth: 1975, until: 85 }, 2026)).toBe(34);
    expect(yearsLeft({ target: 10, birth: 1930, until: 85 }, 2026)).toBe(0);
  });
});

describe('pickMessage', () => {
  it('残り年数と未達成の厳選からペースを出す', () => {
    const items = [item({ pick: true }), item({ pick: true, doneAt: '2026-01-01' })];
    expect(pickMessage(items, { target: 2, birth: 1975, until: 85 }, 34)).toBe(
      '厳選がそろいました。達成 1/2 件。 残り約34年なので、だいたい34年に1件のペースです。',
    );
  });
});

describe('norm', () => {
  it('空白と句読点を無視する', () => {
    expect(norm('オーロラを 見る。')).toBe(norm('オーロラを見る'));
  });
});

describe('IDEAS', () => {
  it('ID とタイトルが重複せず、ID はカテゴリで始まる', () => {
    expect(new Set(IDEAS.map((x) => x.id)).size).toBe(IDEAS.length);
    expect(new Set(IDEAS.map((x) => x.title)).size).toBe(IDEAS.length);
    for (const x of IDEAS) expect(x.id.startsWith(`${x.cat}-`)).toBe(true);
  });
});
