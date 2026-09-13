# CPL（Chawan Paddock Labs）

CPLは、馬を追跡するシステムでも予想ソフトでもありません。

**レース後の事実だけを蓄積し、条件 × 結果 × 馬体から、その日に走れる馬体を研究するためのシステムです。**

## Ver1.0

Ver1.0の目的は、研究に使えるデータを正しく・軽く蓄積することです。

- 馬名は入力・保存しない
- レース前の予想・評価は入力しない
- レース終了後に入力する
- 人気・単勝オッズは客観データとして保存する
- 1レース＝1回の保存
- 1着〜3着だけを記録する
- 馬体評価7項目を記録する
- 重複レースは上書き保存に対応する
- 登録済みデータの確認・自分のデータの削除に対応する
- Ver1.0では研究・分析機能は実装しない

## 現在のアーキテクチャ

```text
スマートフォンWebアプリ
        ↓
Supabase Auth（Googleログイン）
        ↓
Supabase PostgreSQL
```

- UI：スマートフォンファーストのWebアプリ
- 公開：GitHub Pages
- 認証：Supabase Auth + Google OAuth
- DB：Supabase PostgreSQL
- RLS：ユーザー単位でアクセス制御
- マスタ：`master_options`
- レース：`races`
- 着順・馬体評価：`race_results`
- 保存処理：`save_race()`
- 削除処理：`delete_race()`
- 定期保守：GitHub Actions → `maintenance_ping()`
- バックアップ：`ops/CPLBackup.gs` によるGoogle Driveバックアップ

## データの考え方

**データが先、解釈は後。**

CPLは予想を作るのではなく、レース後の事実を整理して蓄積します。研究・解釈は、その蓄積データをもとに後続バージョンで行います。

また、**処理とマスタデータを混在させない**ことを基本とします。

## Ver1.0で記録する馬体評価

- 胸前
- トモ
- 歩様
- 前後バランス
- ハリ
- 腹回り
- パドック総評

## セキュリティ・整合性

- Supabase RLSを使用
- 保存処理はDB側の`save_race()`を正とする
- DB側でも入力値を検証する
- 同一ユーザー・同一レースの重複を防止する
- 上書き保存に対応する
- `updated_at`で最終更新を管理する
- ユーザーは自分の登録データのみ削除できる

## バックアップ

公式バックアップはGoogle Drive方式です。

`ops/CPLBackup.gs` がSupabaseの `races` / `race_results` を取得し、JSON形式でユーザー自身のGoogle Drive内の `CPL_BACKUP` フォルダへ保存します。

- 世代管理：最新12世代
- バックアップ対象：レース情報・着順・馬体評価
- 現行バックアップ形式：version 2

## リポジトリ構成

```text
CPL-ORIGIN/
├─ index.html
├─ app.js
├─ styles.css
├─ privacy.html
├─ CPL_SPEC.md
├─ VER1.0_READY.md
├─ VER1.0_COMPLETION.md
├─ ops/
│  └─ CPLBackup.gs
├─ supabase/
│  ├─ config.js
│  ├─ config.example.js
│  └─ migrations/
└─ .github/
   └─ workflows/
      ├─ cpl-maintenance.yml
      └─ deploy-pages.yml
```

## セットアップ・運用

### 1. Supabase

Supabaseプロジェクトを用意し、`supabase/migrations/` のマイグレーションを番号順に適用します。

現在のVer1.0では `0001`〜`0008` が対象です。

### 2. Googleログイン

Supabase AuthでGoogle OAuthを設定し、公開WebアプリのURLをRedirect URLとして登録します。

### 3. Webアプリ設定

`supabase/config.js` に公開用Supabase URLとAnon/Publishable Keyを設定します。

### 4. GitHub Pages

GitHub PagesをGitHub Actionsから公開します。

公開URL：
`https://chawan4416-stack.github.io/CPL-ORIGIN/`

## Ver1.0の完成条件

1. Googleログインできる
2. HOMEが表示される
3. レース情報を入力できる
4. 1着〜3着を入力できる
5. 馬体評価7項目を入力できる
6. 1レースを保存できる
7. 重複時に上書きできる
8. 登録済みデータを確認できる
9. 自分の登録データを削除できる
10. Masterを参照できる
11. Daily Maintenanceが正常に動作する
12. Google Driveバックアップが正常に動作する
13. スマートフォン実機で一連の操作を完了できる

## 次のバージョン

研究・検索・分析機能はVer1.1以降で実装します。

Ver1.0では、**まず研究できるデータを壊さず蓄積すること**を優先します。
