import { createFileRoute, Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

// プライバシーポリシー（/privacy）。ログイン不要の静的ページ。Google の OAuth 同意画面からもリンクする。
export const Route = createFileRoute('/privacy')({
  head: () => ({ meta: [{ title: 'プライバシーポリシー｜死ぬまでにやりたいことリスト' }] }),
  component: PrivacyPage,
});

const UPDATED = '2026年11月15日';
const CONTACT = 'yaritai@googlegroups.com';

function Section(props: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2>{props.title}</h2>
      {props.children}
    </section>
  );
}

function PrivacyPage() {
  const mail = <a href={`mailto:${CONTACT}`}>{CONTACT}</a>;
  return (
    <main className="doc">
      <Link to="/">← トップに戻る</Link>
      <h1>プライバシーポリシー</h1>
      <p className="updated">最終更新：{UPDATED}</p>

      <Section title="1. 運営者">
        <p>
          本サービス「死ぬまでにやりたいことリスト」（以下「本サービス」）は、ピータンが運営しています。
          <br />
          お問い合わせ：{mail}
        </p>
      </Section>

      <Section title="2. 取得する情報">
        <ul>
          <li>
            <strong>アカウント情報</strong>：Google でログインしたときに受け取る氏名・メールアドレス・プロフィール画像
          </li>
          <li>
            <strong>リストの内容</strong>：登録したやりたいこと（タイトル・カテゴリ・本気度・期限・費用の目安・メモ・達成日・厳選の印・非公開の印）
          </li>
          <li>
            <strong>設定</strong>：厳選する件数、生まれた年（任意）、目安にする年齢、公開リンクの設定（公開するかどうか・見せる範囲・表示名）
          </li>
          <li>
            <strong>ログイン・アクセスの記録</strong>：ログイン時の IP アドレス・ブラウザの種類（不正アクセス対策のため）、およびサーバーの動作記録
          </li>
        </ul>
        <p>位置情報や連絡先は取得しません。利用状況の解析ツールや広告は使っていません。</p>
      </Section>

      <Section title="3. 利用目的">
        <ul>
          <li>ログインと本人確認</li>
          <li>リストを保存し、どの端末からでも同じリストを使えるようにするため</li>
          <li>不具合の調査と不正利用の防止</li>
        </ul>
        <p>
          リストの内容は、ご自身で公開リンクをオンにしない限り、ほかの人に見られることはありません。公開リンクをオンにすると、その URL
          を知っている人は誰でも、ログインせずにリストのタイトル・カテゴリ・達成日・厳選の印と表示名を見られます。メモ・本気度・期限・費用の目安、非公開の印をつけた項目、Google
          アカウントの氏名やメールアドレスは公開リンクには出しません。公開リンクはいつでもオフにしたり、URL を作り直したりできます。
        </p>
      </Section>

      <Section title="4. 第三者への提供">
        <p>法令に基づく場合を除き、取得した情報を第三者に売ったり、目的外に提供したりしません。本サービスは次のサービスを利用しており、必要な範囲で情報が処理されます。</p>
        <ul>
          <li>
            <strong>Google（米国）</strong>：ログイン機能（
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
              policies.google.com/privacy
            </a>
            ）
          </li>
          <li>
            <strong>Cloudflare（米国）</strong>：サービスの配信と、データベース（Cloudflare D1、アジア太平洋地域）での保管（
            <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer">
              cloudflare.com/privacypolicy
            </a>
            ）
          </li>
        </ul>
      </Section>

      <Section title="5. Cookie の利用">
        <p>ログイン状態を保つために Cookie を使います。ブラウザで Cookie を無効にすると、ログインできなくなります。</p>
      </Section>

      <Section title="6. 保管とセキュリティ">
        <p>
          通信は HTTPS で暗号化しています。ログイン状態は署名付きの Cookie で管理しています。ただし、インターネット上で完全な安全を保証することはできません。
        </p>
      </Section>

      <Section title="7. データの確認・削除">
        <p>
          登録したやりたいことや設定は、ログインすればいつでも確認・編集・削除できます。アカウントとすべてのデータの削除（退会）や、個人情報の開示・訂正・利用停止を希望する場合は、{mail}
          までご連絡ください。ご本人であることを確認したうえで対応します。
        </p>
      </Section>

      <Section title="8. ポリシーの改定">
        <p>このポリシーは必要に応じて改定します。大事な変更があるときは、本サービス内でお知らせします。</p>
      </Section>

      <p>
        <Link to="/">← トップに戻る</Link>
      </p>
    </main>
  );
}
