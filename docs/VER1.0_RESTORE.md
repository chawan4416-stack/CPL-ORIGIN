# CPL Ver.1.0 復元手順・制約

対象：CPL正式完成基準 `f481363ba48a5a701a32013ec7c7e5e141190699`  
Git tag：`v1.0.0` はGitHub上で未作成。タグを後日作成する場合も、必ずこのcommitを指すこと。  
正式URL：<https://chawan4416-stack.github.io/CPL-ORIGIN/>  
正式Supabase project ref：`ekgislctkribtztazvsd`

## A. コードをVer.1.0基準へ戻す

1. リポジトリ `chawan4416-stack/CPL-ORIGIN` の `f481363ba48a5a701a32013ec7c7e5e141190699` を復旧対象にする。
2. 現在の公開ブランチを直接force pushしない。復元用のレビュー済みブランチを作り、差分とworkflow対象を確認する。
3. 既存の専用workflow「Deploy CPL to GitHub Pages」だけを使う。別のPages workflow／公開経路は作らない。
4. デプロイ後にworkflow成功、URL、ログイン、研究画面、主要assetを確認する。

## B. Git基準点

- Application baseline：`f481363ba48a5a701a32013ec7c7e5e141190699`
- Parent：`f55f9793b45c27d34451b806e1f87509d7211e31`
- OAuth flash DEV verification source：`1abe3d036bd62f6ebf8c8c6224f86e490d864543`
- `v1.0.0` tagは現時点でGitHubに存在しない。後日付与する場合は既存同名refの不存在を確認し、上記baseline commitへだけ付与する。

## C. DBスキーマとデータ

私有バックアップ `CPL_Ver1.0_Formal_DB_20261002.zip` を用いる。含まれる `schema_catalog.json` とACL snapshotは、public tables/columns、constraints、indexes、RLS/policies、triggers、functions/RPC、extensions、GRANT、default privilegesを記録する。`data.json` は11 public tablesのデータを含み、`data_restore.sql` は一致する空スキーマへINSERTとsequence setvalを行う。

重要：このZIPはnative `pg_dump` ではなく、復元テスト済みでもない。Auth users/configは含まれない。production／DEVへ試験restoreしてはいけない。まず別の使い捨てSupabase projectでmigration履歴、DDL、ACL、RLS、data replayを再構成して確認する。

live ledger 13件とrepository migration files 26件に差があり、二つの2026-09-30 privilege ledger entriesには `supabase/migrations` 内の対応SQLがない。このため既存migrationだけで現行DBを再現する手順は確立していない。手動DDL適用や本番上書きの前に、管理者権限を持つ運用担当者がledgerと未収録のprivilege変更SQLを照合する。

復元する場合は対象project refを二重確認し、テーブル件数・RLS・policy・function・GRANT・default ACLを比較する。data replayは対象DBが空であることを個別確認した後だけ実行する。スクリプトにDELETE/TRUNCATEは含まれないが、既存データのあるDBに対する再実行を想定していない。

## D. Supabase Auth（秘密情報はこの文書に書かない）

Dashboard上で手動確認・再設定する項目：

- Google Providerの有効状態とOAuth credential（秘密値は安全な既存保管元から復旧）
- Supabase Site URLとRedirect URL allow list
- 正式URL：`https://chawan4416-stack.github.io/CPL-ORIGIN/`
- OAuth `redirectTo`：正式トップのルート（コードでは `new URL('./', location.href).href`）
- Browser storage key：`cpl-web-ekgislctkribtztazvsd-research-v1-auth`
- `auth-return.js`、cookie/session保存動作、callback後のURL

Site URL／allow-listのDashboard実値は2026-10-02の読取経路では取得できていないので、上記URLから推測して設定しない。Google secret、service_role key、token、auth.usersをGitHubや本バックアップへ保存しない。

## E. 復元後の確認

- branch/commitとPages workflow source SHAが意図した基準に一致
- 正式トップ、login image、home image、research.html、主要CSS/JSが配信
- Google login/logout、OAuth復帰、再読込でログイン画面フラッシュなし
- research.htmlの4ナビ、適性／状態入力・集計・記録が起動
- 全public table countsがバックアップの値と一致
- 全11テーブルでRLS有効、23 policies、15 public functions/RPC、5 triggers、26 indexes、69 constraintsを照合
- live table/routine/sequence grantsとdefault privilegesを照合
- RLSによるユーザー分離をテスト用ユーザーで確認
- 既存の本番研究データを破壊する試験は行わない
