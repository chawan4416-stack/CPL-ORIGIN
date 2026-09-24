# CPL 0022｜開発用DBの準備と実行ゲート

2026-09-24：組織 `chawan4416-stack's Org` のFreeプランで月額$0と再確認してから、空の独立開発プロジェクト `CPL-DEV`（ref: `kczisspagwqzdvaeemir`）を作成。**本番DBで0022やDBテストを実行しない。**

## 作成時の確認

1. ユーザーの指定した組織と月額$0の条件で作成済み。追加の有料プランへの変更はしていない。
2. 選択した**開発専用**接続先でのみ、migrationとテスト用の一時レース／ユーザーを作成・ROLLBACKする。本番への適用やデプロイは別承認。
3. 秘密鍵・DBパスワードをGitやチャットに貼らず、開発環境の安全な接続手段（Supabaseの開発ブランチ接続、CLI、または開発用psql）を用意する。

## 開発DBでの実行記録

- 空プロジェクトに既存0001〜0021を番号順に適用済み。実ユーザーデータは複製していない。既存migration由来のマスター・研究初期行のみ入った。
- 開発用接続先に `supabase/migrations/0022_all_runner_evaluation.sql` を適用済み。新4テーブル、`FLANK_TUCK`マスター、RLS・GRANT・RPCを確認した。本番未適用。
- 開発DBにだけ `cpl_private.development_test_gate(project_ref text primary key)` を作成、開発refだけ登録した。このテスト専用ゲートはGitのmigrationに含めない。
- `proposals/0022_all_runner_db_tests.sql` と `proposals/0022_backup_restore_db_tests.sql` を、`BEGIN`直後に `SET LOCAL cpl.disposable_test_db='on'`、`SET LOCAL cpl.test.dev_project_ref='kczisspagwqzdvaeemir'` を与えて実行。テストはゲート照合後に合成ユーザーとレースを作成し、終了時 `ROLLBACK`。初回実行でテストの3着同着に関する期待値の誤りを発見し修正、再実行は成功。初回失敗分もROLLBACKした。
- SQLテストで通常決着、1・2・3着同着、取消、中止、不成立、初回不変性、結果確認開始時刻の不可逆性、結果前／事後の完全revision、旧RPC共存、別ユーザー／anon拒否を検証。新4テーブルはすべてRLS有効。authenticatedのSELECTだけをテーブル権限として付与、直接INSERTなし。anonのSELECTなし。security/performance advisorsの新テーブルに関する指摘なし（既存レガシー関数とRLSには別途既存警告あり）。
- Node模擬画面テストで馬番切替、draft、選択・注目、初回確定、結果確認境界、同着、修正を検証。ローカルプレビューへのブラウザー接続は環境側で `ERR_BLOCKED_BY_CLIENT`。開発プロジェクトのGoogle OAuth設定もなく、開発DBにサインインした画面の実操作、複数タブ競合、実機Safariは未検証。本番Supabase設定のまま画面を開く操作は安全審査で拒否されたため行わなかった。開発用publishable keyだけを持つ一時コピーはリポジトリ外に置き、Gitには含めない。

## 本番適用の追加ゲート

現行 `ops/CPLBackup.gs` はbackup_version 5で`races`と`race_results`だけを出力する。旧バックアップは変更しない。別ファイル `ops/CPLBackupV6.gs` に新4テーブルを含むv6を準備済み。ローカル模擬テストで6テーブルの出力・不完全バックアップ拒否・1000行ページ分割が成功。開発DBでは `proposals/0022_backup_restore_db_tests.sql` で合成データの6テーブルJSON退避・削除・FK順復元・一致照合が成功（トランザクション全体はROLLBACK）。実際のApps Script→Drive→REST往復とiPhoneでの復元UIは未検証。本番適用前に、この未検証項目と開発ログイン設定を解決し、別途承認を得る。

実行後の確認：`auth.users`、`races`、`race_results`、新4テーブルはいずれも0行。開発用テストゲートのみ残る。本番DB、本番GitHub Pagesは変更していない。

## 開発版公開・実運用テストの準備（2026-09-24）

- `ops/build-dev-preview.mjs` はブラウザー用ファイルだけをリポジトリ外にコピーし、CPL-DEVのpublishable keyから新しい `supabase/config.js` を生成する。公開物に本番URLとキーが混入していないか全ファイル検査し、Cloudflare Pagesの `_headers` で `connect-src` をCPL-DEVへ限定する。既存の本番用設定ファイルには触れない。ローカルで17ファイルを生成・検査済み。
- `ops/build-dev-backup.mjs` は既存v6候補を元に、CPL-DEVへの接続チェックと専用フォルダ `CPL_BACKUP_DEV` を追加した独立Apps Scriptファイルをリポジトリ外に生成する。実際のScript Propertiesには**開発プロジェクトの**URL・secret keyだけを設定する。本番v5定期ジョブは維持する。
- Node模擬画面テストに16頭の逆順入力、くびれ評価、下書き復元、全頭人気、3着同着、事後修正でも初回snapshotが残るケースを追加。合計13件が通過。これはSafari実機や実際のGoogleログイン成功を示さない。
- Cloudflare管理画面 `dash.cloudflare.com` はこの検証ブラウザーで「セキュリティ検証の実行」ループとなり、許された1回の再読み込みでも解消しなかった。管理画面を迂回せず公開作業を停止。Google Cloud Consoleも同ブラウザーではSite Unavailable。Cloudflare Pagesプロジェクト、開発専用Google OAuthクライアント、Supabase Auth URL設定、実際のApps Script・Drive実行は未完了。公開URLは未確定。
- Cloudflareが利用できる状態になったら無料枠を実画面で確認し、公開先URLを確定、Google OAuthクライアントのコールバックに `https://kczisspagwqzdvaeemir.supabase.co/auth/v1/callback` を設定する。CPL-DEVのSite URLと許可リダイレクト先に公開URLを登録し、Data APIの新テーブルとRPCの公開設定を確認する。本番側のGoogle OAuth・Supabase Authを変更しない。
