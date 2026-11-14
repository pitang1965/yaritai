import { useState } from 'react';
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
      </ul>
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
    </div>
  );
}
