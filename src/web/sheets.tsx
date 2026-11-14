import { type ReactNode, useEffect, useState } from 'react';
import { CATEGORIES } from '../domain/ideas';
import { COST, type Item, PRI, type Settings, TARGETS, WHEN } from '../domain/item';
import { authClient } from '../lib/auth-client';
import { ideaById } from '../domain/ideas';

function Sheet(props: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && props.onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [props.onClose]);
  return (
    <div className="sheet-bg" onClick={(e) => e.target === e.currentTarget && props.onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={props.title}>
        <h3>{props.title}</h3>
        {props.children}
      </div>
    </div>
  );
}

function Seg<K extends string | number>(props: {
  options: readonly { key: K; name: string }[];
  value: K | null;
  onChange: (k: K | null) => void;
  /** もう一度押すと選択を外せる */
  clearable?: boolean;
}) {
  return (
    <div className="seg">
      {props.options.map((o) => (
        <button
          key={o.key}
          type="button"
          aria-pressed={o.key === props.value}
          onClick={() => props.onChange(props.clearable && o.key === props.value ? null : o.key)}
        >
          {o.name}
        </button>
      ))}
    </div>
  );
}

export function EditSheet(props: {
  item: Item;
  onClose: () => void;
  onSave: (it: Item) => void;
  onDelete: () => void;
}) {
  const [d, setD] = useState(props.item);
  const examples = d.src ? ideaById.get(d.src)?.examples : undefined;
  return (
    <Sheet title="やりたいことを編集" onClose={props.onClose}>
      <div className="field">
        <label htmlFor="edTitle">やりたいこと</label>
        <input
          id="edTitle"
          type="text"
          maxLength={80}
          autoFocus
          value={d.title}
          onChange={(e) => setD({ ...d, title: e.target.value })}
        />
        {examples && <span className="lbl">例：{examples.join('、')}（自分の言葉に書き直せます）</span>}
      </div>
      <div className="field">
        <span className="lbl">カテゴリ</span>
        <Seg options={CATEGORIES} value={d.cat} onChange={(k) => k && setD({ ...d, cat: k })} />
      </div>
      <div className="field">
        <span className="lbl">本気度</span>
        <Seg options={PRI} value={d.pri} onChange={(k) => k && setD({ ...d, pri: k })} />
      </div>
      <div className="field">
        <span className="lbl">いつまでに</span>
        <Seg options={WHEN} value={d.when} onChange={(k) => k && setD({ ...d, when: k })} />
      </div>
      <div className="field">
        <span className="lbl">費用の目安</span>
        <Seg options={COST} value={d.cost} clearable onChange={(k) => setD({ ...d, cost: k })} />
      </div>
      <div className="field">
        <label htmlFor="edMemo">メモ（理由・きっかけ・達成の記録など）</label>
        <textarea
          id="edMemo"
          rows={3}
          maxLength={500}
          value={d.memo}
          onChange={(e) => setD({ ...d, memo: e.target.value })}
        />
      </div>
      <div className="actions">
        <button className="danger" type="button" onClick={props.onDelete}>
          削除
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn ghost" type="button" onClick={props.onClose}>
            閉じる
          </button>
          <button
            className="btn"
            type="button"
            disabled={!d.title.trim()}
            onClick={() => props.onSave({ ...d, title: d.title.trim(), memo: d.memo.trim() })}
          >
            保存
          </button>
        </div>
      </div>
    </Sheet>
  );
}

export function SettingsSheet(props: {
  settings: Settings;
  pickCount: number;
  onClose: () => void;
  onSave: (s: Settings) => void;
  showToast: (t: { msg: string }) => void;
}) {
  const [target, setTarget] = useState(props.settings.target);
  const [birth, setBirth] = useState(props.settings.birth?.toString() ?? '');
  const [until, setUntil] = useState(props.settings.until.toString());
  const thisYear = new Date().getFullYear();

  const save = () => {
    if (target < props.pickCount) {
      props.showToast({ msg: `厳選がすでに${props.pickCount}件あります。先に ★ を外してください` });
      return;
    }
    const b = Number.parseInt(birth, 10);
    const u = Number.parseInt(until, 10);
    props.onSave({
      target,
      birth: b >= 1900 && b <= thisYear ? b : null,
      until: u >= 40 && u <= 120 ? u : 85,
    });
  };

  return (
    <Sheet title="設定" onClose={props.onClose}>
      <div className="field">
        <span className="lbl">厳選する件数</span>
        <Seg
          options={TARGETS.map((n) => ({ key: n, name: `${n}件` }))}
          value={target}
          onChange={(k) => k && setTarget(k)}
        />
      </div>
      <div className="field">
        <label htmlFor="setBirth">生まれた年（西暦・任意）</label>
        <input
          id="setBirth"
          type="number"
          inputMode="numeric"
          min={1900}
          max={thisYear}
          placeholder="例 1975"
          value={birth}
          onChange={(e) => setBirth(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="setUntil">何歳までを目安にするか</label>
        <input
          id="setUntil"
          type="number"
          inputMode="numeric"
          min={40}
          max={120}
          value={until}
          onChange={(e) => setUntil(e.target.value)}
        />
      </div>
      <p className="lead">生まれた年を入れると、残りの年数と「何年に1件ずつ」の目安が出ます。</p>
      <div className="actions">
        <button
          className="danger"
          type="button"
          onClick={() => authClient.signOut().then(() => window.location.assign('/'))}
        >
          ログアウト
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn ghost" type="button" onClick={props.onClose}>
            閉じる
          </button>
          <button className="btn" type="button" onClick={save}>
            保存
          </button>
        </div>
      </div>
    </Sheet>
  );
}
