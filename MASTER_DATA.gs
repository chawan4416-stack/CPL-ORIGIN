/**
 * CPL MasterData
 * Ver1.0暫定。選択肢はここを正として管理する。
 */
const MASTER_DATA = Object.freeze({
  RACE: Object.freeze({
    RACECOURSES: Object.freeze([
      '札幌', '函館', '福島', '新潟', '東京', '中山', '中京', '京都', '阪神', '小倉',
      '大井', '船橋', '川崎', '浦和', '園田', '盛岡'
    ]),
    SURFACE: Object.freeze(['芝', 'ダート']),
    TRACK_CONDITION: Object.freeze(['良', '稍重', '重', '不良'])
  }),
  BODY: Object.freeze({
    CHEST: Object.freeze(['シャープ', '普通', '厚', '重厚']),
    HINDQUARTER: Object.freeze(['シャープ', '普通', '厚', '重厚']),
    GAIT: Object.freeze(['チャカ付き', '歩幅短い', '歩幅長い', '普通', 'スムーズ']),
    BALANCE: Object.freeze(['良い', '普通', '悪い']),
    TONE: Object.freeze(['パンパン', '普通', 'ゴム感']),
    ABDOMEN: Object.freeze(['普通', '太い'])
  })
});

function getMasterData() {
  return JSON.parse(JSON.stringify(MASTER_DATA));
}

function getBodyMaster() {
  return getMasterData().BODY;
}
