# CPL-DEV Update Pack｜状態研究集計の母数・除外表示

対象：状態研究集計の表示のみ。正式Ver.1.0基準01c1c2861e8a191040337e80cd603d6f800dd9afは変更しない。

## 表示契約

- 全体結果・AND組み合わせ結果：`n=○頭（完走）`。
- 完走かつ公式着順1〜3が複勝圏、4以上が着外。既存集計ロジックは変更しない。
- `集計対象外：競走中止 ○頭 / 出走取消 ○頭`を結果カード末尾に表示。0件の項目は省略、両方0件なら要素を非表示。
- 人気帯・クラス別は見出しに`完走母数`を添え、除外件数を繰り返さない。
- 完走0件は既存の該当データなし／n=0を維持。中止取消だけがある場合は除外件数を表示する。
- 組み合わせの除外件数も、そのAND条件を同一観察行で満たす記録に限定する。
- RPC、0027、保存、マスター、認証、RLSは変更しない。

## 変更と検証

research.html / research.js / research.css、表示試験tests/condition-summary-display.test.cjs。CSS・research.js参照を20261001-condition-sampleへ更新。他資産の参照versionは維持。

既存12試験に加え、完走のみ／中止併存／取消併存／両方併存／除外のみ／記録0／ANDの母数・除外範囲／再取得中の表示消去を確認する。実DB書込みは行わず、実際の表示関数をローカルDOM/API環境で検証する。iPhone実機確認はDEV公開後にユーザーが実施する。

## 📚 関連設計書

- CPL_Condition_Summary_DEV_Resume_Audit_20261001.md：2026-10-01のDEV現在地・確定設計との差分調査。
- docs/CONDITION_SUMMARY_V1_DEV.md：旧設計履歴。現在UIの5条件なし・状態選択設計と一致しない箇所があるため、旧文書を新規仕様決定に優先しない。
- CPL_Formal_Audit_20260930.md / CPL_Ver1_Final_Verification_20261001.md：正式Ver.1.0完成基準点A、正式を変更しない運用。

ロールバックは、このUpdate Packの表示変更commitだけをDEVでrevertし、所有者限定DEVへ再公開する。DB復旧は不要。
