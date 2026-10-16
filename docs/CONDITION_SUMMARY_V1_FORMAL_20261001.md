# CPL Update Pack｜状態研究集計 Ver.1.0 正式採用

## 基準と追加範囲

旧正式完成基準は `01c1c2861e8a191040337e80cd603d6f800dd9af`。iPhone確認済みDEV Ver.74 (`618a1cd2eebf0c10606abf0a0e469c5d60faea3c`) の状態研究集計だけを追加する。DEV全体をmergeしない。本Update Packを含む正式commitが追加後の追跡基準となる。正式公開後はユーザーのiPhone最終確認を待つ。

## 採用仕様

- 7状態から1つ選択すると全体成績、人気帯別、クラス別、実在する2状態ペアを自動表示。競馬場等の5条件は使用しない。
- 公式数値着順を持つ完走記録だけが母数。1〜3着が複勝圏、4着以下が着外。中止・取消は除外し、存在するときだけ件数表示。完走0件では率を表示しない。
- 人気帯は1〜3、4〜6、7人気以下。クラス別は未勝利からG1までの既存9区分、新馬は除外。
- 同一記録内の基準状態と別1状態がペア。3状態以上の記録も各2状態ペアに寄与。固定順、実在するペアだけ表示。完走0＋除外のみでもカードを維持。手動追加・集計ボタン、ランキング・評価スコアは設けない。

## 移植と環境分離

`research.html` の状態パネル、`research.js` の取得・描画とDEV `condition-summary.js` の純粋集計モジュール、状態パネル専用CSSを移植。13資産構成を保つためモジュールは既存 `research.js` 内へ組み込み、独立公開資産は追加しない。CSS/JS参照versionは `20261001-condition-v1`。

正式Supabase、認証storageKey、OAuth復帰、入力・保存処理、正式ドラフトキー、記録、適性集計・A1/A2/A3、Ver.55線画/mask/6色を保持。ドラフトには集計種別と選択状態だけを追加し、既存ドラフトも復元できる。DEVの適性保存後レース初期化は移植しない。既存13資産許可リスト・安全検査・専用Pages workflowは変更しない。

## DB確認と0027

採用UIは `condition_observations` と `races!inner(race_class)` の既存authenticated SELECT/RLSで取得する。正式とDEVで必要なポリシー・保存RPCの定義が一致。DEVの0027 `research_condition_distribution(jsonb)` は採用UIから呼ばれないため昇格しない。migration/RPC/テーブル/権限/既存データ変更は0件。

既知のC2 supabase_admin作成分default privilegesはそのまま管理事項とする。新規DBオブジェクトは作成しない。地方6場174行はVer.2対象として保持。競馬場研究の入口なし・旧ページ404を維持。

## 検証と復旧

状態集計25試験、適性集計4試験を正式ソースに対して実行し、DEVバックアップの既存1試験も別途再実行。正式入力・保存・記録・認証復帰等の既存オフライン25試験、OAuth callback3試験、A1/A2 cascade検査を実行。実研究データへ試験用書込みを行わない。公開後に13資産のHTTPとGit一致、単一専用deploy、旧導線404、DEV参照なし、DB内容ハッシュ/ACL/RLS/RPC不変を検証する。

ロールバックは本Update Packを含む状態集計正式反映commitだけをrevertして、同じ専用workflowで再公開。旧基準は上記SHA。DB復旧・権限変更は不要。GoogleログインとiPhoneでの最終操作はユーザーの実機確認で完了する。

## 📚 関連設計書

- [CPL_SPEC.md](../CPL_SPEC.md)：研究憲章。旧記述の履歴を保持し、本Update Packを状態集計採用差分の補足とする。
- [適性研究集計完成基準](RESEARCH_V1_AGGREGATE_BASELINE_20260929.md)：Ver.55資産と適性集計仕様は不変。
- `CPL_Formal_Audit_20260930.md`、`CPL_Ver1_Final_Verification_20261001.md`：旧完成基準と監査判断。
- DEV Ver.71〜74の母数表示・見出し・自動ペア・ボタン不在記録：DEV採用履歴。DEV環境設定は正式へ移植しない。
