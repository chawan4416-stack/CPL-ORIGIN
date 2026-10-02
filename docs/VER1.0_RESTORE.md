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


## Git tag `v1.0.0` を手動作成する場合

2026-10-02時点でGitHubに `v1.0.0` はなく、接続済みGitHub APIではtag作成ができなかった。端末のGitHub認証情報を作ったり要求したりしない方針のため、tagは未作成。手動で実施する場合は、正しいリポジトリのローカルcloneで以下を行う。

1. originが `chawan4416-stack/CPL-ORIGIN` を指すことを確認し、`git fetch origin supabase-v1` を実行。
2. `git cat-file -e f481363ba48a5a701a32013ec7c7e5e141190699^{commit}` が成功することを確認。
3. `git ls-remote --tags origin refs/tags/v1.0.0` でリモート同名tagがないことを確認する。存在する場合は中断し、上書きしない。
4. ローカルにも同名tagがないことを確認する。存在する場合は対象commitを調べ、勝手に移動・削除しない。
5. ない場合だけ以下を実行する。

```sh
git tag -a v1.0.0 f481363ba48a5a701a32013ec7c7e5e141190699 -m "CPL Ver.1.0 application baseline"
git push origin refs/tags/v1.0.0
```

6. `git ls-remote --tags origin refs/tags/v1.0.0` と `git rev-parse v1.0.0^{commit}` を確認し、tagが上記baselineを指すことを照合する。

**`-f` / force pushは使わない。** この手順はアプリケーションブランチを動かさない。


## Git tag `v1.0.0` を手動作成する場合

GitHub上では現時点でtagがなく、利用中のGitHub接続ではtag作成操作が提供されない。ローカルGitからもpush認証できなかったため未作成。作成時は完成記録内の「Git tag v1.0.0を手動作成する場合」の確認手順を使う。対象は必ず `f481363ba48a5a701a32013ec7c7e5e141190699`。同名tagがある場合は中断し、force pushしない。

## 2026-10-02 最終分類と復元試験結果

- **A — schema:** バックアップのカタログには11 public tablesの列、types/defaults相当の情報、PK/FK、69 constraints、26 indexes、11 RLS flags、23 policies、15 public functions/RPC、5 triggers、5 extensions、GRANTとdefault privilegesの値がある。直接実行可能な一括schema DDLではない。必要なDDLとowner設定をmigrationと照合して再構成する必要があり、その作業は未実施。
- **B — data:** 11 public tables計476 rowsのJSON、空スキーマ向けのdata replay SQLあり。内訳はmaster_options 472、course_research 2、research_hypotheses 2、他8テーブル0。JSON/manifest/checksumと復元用payloadをローカル検査済み。PostgreSQLでのSQL実行はしていない。
- **C — migration:** baseline repositoryに26 migration files、正式DB ledgerに13 records。0001–0015のledger entryがなく、0016/0017相当は別名で記録。2026-09-30の権限変更2件に対応するsource SQLも `supabase/migrations` にない。順次replayで現行DBを再現できるとは確認できない。既存migrationは変更しない。
- **D — Supabase手動設定:** Google OAuth Provider/secret、Site URL、Redirect URL allow list、project keys/project URL、Auth Dashboard設定。秘密値はバックアップ・公開Gitに入れず、既存の安全な保管元から手動復旧する。
- **E — 現バックアップから欠落:** `auth.users` 個人情報、秘密credential、Supabase Auth Dashboard設定のexport、native `pg_dump`、検証済みschema+data一括restore。

### 試験先とnative dump

作業環境に `postgres`、`initdb`、`pg_ctl`、`psql`、`pg_dump`、Docker、Podman、Supabase CLIは見つからず、ローカルDBでのrestore環境は利用できなかった。Supabase formal projectに既存のbranchもなかった。Supabase公式情報ではPreview Branchは別environmentだがcompute等のusage chargesが発生し得る。費用確認・branch作成は行わず、有料Supabase projectも作っていない。

Supabase公式のplatform dump手順は `supabase db dump`、Docker内の `pg_dump`、DB接続文字列/passwordを必要とする。今回はCLI/DockerとDB接続credentialが利用できないため**native pg_dump未取得**。正式DB/CPL-DEVへDDL/DML/restoreは一切実行していない。

### 復元可能な範囲・将来必要なもの

現スナップショットから public dataは、同じschemaが別途用意された空のDBへ再投入できる形で保管されている。public schemaの構造・RLS・ACL定義の照合資料もある。一方、schema構築を行う完全SQLと実行済みrestore検証が不足しているため、「ZIPだけで即時・完全復旧できる」とは言えない。

実復元が必要になったら、正式/DEVとは独立した使い捨て環境を先に確保する。追加課金が発生する環境を使う前に料金を明示確認する。完全なnative dumpを再取得する場合はSupabase CLI、Docker、DB接続文字列/passwordを安全なsecret入力経路で用意し、role/schema/data dumpを取得する。まずmigrationとlive catalogを照合してschema/ACLを再現し、次にdata replay、件数・RLS・policy・function・trigger・GRANTを比較する。Auth Provider、Site URL、Redirect URLsはDashboardで手動再設定・確認する。試験完了まで本番またはCPL-DEVへのrestoreは禁止。

公式参照：<https://supabase.com/docs/guides/self-hosting/restore-from-platform> および <https://supabase.com/docs/guides/platform/manage-your-usage/branching>。
