/**
 * CPL MasterData
 * Ver1.0暫定。選択肢はここを正として管理する。
 */
const MASTER_DATA = Object.freeze({
  BODY: Object.freeze({
    CHEST: Object.freeze(['シャープ', '普通', '厚', '重厚']),
    HINDQUARTER: Object.freeze(['シャープ', '普通', '厚', '重厚']),
    GAIT: Object.freeze(['チャカ付き', '歩幅短い', '歩幅長い', '普通', 'スムーズ']),
    BALANCE: Object.freeze(['良い', '普通', '悪い']),
    TONE: Object.freeze(['パンパン', '普通', 'ゴム感']),
    ABDOMEN: Object.freeze(['普通', '太い'])
  })
});

function getBodyMaster() {
  return JSON.parse(JSON.stringify(MASTER_DATA.BODY));
}
