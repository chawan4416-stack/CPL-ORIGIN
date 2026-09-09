/**
 * CPL Ver1.0 configuration.
 * Master data lives in MASTER_DATA.gs; this file contains configuration only.
 */
const CPL_CONFIG = Object.freeze({
  DB_SHEET: 'DB',
  START_SHEET: 'HOME',
  APP_TITLE: 'CPL',
  VERSION: 'Ver1.0'
});

function getCplConfig() {
  return JSON.parse(JSON.stringify(CPL_CONFIG));
}
