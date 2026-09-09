/**
 * CPL Web App entry point.
 */
function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('CPL')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function getAppData() {
  return {
    title: CPL_CONFIG.APP_TITLE,
    version: CPL_CONFIG.VERSION,
    racecourses: RACE_MASTER.RACECOURSES,
    surfaces: RACE_MASTER.SURFACE,
    trackConditions: RACE_MASTER.TRACK_CONDITION,
    body: getBodyMaster(),
    raceCount: getRaceCount()
  };
}

function submitRace(payload) {
  saveRace(payload);
  return { ok: true, raceCount: getRaceCount() };
}
