# CPL Ver.1.0 正式完成記録

完成日：2026-10-02（JST）

## 完成基準

- アプリケーション基準コミット：`f481363ba48a5a701a32013ec7c7e5e141190699`
- 親コミット：`f55f9793b45c27d34451b806e1f87509d7211e31`
- OAuthフラッシュ修正のDEV確認元：`1abe3d036bd62f6ebf8c8c6224f86e490d864543`
- Git tag `v1.0.0)：この記録作成時点でGitHub上に存在しない。上書きは行っていない。接続されたGitHub操作ではタグ作成が提供されず、ローカルpushも認証できなかったため未作成。タグ付与先として固定すべきcommitは上記の完成基準。
- 正式公開URL：<https://chawan4416-stack.github.io/CPL-ORIGIN/>
- 正式公開：GitHub Pages。専用workflow「Deploy CPL to GitHub Pages」のみ。
- 正式workflow run：36962380984（2026-10-02、成功）。公開ブランチ `supabase-v1` とrunのsource SHAはともに完成基準commit。
- 本記録・復元手順は `cpl-v1.0-completion-record` ブランチに保存。これは文書だけのブランチで、Pages公開ブランチ・公開物を変更しない。アプリケーション基準点は常に上記commit。

## Ver.1.0の完成範囲

### 認証・入口

- Supabase AuthによるGoogle OAuth、ユーザーごとのセッション
- OAuth復帰後、初期セッション確認前に未ログイン画面を表示しない制御
- 完成済みログイン画面、ログイン後HOME、ログアウト
- 正式storage key：`cpl-web-ekgislctkribtztazvsd-research-v1-auth`
- OAuthのredirectToは現在の正式URLルート（コード上は `new URL('./', location.href).href`）。Supabase DashboardのSite URL／Redirect URL許可リスト実値はこのバックアップ作業からは取得できていないため、復旧時にDashboardで確認する。

### 1Focusレース情報入力

開催日、競馬場、芝・ダート、距離、コース形態、馬場状態、レース、頭数、クラスを順に入力する。

### 適性研究

- 公式1〜3着馬、人気を対象に保存・復元
- 胸前4段階、トモ6段階、張り3段階
- 5条件（競馬場、芝／ダート、距離、コース形態、馬場状態）による集計
- 馬体図、胸前×トモの組み合わせ表示

### 状態研究

- 完走、競走中止、出走取消、公式着順、人気を記録
- 複数の状態項目を選択して保存・復元
- 着順から複勝圏／着外を導出し、完走馬を母数として集計
- 人気帯、クラス、基準状態を含む実在2状態ペアの集計

### 記録・ナビゲーション

- ログインユーザー自身の研究記録を確認
- 研究室の4ナビ：適性研究／状態研究／集計／記録

## 正式DBの2026-10-02読み取りスナップショット

Supabase project ref：`ekgislctkribtztazvsd`（PostgreSQL 17.6.1.166、ap-northeast-1）

| public table | 件数 |
|---|---:|
| races | 0 |
| race_results | 0 |
| master_options | 472 |
| course_research | 2 |
| research_hypotheses | 2 |
| race_evaluations | 0 |
| race_evaluation_revisions | 0 |
| race_runner_evaluations | 0 |
| race_runner_outcomes | 0 |
| suitability_observations | 0 |
| condition_observations | 0 |
| **合計** | **476** |

11テーブルすべてRLS有効。現行カタログの確認値：constraints 69、indexes 26、policies 23、triggers 5、public functions/RPC 15、extensions 5、table grants 144、routine grants 30、sequence grants 2、default-privilege entries 6。バックアップはpublic schemaの読取専用調査。Auth schema、auth.users、認証秘密情報は含めていない。

## バックアップ

- 私有保存ファイル：`CPL_Ver1.0_Formal_DB_20261002.zip`（ChatGPT Libraryの非公開保存）
- 含有物：現行public schemaカタログ、RLS／policy／function／trigger／index／constraint情報、GRANTとdefault privilegeのスナップショット、11 public tableの全データ、空DB向けのdata replay SQL、SHA-256 manifest
- このファイルはnative `pg_dump` ではなく、論理カタログ＋データスナップショット。安全な空の復元先を用意できず、restore executionは未試験。完全な災害復旧イメージとしての動作は未証明。詳細は復元手順書を参照。

## 既知の保留事項・Ver.2送り

- 地方6場（大井・船橋・川崎・浦和・園田・盛岡）の旧key形式：COURSE 21行、DISTANCE 153行、計174行。既存行を保持し、Ver.2で距離体系・コース形態・取得／保存検証を再設計する。Ver.1.0対象外。
- `supabase_admin` 作成分default privileges：将来の新規テーブル作成時に作成者、owner、anon／authenticated／service_role権限、TRUNCATEを再確認する運用管理事項。Ver.1.0の即時完成阻害要因ではない。
- `research.html` の認証前UIにはトップと類似する初期構造がある。実機でフラッシュ現象は確認されておらず、Ver.1.0では先回り修正しない。
- 旧競馬場研究UIはVer.1.0で復活させない。DBのcourse_research 2件は保持。

## migration監査

完成基準commitのリポジトリには `supabase/migrations/0001_cpl_v1.sql`〜`0026_condition_focus_model.sql` の26ファイルがある。一方、live migration ledgerは13件で、0001〜0017の番号の行がなく、2026-09-30のTRUNCATE権限／default privileges関連2件は `supabase/migrations` 内に対応ファイルがない。DBのread-only snapshotは保存したが、migration replayのみで現行DBを再構成できるとは確認できていない。詳細は復元手順書の制約を参照。

## 正式公開asset照合

正式ブランチ `supabase-v1` のHEAD、成功済みPages workflow run 36962380984のsource SHA、公開HTML画面を確認し、いずれも `f481363ba48a5a701a32013ec7c7e5e141190699` と一致した。公開画面は完成済みCPLログイン画像と独立した「Googleでログイン」ボタンを表示。画像参照は `assets/cpl-login-entrance-no-button.png` と `assets/cpl-home-paddock.jpg`。この記録作成中に正式アプリ、Pages公開内容、DBは変更していない。
