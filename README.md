# CPL（Chawan Paddock Labs）

CPLは、馬を追跡するシステムでも予想ソフトでもありません。

レース後の事実だけを蓄積し、**条件 × 結果 × 馬体**から、その日に走れる馬体を研究するためのシステムです。

## Ver1.0

- 馬名は入力・保存しない
- レース前の予想・評価は入力しない
- 人気・単勝オッズはレース結果入力時の客観データとして保存
- 1レース＝1回の保存
- 1着〜3着だけを記録
- **Supabase PostgreSQL** を永続DBとして使用
- **Googleログイン**を使用
- スマートフォンファーストのWebアプリ
- Ver1.0ではデータ収集と保存を優先
- 馬体研究室の分析機能はVer1.1以降

## Architecture

`スマートフォンWebアプリ → Supabase Auth → Supabase PostgreSQL`

- GitHub：ソースコード管理
- Supabase：認証・DB・RLS
- Google Sheets：DBとして使用しない
- `races`：レース条件
- `race_results`：1〜3着の結果＋馬体
- `master_options`：入力マスター
- `save_race()`：1レースを原子的に保存

## Setup

1. Supabaseでプロジェクト `CPL` を作成する
2. `supabase/migrations/0001_cpl_v1.sql` をSupabase SQL Editorで実行する
3. Google OAuthをSupabase Authに設定する
4. `supabase/config.js` にProject URLとpublishable keyを設定する
5. 静的Webホスティングへデプロイする

`service_role` keyはブラウザへ公開しない。Webアプリはpublishable/anon key＋RLSで接続する。

## Ver1.0 Scope

CPLは「馬を追う」ためのシステムではありません。

**条件 × 結果 × 馬体**を蓄積し、将来の研究機能で組み合わせを分析します。
