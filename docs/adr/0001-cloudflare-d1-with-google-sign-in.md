# Cloudflare（Workers＋D1）と better-auth の Google ログインを使う

SPEC.md では、プロトタイプのデータ API に近い Firebase（Firestore）が移しやすいとされていた。それでも、ほかの自作アプリ（asatomo、nafuda、naotta）と同じ構成にそろえる。構成は TanStack Start、Cloudflare Vite プラグイン、D1＋Drizzle、better-auth（Google ログイン）、Tailwind。ドメイン over40web.club の DNS もすでに Cloudflare にある。

その代わりに、プロトタイプの素の JS は React に書き直す。Firestore のリアルタイム同期（onSnapshot）とセキュリティルールは使わず、同期は読み込み時の取得と保存時の書き込みで行い、権限はサーバー関数のコードで確認する。
