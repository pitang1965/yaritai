# Cloudflare（Workers＋D1）と better-auth の Google ログインを使う

SPEC.md では、プロトタイプのデータ API に近い Firebase（Firestore）が移しやすいとされていた。それでも、ほかの自作アプリ（asatomo、nafuda、naotta）と同じ構成にそろえる。構成は TanStack Start、Cloudflare Vite プラグイン、D1＋Drizzle、better-auth（Google ログイン）、Tailwind。ドメイン over40web.club の DNS もすでに Cloudflare にある。

その代わりに、プロトタイプの素の JS は React に書き直す。Firestore のリアルタイム同期（onSnapshot）とセキュリティルールは使わず、同期は読み込み時の取得と保存時の書き込みで行い、権限はサーバー関数のコードで確認する。

## 結果

- 端末どうしの変更は、あとから保存したほうが勝つ。読み込みはページを開いたときだけで、保存は項目をまるごと上書きする。そのため、2台で同じリストを開いたままにすると、片方の変更（メモや達成日など）がもう片方の保存で黙って消えることがある。個人用で、同時に編集することはまれなので、これを受け入れる。
- 権限の確認は、サーバー関数ごとにコードで書く。Firestore のルールと違い、書き忘れても何も止めてくれない。サーバー関数を足すときは、`requireUser()` でログインを確かめ、読み書きを `userId` で絞る。例外として、ログインなしで呼べるのは公開リンク用の `fetchPublicList` だけで、推測しづらい URL の文字列で絞る。
