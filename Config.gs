/**
 * CPL Ver1.0 configuration.
 */
const CPL_CONFIG = Object.freeze({
  DB_SHEET: 'DB',
  START_SHEET: 'HOME',
  APP_TITLE: 'CPL',
  VERSION: 'Ver1.0'
});

const RACE_MASTER = Object.freeze({
  RACECOURSES: Object.freeze([
    '札幌','函館','福島','新潟','東京','中山','中京','京都','阪神','小倉',
    '大井','船橋','川崎','浦和','園田','盛岡'
  ]),
  SURFACE: Object.freeze(['芝','ダート']),
  TRACK_CONDITION: Object.freeze(['良','稍重','重','不良'])
});

function getCplConfig() {
  return JSON.parse(JSON.stringify(CPL_CONFIG));
}
