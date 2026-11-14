import { createRootRoute, HeadContent, Scripts } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import css from '../styles.css?url';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: '死ぬまでにやりたいことリスト' },
      {
        name: 'description',
        content: 'たくさんのアイデアから、死ぬまでにやりたいことを選んで、自分のリストを作るアプリ。',
      },
      { name: 'theme-color', content: '#f2f4f1', media: '(prefers-color-scheme: light)' },
      { name: 'theme-color', content: '#111816', media: '(prefers-color-scheme: dark)' },
    ],
    links: [
      { rel: 'stylesheet', href: css },
      { rel: 'manifest', href: '/manifest.webmanifest' },
      { rel: 'icon', type: 'image/png', href: '/icon-192.png' },
      { rel: 'apple-touch-icon', href: '/icon-192.png' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@500;700&family=Noto+Sans+JP:wght@400;500;700&display=swap',
      },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
