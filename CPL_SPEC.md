# CPL Ver1.0 Specification

## 2026-09-27 研究憲章・CPL-DEV実装（以下を現行の研究方針とする）

1. データが先、解釈は後。過去の評価でなく観察した馬体と状態を記録する。
2. 適性研究と状態研究は入力・集計を分離する。共通レースは`races`を使う。適性は人気、状態は馬番と人気を記録する。新しい適性記録に馬番はなく、両研究の同一馬照合はできない。
3. 必要なデータから集め、必要になったときに深掘りする。全頭評価βは将来用に保存する。
4. 適性は原則1〜3着の胸前4段階、トモ6段階、ハリ3択。前後バランス、膁部のくびれは入力しない。
5. 状態は結果が分かった後、目立った馬だけを一画面で登録。チャカつき、ぎこちない歩様、イレ込み・あり／強、発汗・あり／強、早歩きを複数選択できる。未選択は異常なしを意味しない。
6. 適性の24通りを元データとし、18通りは胸前「厚−」「厚」の集計表示だけを統合する。分母は記録した好走馬であり全出走馬ではない。
7. 状態の結果は1〜3着、着外、競走中止、出走取消。取消は人気なし、中止は公式着順なし。状態集計は選択して記録した馬だけの成績であり全出走馬の好走率ではない。

実装は`0023_research_split.sql`、`0024_research_integrity.sql`、`0025_suitability_popularity.sql`、`research.html`、`research.js`。旧来の以下の仕様と完成チェックは、旧入力・全頭評価βの履歴として保存し、新研究の現行要件には適用しない。本番切替までは旧画面も残す。

## Purpose

CPL（Chawan Paddock Labs）は、レース後の事実を蓄積し、条件 × 結果 × 馬体から研究するためのシステムです。

予想ソフトではありません。Ver1.0では研究・分析を行わず、研究用データの収集を優先します。

## Core Rules

1. 馬名は入力・保存しない
2. レース前の予想・評価は入力しない
3. 入力はレース終了後に行う
4. 1レース＝1回の保存
5. 1着〜3着のみ記録する
6. 人気・単勝オッズは客観データとして保存する
7. パドック評価8項目を記録する
8. 競走条件を記録する（競馬場ごとのマスタにより将来の地方競馬体系にも対応する）
9. 同一レースは上書き保存できる
10. ユーザーは自分の登録データのみ削除できる
11. 入力途中のデータは端末のブラウザに一時保存し、アプリを離れても再開できる
12. Ver1.0では研究・分析機能を実装しない

## Paddock Evaluation

- 胸前
- トモ
- 歩様（チャカ付きは歩様として記録）
- 前後バランス
- ハリ
- イレ込み
- 発汗
- パドック総評

イレ込み・発汗は例外入力方式とします。

- 未入力 = 問題なし
- `あり` = 明確に認める
- `強` = 強く認める

イレ込み・発汗以外の評価項目は通常どおり必須入力です。

腹回りは、1着〜3着のみを蓄積するVer1.0の研究データでは集計価値が低いため、標準項目から除外します。

## Architecture

```text
Smartphone Web App
        ↓
Supabase Auth（Google OAuth）
        ↓
Supabase PostgreSQL
```

- Hosting: GitHub Pages
- Authentication: Supabase Auth
- Database: Supabase PostgreSQL
- Row Level Security: enabled
- Master data: `master_options`
- Race data: `races`
- Result/body data: `race_results`
- Authoritative save operation: `save_race()`
- Delete operation: `delete_race()`
- Unfinished input draft: browser `localStorage`, keyed per authenticated user

## Design Principles

### Focus Design

研究者の思考を止めない。必要な操作だけを、その時点で必要な順番に提示する。

### Smartphone First

片手・親指操作を前提とし、画面遷移と入力操作を最小化する。

### Quiet UI

派手な演出を避け、保存完了時などの通知も必要最小限にする。

### Single Source of Truth

DB側の定義・制約を正とし、マスタ値は`master_options`を正とする。

### Data First, Interpretation Later

CPLはデータを整理する。意味づけ・研究・解釈は後続バージョンで行う。

### Processing and Data Must Never Be Mixed

処理ロジックとマスタデータを分離し、保守性を確保する。

## Input Continuity

CPLの入力は、Racing Viewer、netkeiba、ブラウザ、ChatGPTなどを行き来しながら行うことを前提とします。

そのため、入力途中のレースデータをブラウザの`localStorage`へ自動保存します。

- 入力・変更のたびに下書きを更新する
- アプリが再読み込みされても下書きを復元する
- 入力画面を復元し、可能な範囲でスクロール位置も復元する
- 保存成功時に下書きを削除する
- 下書きは認証ユーザー単位で分離する
- 下書きはSupabaseへ送信しない
- 旧draft version 1も読み込み可能とし、今回の項目変更で入力途中データを失わない

## Ver1.0 Scope

### Included

- Googleログイン
- HOME
- レース情報入力
- 1着〜3着入力
- 人気・単勝オッズ入力
- パドック評価入力
- 入力途中データの自動保持・復元
- 保存
- 重複レースの上書き
- 登録済みデータ確認
- 自分のデータ削除
- Master参照
- Daily Maintenance
- Google Driveバックアップ

### Excluded

- 馬名管理
- レース前評価
- 予想
- 全頭入力
- 研究室・検索・分析
- 評価履歴管理
- 高度な統計・自動解釈

## Data Model

### `races`

レース単位の基本情報と、任意の`race_class`（競走条件）を保持します。既存データと、競走条件マスタ未設定の競馬場では`race_class`をNULLにできます。

### `race_results`

1着〜3着の着順、人気、単勝オッズ、パドック評価を保持します。

`agitation`（イレ込み）と`sweating`（発汗）はNULLを「問題なし」として扱います。`abdomen`（腹回り）は本番データ0件の段階でスキーマから削除します。

### `master_options`

レース・パドック評価に使用するマスタ値を保持します。競走条件は`category = 'RACE_CLASS'`、`field_key = 競馬場名`で管理し、競馬場ごとに異なる体系を追加できます。

イレ込みは`BODY / AGITATION`、発汗は`BODY / SWEATING`で管理し、いずれも`あり / 強`を選択値とします。

## Operational Rules

- 保存処理はDB側RPCを経由する
- DB側でも入力値を検証する
- 重複レースはDB側で防止する
- 更新時は`updated_at`を更新する
- 定期保守は`maintenance_ping()`を使用する
- バックアップは`ops/CPLBackup.gs`を使用する
- 現行バックアップ形式はversion 4
