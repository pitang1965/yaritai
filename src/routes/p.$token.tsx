import { createFileRoute, Link } from '@tanstack/react-router';
import { CATEGORIES } from '../domain/ideas';
import { publicDescription, publicTitle } from '../domain/item';
import { fetchPublicList } from '../server/functions';
import { CatDot } from '../web/App';
import { LineNotice } from '../web/Landing';

// 公開リンク（/p/<文字列>）。ログイン不要で、持ち主のマイリストのうち公開範囲の項目を見せる。
export const Route = createFileRoute('/p/$token')({
  loader: ({ params }) => fetchPublicList({ data: { token: params.token } }),
  head: ({ loaderData: d }) => {
    const robots = { name: 'robots', content: 'noindex, nofollow' };
    if (!d) return { meta: [robots, { title: '見つかりません｜死ぬまでにやりたいことリスト' }] };
    const title = publicTitle(d.name);
    const desc = publicDescription(d.items);
    return {
      meta: [
        robots,
        { title },
        { name: 'description', content: desc },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: '死ぬまでにやりたいことリスト' },
        { property: 'og:title', content: title },
        { property: 'og:description', content: desc },
        { property: 'og:image', content: `${d.origin}/og.png` },
        { name: 'twitter:card', content: 'summary_large_image' },
      ],
    };
  },
  component: PublicPage,
});

function PublicPage() {
  const d = Route.useLoaderData();
  if (!d) {
    return (
      <main className="doc">
        <h1>見つかりません</h1>
        <p>このリストは公開をやめたか、URL が変わりました。</p>
        <Link to="/">死ぬまでにやりたいことリストへ</Link>
      </main>
    );
  }
  const done = d.items.filter((x) => x.doneAt).length;
  return (
    <main className="doc">
      <h1>{publicTitle(d.name)}</h1>
      <p className="updated">
        {d.items.length}件のうち{done}件を達成
      </p>
      <div className="list" style={{ margin: '16px 0 24px' }}>
        {d.items.length === 0 ? (
          <div className="empty">まだ公開されている項目はありません。</div>
        ) : (
          d.items.map((x) => (
            <div key={x.id} className={`row${x.doneAt ? ' done' : ''}`}>
              <div className="main">
                <span className="t">
                  {x.doneAt && '✓ '}
                  {d.scope === 'all' && x.pick && <span aria-label="厳選">★ </span>}
                  {x.title}
                </span>
                <span className="meta">
                  <span>
                    <CatDot cat={x.cat} />
                    {CATEGORIES.find((c) => c.key === x.cat)?.name}
                  </span>
                  {x.doneAt && <span>{x.doneAt} 達成</span>}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
      <LineNotice />
      <p style={{ textAlign: 'center' }}>
        <Link to="/" className="btn" style={{ display: 'inline-block', textDecoration: 'none', color: 'var(--on-accent)' }}>
          自分のリストを作る
        </Link>
      </p>
    </main>
  );
}
