# 全頭評価β：既存CPL Webへの同居案（公開前レビュー）

状態：`cpl-0022-dev`で実装・ローカル検証。`supabase-v1`へのマージ、GitHub Pages公開、本番DBへの0022適用は未承認・未実施。

## 接続とブラウザー内の保存

- 本番HOMEは既存の`supabase/config.js`、既存の`app.js`、`CPL_V1_INPUT_DRAFT_<user>`を維持する。HOMEのβへのリンクの文言のみ更新。
- `all-runner.html`は`supabase/beta-config.js`だけを読み込む。βクライアントはCPL-DEVのURLを厳密に照合し、異なれば起動しない。Googleログインはβ画面からCPL-DEV Authを使用する。本番HOMEのセッションを流用しない。
- `auth.storageKey`は`cpl-dev-kczisspagwqzdvaeemir-all-runner-beta-auth`。β下書きは`CPL_DEV_kczisspagwqzdvaeemir_ALL_RUNNER_BETA_DRAFT_<dev-user-id>_<race>`、結果下書きは`CPL_DEV_kczisspagwqzdvaeemir_ALL_RUNNER_BETA_RESULTS_<dev-user-id>_<race-id>`。βからのログアウトはβクライアントにのみ作用する。
- βページのCSPの`connect-src`はCPL-DEVのみ。HTML・JS・設定への本番接続情報の混入はPages公開物ビルドで拒否する。公開用キーはブラウザー向けであり、secret/service_roleキーは一切含めない。
- 同一オリジンの`localStorage`はパス単位に隔離されない。専用キーによる衝突防止は実現するが、悪意ある同一オリジンのスクリプトに対する厳密な隔離は実現できない。βテストには合成データのみ使用する。

## 公開対象と承認境界

`ops/build-pages-artifact.mjs`は17のWebファイルだけを新しい出力先へコピーして検査する。`.github/workflows/deploy-pages.yml`は従来どおり`supabase-v1`へのpushでのみ本番公開する設定のまま、公開対象をその出力先へ変更する。migration、DBテスト、運用スクリプト、設計書は公開しない。`cpl-0022-dev`へのpushでは本番公開されない。

## 公開が承認された後の設定と確認

1. 開発専用Google OAuth（Webアプリ）の承認済みJavaScript生成元を`https://chawan4416-stack.github.io`、リダイレクトURIを`https://kczisspagwqzdvaeemir.supabase.co/auth/v1/callback`とする。開発用Googleユーザーの許可設定を確認する。GoogleのClient IDとSecretを**CPL-DEVだけ**のGoogle Providerへ設定する。
2. CPL-DEV AuthのSite URLおよび許可Redirect URLsをβ画面`https://chawan4416-stack.github.io/CPL-ORIGIN/all-runner.html`に設定する。本番Supabase Authと本番Googleクライアントは変更しない。
3. 公開物に17ファイルのみがあること、βのCSPと設定がCPL-DEVを指すこと、GitHub PagesからHOMEとβが表示されることを確認する。Safariで本番HOMEログインとβログインを別々に行い、各画面の下書き・ログアウトが相互に影響しないことを確認する。
4. CPL-DEVにのみ16頭立ての合成レースを入力し、再読み込み・アプリ切替・OAuth更新・人気と同着結果・修正履歴を試験する。本番DBへの書き込みが発生しないことを通信先とCPL-DEVのレコードで照合する。

現時点ではGoogle OAuthの開発用設定およびiPhone上の確認は完了扱いにしない。
