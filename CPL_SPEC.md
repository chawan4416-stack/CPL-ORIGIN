# CPL Ver1.0 Specification

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
7. 馬体評価7項目を記録する
8. 同一レースは上書き保存できる
9. ユーザーは自分の登録データのみ削除できる
10. Ver1.0では研究・分析機能を実装しない

## Body Evaluation

- 胸前
- トモ
- 歩様
- 前後バランス
- ハリ
- 腹回り
- パドック総評

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

## Ver1.0 Scope

### Included

- Googleログイン
- HOME
- レース情報入力
- 1着〜3着入力
- 人気・単勝オッズ入力
- 馬体評価入力
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

レース単位の基本情報を保持します。

### `race_results`

1着〜3着の着順、人気、単勝オッズ、馬体評価を保持します。

### `master_options`

レース・馬体評価に使用するマスタ値を保持します。

## Operational Rules

- 保存処理はDB側RPCを経由する
- DB側でも入力値を検証する
- 重複レースはDB側で防止する
- 更新時は`updated_at`を更新する
- 定期保守は`maintenance_ping()`を使用する
- バックアップは`ops/CPLBackup.gs`を使用する
