# CPL Web Ver.1.0 適性研究 集計完成基準点

- DEV完成基準: `cpl-research-v1-dev` commit `d59d15503cda7a766ca258431a56d89ecf4933ff`、所有者限定Site Ver.55。
- 正式版はDEV Ver.55の集計UI、馬体線画、6色定義、胸前・トモの着色pathをそのまま採用。path `horseChestFill` と `horseHindFill` の `d` 属性はDEV Ver.55と完全一致し、以降は形状を固定する。
- 集計条件は競馬場・芝ダート・距離・コース形態・馬場状態の5つ。RPC `research_suitability_distribution(jsonb,boolean)` の記録済み1〜3着を24通りに集計し、上位3組と母数を表示。0件では図を表示しない。
- カラー値: シャープ− `#94C6D9`、シャープ `#468FB4`、厚− `#E8D78E`、厚 `#EAA54D`、重厚− `#E7A0A8`、重厚 `#C95F70`。
- 胸前は4段階、トモは6段階。選択で色だけ切り替え、線画とマスクは固定。
- DB / RPC / RLS / GRANTは0026までの正式仕様を再利用し、今回migrationを追加しない。既存の適性・状態入力、記録、認証、下書きキーは正式版のまま。
- 正式公開前と公開後のバックアップはそれぞれ `CPL_WEB_PreAggregateV1_20260929` と `CPL_WEB_AggregateV1_Formal_20260929`。DEV基準は `CPL_DEV_AggregateV1_Ver55_20260929`。
