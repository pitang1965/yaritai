import { useRouter } from '@tanstack/react-router';
import { type ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CATEGORIES, type CategoryKey, IDEAS, type Idea } from '../domain/ideas';
import {
  COST,
  type Item,
  norm,
  PRI,
  pickMessage,
  type Publish,
  type Settings,
  sortItems,
  today,
  WHEN,
  yearsLeft,
} from '../domain/item';
import { deleteItem, renewPublishToken, saveItem, savePublish, saveSettings } from '../server/functions';
import { EditSheet, PublishSheet, SettingsSheet } from './sheets';

type Tab = 'find' | 'mine' | 'pick';
type Toast = { msg: string; action?: { label: string; fn: () => void } };

const CAT = Object.fromEntries(CATEGORIES.map((c) => [c.key, c])) as Record<
  CategoryKey,
  (typeof CATEGORIES)[number]
>;


export function App(props: { items: Item[]; settings: Settings; publish: Publish }) {
  const router = useRouter();
  const [items, setItems] = useState(props.items);
  const [settings, setSettings] = useState(props.settings);
  const [publish, setPublish] = useState(props.publish);
  // 並び順と絞り込みに使う一覧。達成の切り替え直後は少し遅らせ、行がすぐ消えて「効かない」ように見えるのを防ぐ。
  const [settled, setSettled] = useState(props.items);
  const settleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [tab, setTab] = useState<Tab>('find');
  // タブごとのスクロール位置。戻ってきたときに同じ位置から続きを見られるようにする。
  const scrollPos = useRef<Partial<Record<Tab, number>>>({});
  // scrollTo は新しめのブラウザで Promise を返すので、戻り値を effect から返さない（React が片付け関数と誤解する）
  useLayoutEffect(() => {
    window.scrollTo(0, scrollPos.current[tab] ?? 0);
  }, [tab]);
  const [editing, setEditing] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [sync, setSync] = useState('保存済み（どの端末でも同じリスト）');

  const showToast = (t: Toast) => {
    setToast(t);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), t.action ? 4000 : 1800);
  };

  const commit = (next: Item[], delay = false) => {
    setItems(next);
    clearTimeout(settleTimer.current);
    if (delay) settleTimer.current = setTimeout(() => setSettled(next), 900);
    else setSettled(next);
  };

  // サーバーへの保存。届く順が入れ替わらないよう1件ずつ順に送る。
  // 失敗したらサーバーの状態を読み直す（画面と食い違ったままにしない）。
  const queue = useRef<Promise<void>>(Promise.resolve());
  const persist = (send: () => Promise<unknown>) => {
    setSync('保存中…');
    queue.current = queue.current.then(async () => {
      try {
        await send();
        setSync('保存済み（どの端末でも同じリスト）');
      } catch {
        setSync('保存できませんでした。読み直しています…');
        showToast({ msg: '保存できませんでした' });
        await router.invalidate();
      }
    });
  };

  // 画面の読み直し（router.invalidate）で届いた最新データに合わせる。
  useEffect(() => {
    setItems(props.items);
    setSettled(props.items);
    setSettings(props.settings);
    setPublish(props.publish);
  }, [props.items, props.settings, props.publish]);

  const findBySrc = (src: string) => items.find((x) => x.src === src);
  const findByTitle = (t: string) => items.find((x) => norm(x.title) === norm(t));
  // 「見つける」の各行の ✓ 判定用。行ごとに items をなめると件数が多いとき重いので、先に集合にする。
  const added = useMemo(
    () => ({ src: new Set(items.map((x) => x.src)), title: new Set(items.map((x) => norm(x.title))) }),
    [items],
  );

  const addItem = (title: string, cat: CategoryKey, src: string | null): Item | null => {
    title = title.trim();
    if (!title) return null;
    const dup = (src && findBySrc(src)) || findByTitle(title);
    if (dup) {
      showToast({ msg: 'もうマイリストに入っています' });
      return null;
    }
    const it: Item = {
      id: crypto.randomUUID(),
      title,
      cat,
      pri: 'want',
      when: 'any',
      cost: null,
      memo: '',
      doneAt: null,
      pick: false,
      src,
      hidden: false,
      createdAt: Date.now(),
    };
    commit([it, ...items]);
    persist(() => saveItem({ data: it }));
    showToast({ msg: 'マイリストに追加しました', action: { label: '編集', fn: () => setEditing(it.id) } });
    return it;
  };

  const updateItem = (it: Item, delay = false) => {
    commit(
      items.map((x) => (x.id === it.id ? it : x)),
      delay,
    );
    persist(() => saveItem({ data: it }));
  };

  const removeItem = (id: string) => {
    const i = items.findIndex((x) => x.id === id);
    if (i < 0) return;
    const it = items[i];
    commit(items.filter((x) => x.id !== id));
    persist(() => deleteItem({ data: { id } }));
    const short = it.title.length > 14 ? `${it.title.slice(0, 14)}…` : it.title;
    showToast({
      msg: `「${short}」を削除しました`,
      action: {
        label: '元に戻す',
        fn: () => {
          setItems((cur) => {
            const next = [...cur];
            next.splice(Math.min(i, next.length), 0, it);
            setSettled(next);
            return next;
          });
          persist(() => saveItem({ data: it }));
        },
      },
    });
  };

  const toggleDone = (it: Item) => {
    const doneAt = it.doneAt ? null : today();
    updateItem({ ...it, doneAt }, true);
    if (doneAt) showToast({ msg: '達成おめでとうございます' });
  };

  const pickCount = items.filter((x) => x.pick).length;
  const togglePick = (it: Item) => {
    if (!it.pick && pickCount >= settings.target) {
      showToast({ msg: `${settings.target}件までです。どれかを外してください` });
      return;
    }
    updateItem({ ...it, pick: !it.pick });
  };

  const years = yearsLeft(settings);
  const rowProps = {
    onDone: toggleDone,
    onPick: togglePick,
    onRemove: removeItem,
    onEdit: setEditing,
    showLock: publish.on,
  };

  // 公開リンクの変更。結果（URL）を画面に反映する。表示名の確定と「公開しない」が続けて
  // 起きても後の操作が勝つよう、項目の保存と同じキューで1件ずつ送る。
  const changePublish = (send: () => Promise<Publish>) => {
    queue.current = queue.current.then(async () => {
      try {
        setPublish(await send());
      } catch {
        showToast({ msg: '公開リンクを変更できませんでした' });
      }
    });
  };
  const editingItem = editing ? items.find((x) => x.id === editing) : undefined;

  return (
    <div className="app">
      <header className="top">
        <div className="title-row">
          <h1>死ぬまでにやりたいこと</h1>
          <div className="top-btns">
            <button className="icon-btn" type="button" onClick={() => setPublishOpen(true)}>
              🔗 {publish.on ? '公開中' : '公開する'}
            </button>
            <button className="icon-btn" type="button" onClick={() => setSettingsOpen(true)}>
              ⚙ 設定
            </button>
          </div>
        </div>
        <div className="stats">
          <span>
            リスト <b>{items.length}</b>
          </span>
          <span>
            厳選 <b>{pickCount}</b>/{settings.target}
          </span>
          <span>
            達成 <b>{items.filter((x) => x.doneAt).length}</b>
          </span>
          {years != null && (
            <span className="life">
              残り約 <b>{years}</b> 年
            </span>
          )}
        </div>
        <div className="sync" role="status">
          {sync}
        </div>
      </header>

      <main>
        {/* 「見つける」は隠すだけにして、絞り込みや書きかけのタイトルをタブ移動で失わない */}
        <div hidden={tab !== 'find'}>
          <FindTab
            isAdded={(idea) => added.src.has(idea.id) || added.title.has(norm(idea.title))}
            onAdd={(idea, title) => addItem(title, idea.cat, idea.id)}
            onRemove={(idea) => {
              const it = findBySrc(idea.id) || findByTitle(idea.title);
              if (it) removeItem(it.id);
            }}
            showToast={showToast}
          />
        </div>
        {tab === 'mine' && (
          <MineTab
            items={items}
            settled={settled}
            row={rowProps}
            onAdd={(title) => {
              const it = addItem(title, 'life', null);
              if (!it) return;
              setEditing(it.id);
              showToast({ msg: 'マイリストに追加しました' }); // 編集シートを開くので「編集」ボタンは要らない
            }}
          />
        )}
        {tab === 'pick' && (
          <PickTab items={items} settled={settled} settings={settings} years={years} row={rowProps} />
        )}
      </main>

      <nav className="tabs" aria-label="画面切り替え">
        <div className="wrap" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              type="button"
              aria-selected={tab === t.key}
              onClick={() => {
                if (t.key === tab) return window.scrollTo(0, 0); // 今のタブをもう一度押したら先頭へ
                scrollPos.current[tab] = window.scrollY;
                setTab(t.key);
              }}
            >
              {t.icon}
              {t.name}
            </button>
          ))}
        </div>
      </nav>

      {editingItem && (
        <EditSheet
          item={editingItem}
          publish={publish}
          onClose={() => setEditing(null)}
          onSave={(it) => {
            updateItem(it);
            setEditing(null);
            showToast({ msg: '保存しました' });
          }}
          onDelete={() => {
            setEditing(null);
            removeItem(editingItem.id);
          }}
        />
      )}
      {settingsOpen && (
        <SettingsSheet
          settings={settings}
          pickCount={pickCount}
          onClose={() => setSettingsOpen(false)}
          onSave={(s) => {
            setSettings(s);
            persist(() => saveSettings({ data: s }));
            setSettingsOpen(false);
            showToast({ msg: '設定を保存しました' });
          }}
          showToast={showToast}
        />
      )}
      {publishOpen && (
        <PublishSheet
          publish={publish}
          onPublish={(p) => changePublish(() => savePublish({ data: p }))}
          onRenew={() => changePublish(() => renewPublishToken())}
          onClose={() => setPublishOpen(false)}
          showToast={showToast}
        />
      )}
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          <span>{toast.msg}</span>
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                setToast(null);
                toast.action?.fn();
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const TABS: { key: Tab; name: string; icon: ReactNode }[] = [
  {
    key: 'find',
    name: '見つける',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="6.5" />
        <path d="M16 16l4.5 4.5" />
      </svg>
    ),
  },
  {
    key: 'mine',
    name: 'マイリスト',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 6h12M8 12h12M8 18h12" />
        <path d="M3.5 6h.5M3.5 12h.5M3.5 18h.5" />
      </svg>
    ),
  },
  {
    key: 'pick',
    name: '厳選',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z" />
      </svg>
    ),
  },
];

export function CatDot({ cat }: { cat: CategoryKey }) {
  return <span className="dot" style={{ background: CAT[cat]?.color }} />;
}

function Chips<K extends string>(props: {
  options: { key: K; name: string; cat?: CategoryKey }[];
  value: K;
  onChange: (k: K) => void;
}) {
  return (
    <div className="chips">
      {props.options.map((o) => (
        <button
          key={o.key}
          className="chip"
          type="button"
          aria-pressed={o.key === props.value}
          onClick={() => props.onChange(o.key)}
        >
          {o.cat && <CatDot cat={o.cat} />}
          {o.name}
        </button>
      ))}
    </div>
  );
}

const catOptions = CATEGORIES.map((c) => ({ key: c.key, name: c.name, cat: c.key }));

function FindTab(props: {
  isAdded: (idea: Idea) => boolean;
  onAdd: (idea: Idea, title: string) => void;
  onRemove: (idea: Idea) => void;
  showToast: (t: Toast) => void;
}) {
  const [cat, setCat] = useState<CategoryKey | 'all'>('all');
  const [q, setQ] = useState('');
  const [flash, setFlash] = useState<string | null>(null);
  // 例のあるアイデアは、追加する前にその行でタイトルを書き直してもらう
  const [draft, setDraft] = useState<{ id: string; title: string } | null>(null);
  const nq = norm(q);
  const list = IDEAS.filter(
    (s) =>
      (cat === 'all' || s.cat === cat) &&
      (!nq || norm(s.title).includes(nq) || s.examples?.some((e) => norm(e).includes(nq))),
  );

  const random = () => {
    const pool = IDEAS.filter((s) => (cat === 'all' || s.cat === cat) && !props.isAdded(s));
    if (!pool.length) {
      props.showToast({ msg: 'このカテゴリはすべて追加済みです' });
      return;
    }
    const s = pool[Math.floor(Math.random() * pool.length)];
    setQ('');
    setDraft(null);
    setFlash(s.id);
    setTimeout(() => {
      document.getElementById(`idea-${s.id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 0);
    setTimeout(() => setFlash(null), 1600);
    props.showToast({ msg: `「${s.title}」はどうですか？` });
  };

  return (
    <section>
      <h2>アイデアから見つける</h2>
      <p className="lead">＋ でマイリストに入ります。もう一度押すと外せます。</p>
      <div className="toolbar">
        <input
          type="search"
          placeholder="キーワードで探す"
          aria-label="アイデアを検索"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setDraft(null); // 絞り込みで行が出入りすると autoFocus が検索欄の入力を奪うため
          }}
        />
        <button className="btn ghost" type="button" onClick={random}>
          ランダム
        </button>
      </div>
      <Chips
        options={[{ key: 'all' as const, name: 'すべて' }, ...catOptions]}
        value={cat}
        onChange={(k) => {
          setCat(k);
          setDraft(null);
        }}
      />
      <div className="list">
        {list.length === 0 ? (
          <div className="empty">見つかりませんでした。思いついたものはマイリストで直接追加できます。</div>
        ) : (
          list.map((s) => {
            const added = props.isAdded(s);
            if (draft?.id === s.id) {
              const submit = () => {
                if (!draft.title.trim()) return;
                props.onAdd(s, draft.title);
                setDraft(null);
              };
              return (
                <form
                  key={s.id}
                  id={`idea-${s.id}`}
                  className="row draft"
                  onSubmit={(e) => {
                    e.preventDefault();
                    submit();
                  }}
                >
                  <div className="main">
                    <input
                      type="text"
                      maxLength={80}
                      autoFocus
                      aria-label="やりたいこと"
                      value={draft.title}
                      onChange={(e) => setDraft({ id: s.id, title: e.target.value })}
                      onKeyDown={(e) => e.key === 'Escape' && setDraft(null)}
                    />
                    <div className="meta">
                      <span>例：{s.examples?.join('、')}</span>
                    </div>
                  </div>
                  <button className="btn ghost" type="button" onClick={() => setDraft(null)}>
                    やめる
                  </button>
                  <button className="btn" type="submit" disabled={!draft.title.trim()}>
                    追加
                  </button>
                </form>
              );
            }
            return (
              <div key={s.id} id={`idea-${s.id}`} className={`row${flash === s.id ? ' flash' : ''}`}>
                <div className="main">
                  <div className="t">{s.title}</div>
                  <div className="meta">
                    <span>
                      <CatDot cat={s.cat} />
                      {CAT[s.cat].name}
                    </span>
                    {s.examples && <span>例：{s.examples.join('、')}</span>}
                  </div>
                </div>
                <button
                  className="add"
                  type="button"
                  aria-pressed={added}
                  aria-label={added ? 'マイリストから外す' : 'マイリストに追加'}
                  onClick={() =>
                    added
                      ? props.onRemove(s)
                      : s.examples
                        ? setDraft({ id: s.id, title: s.title })
                        : props.onAdd(s, s.title)
                  }
                >
                  {added ? '✓' : '＋'}
                </button>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

type RowHandlers = {
  onDone: (it: Item) => void;
  onPick: (it: Item) => void;
  onRemove: (id: string) => void;
  onEdit: (id: string) => void;
  /** 公開リンクがオンのとき、非公開の項目に鍵をつける */
  showLock: boolean;
};

/** settled（並び替え用の少し古い一覧）で順番と絞り込みを決め、表示は最新の items を使う。 */
function ordered(items: Item[], settled: Item[], filter: (x: Item) => boolean): Item[] {
  const live = new Map(items.map((x) => [x.id, x]));
  return sortItems(settled.filter(filter))
    .map((x) => live.get(x.id))
    .filter((x): x is Item => !!x);
}

/**
 * mode: 'pick' は厳選欄（× なし）、'cand' は厳選の候補欄（★ だけ。行を押しても厳選に入る）。
 * 「厳選」タブでは押し間違いで達成・削除しないよう、できることを絞る。
 */
function ItemRow({ it, row, mode }: { it: Item; row: RowHandlers; mode?: 'pick' | 'cand' }) {
  const done = !!it.doneAt;
  const pri = PRI.find((x) => x.key === it.pri);
  const when = WHEN.find((x) => x.key === it.when);
  const cost = COST.find((x) => x.key === it.cost);
  return (
    <div className={`row${done ? ' done' : ''}`}>
      {mode !== 'cand' && (
        <button
          className="check-wrap"
          type="button"
          aria-pressed={done}
          aria-label={done ? '未達成に戻す' : '達成にする'}
          onClick={() => row.onDone(it)}
        >
          <span className="check" aria-hidden="true">
            ✓
          </span>
          <span className="check-lbl">{done ? '達成' : '未達成'}</span>
        </button>
      )}
      <button
        type="button"
        className="main"
        style={{ textAlign: 'left', background: 'none', border: 'none', padding: 0 }}
        aria-label={mode === 'cand' ? `「${it.title}」を厳選に入れる` : undefined}
        onClick={() => (mode === 'cand' ? row.onPick(it) : row.onEdit(it.id))}
      >
        <span className="t">{it.title}</span>
        <span className="meta">
          <span>
            <CatDot cat={it.cat} />
            {CAT[it.cat]?.name}
          </span>
          {pri && <span className={`pill${it.pri === 'must' ? ' must' : ''}`}>{pri.name}</span>}
          {when && it.when !== 'any' && <span>{when.name}</span>}
          {cost && <span>{cost.name}</span>}
          {it.doneAt && <span>{it.doneAt} 達成</span>}
          {row.showLock && it.hidden && <span aria-label="非公開">🔒</span>}
        </span>
        {it.memo && <span className="meta">{it.memo.length > 40 ? `${it.memo.slice(0, 40)}…` : it.memo}</span>}
      </button>
      <button
        className="star"
        type="button"
        aria-pressed={it.pick}
        aria-label={it.pick ? '厳選から外す' : '厳選に入れる'}
        onClick={() => row.onPick(it)}
      >
        ★
      </button>
      {!mode && (
        <button className="del" type="button" aria-label={`「${it.title}」を削除`} onClick={() => row.onRemove(it.id)}>
          ×
        </button>
      )}
    </div>
  );
}

function MineTab(props: { items: Item[]; settled: Item[]; row: RowHandlers; onAdd: (title: string) => void }) {
  const { items } = props;
  const [filter, setFilter] = useState<string>('all');
  const [title, setTitle] = useState('');
  const options = useMemo(
    () => [
      { key: 'all', name: 'すべて' },
      { key: 'open', name: `未達成 ${items.filter((x) => !x.doneAt).length}` },
      { key: 'done', name: `達成 ${items.filter((x) => x.doneAt).length}` },
      ...CATEGORIES.filter((c) => items.some((x) => x.cat === c.key)).map((c) => ({
        key: `cat:${c.key}`,
        name: c.name,
        cat: c.key,
      })),
    ],
    [items],
  );
  const match = (x: Item) =>
    filter === 'open'
      ? !x.doneAt
      : filter === 'done'
        ? !!x.doneAt
        : filter.startsWith('cat:')
          ? x.cat === filter.slice(4)
          : true;
  const list = ordered(items, props.settled, match);

  return (
    <section>
      <h2>マイリスト</h2>
      <p className="lead">左の四角で達成、★で厳選、×で削除。文字をタップすると詳しく編集できます。</p>
      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          props.onAdd(title);
          setTitle('');
          if (filter !== 'all' && filter !== 'open') setFilter('all');
        }}
      >
        <input
          type="text"
          placeholder="やりたいことを書く"
          aria-label="やりたいこと"
          maxLength={80}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button className="btn" type="submit">
          追加
        </button>
      </form>
      <Chips options={options} value={filter} onChange={setFilter} />
      <div className="list">
        {list.length === 0 ? (
          <div className="empty">
            {items.length
              ? 'この条件の項目はありません。'
              : 'まだ何もありません。上の欄に書くか、「見つける」から選んでください。'}
          </div>
        ) : (
          list.map((x) => <ItemRow key={x.id} it={x} row={props.row} />)
        )}
      </div>
    </section>
  );
}

function PickTab(props: {
  items: Item[];
  settled: Item[];
  settings: Settings;
  years: number | null;
  row: RowHandlers;
}) {
  const { items, settings } = props;
  const picks = ordered(items, props.settled, (x) => x.pick);
  const cand = ordered(items, props.settled, (x) => !x.pick && !x.doneAt);
  const n = items.filter((x) => x.pick).length;
  return (
    <section>
      <h2>死ぬまでに絶対やる</h2>
      <div className="goal">
        <div className="big">
          {n}
          <small>/{settings.target}</small>
        </div>
        <div style={{ flex: 1 }}>
          <p>{pickMessage(items, settings, props.years)}</p>
          <div className="bar">
            <i style={{ width: `${Math.min(100, (n / settings.target) * 100)}%` }} />
          </div>
        </div>
      </div>
      <div className="list">
        {picks.length ? (
          picks.map((x) => <ItemRow key={x.id} it={x} row={props.row} mode="pick" />)
        ) : (
          <div className="empty">まだ選ばれていません。下の候補の ★ を押してください。</div>
        )}
      </div>
      <h2 style={{ marginTop: 18 }}>候補（★ で厳選に入れる）</h2>
      <div className="list">
        {cand.length ? (
          cand.map((x) => <ItemRow key={x.id} it={x} row={props.row} mode="cand" />)
        ) : (
          <div className="empty">
            {items.length
              ? '候補はすべて厳選済みか達成済みです。'
              : 'マイリストが空です。「見つける」から追加してください。'}
          </div>
        )}
      </div>
    </section>
  );
}
