# CPL-DEV Ver.74｜不要な組み合わせ集計ボタン確認

2026-10-01。基準DEV 6407ccbe1510ab758195985a4d8efad489c00e18。

現在のVer.73ソースでは「この組み合わせで集計」、runConditionCombination、conditionExtraButton、conditionExtraChoices、および専用イベント・DOM参照は既に削除済み。実機画像に旧UIが見られたため、ボタンなしの現行アプリ内容をVer.74として再公開する。

research.html／research.js／research.css／condition-summary.jsはVer.73とバイト一致を維持する。UI・カード・集計・自動抽出・状態順序は変更しない。本記録のみを追加する。既存30テストを再実行し30/30成功。実機の旧表示の原因は断定していない。確認URLはresearch.html?v=74。

RPC／migration／DB／RLS／Google認証／正式環境は無変更。公開後iPhone確認待ちで停止。

📚 関連設計書：docs/CONDITION_COMBINATIONS_AUTO_20261001.md、CPL_DEV_Ver73_Auto_Combinations_20261001.md。
