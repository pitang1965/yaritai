import { Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { IDEAS } from '../domain/ideas';
import { authClient } from '../lib/auth-client';

export function Landing() {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <div className="landing">
      <h1>死ぬまでにやりたいことリスト</h1>
      <p>たくさんのアイデアから選んで、自分だけのリストを作りましょう。</p>
      <ul>
        <li>{IDEAS.length}件のアイデアから選べる</li>
        <li>「死ぬまでに絶対やる」を厳選して、達成を記録できる</li>
        <li>スマホでもパソコンでも、同じリストを使える</li>
        <li>リストを URL で公開して、家族や友だちに見せられる（見せたくない項目は隠せる）</li>
      </ul>
      <LineNotice />
      <div>
        <button
          className="btn google"
          type="button"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            setFailed(false);
            // better-auth は失敗時に throw せず { error } を返すので、両方を拾う
            const fail = () => {
              setBusy(false);
              setFailed(true);
            };
            authClient.signIn
              .social({ provider: 'google', callbackURL: '/' })
              .then((r) => r.error && fail(), fail);
          }}
        >
          {busy ? '移動中…' : 'Google でログイン'}
        </button>
        {failed && <p role="alert">ログインを始められませんでした。時間をおいてもう一度お試しください。</p>}
      </div>
      <p className="foot">
        <Link to="/privacy">プライバシーポリシー</Link>
      </p>
    </div>
  );
}

// LINE の中で開いたときだけ、既定のブラウザで開くよう案内する（LINE の中では Google ログインできない）
export function LineNotice() {
  // SSR では UA が分からないので、描画後に判定する（ハイドレーションのずれを避ける）
  const [inLine, setInLine] = useState(false);
  useEffect(() => setInLine(/ Line\//i.test(navigator.userAgent)), []);
  if (!inLine) return null;
  return (
    <div className="notice">
      <p>
        LINE の中で開いています。いつものブラウザで開くと Google でログインでき、ホーム画面に追加してアプリのように使えます。
      </p>
      {/* LINE はこのクエリが付いた URL を既定のブラウザで開く */}
      <a className="btn" href={`${location.pathname}?openExternalBrowser=1`}>
        ブラウザで開く
      </a>
    </div>
  );
}
