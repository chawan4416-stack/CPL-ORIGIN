/**
 * CPL Web App entry point.
 */
function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle(CPL_CONFIG.APP_TITLE)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function getAppData() {
  const master = getMasterData();
  return {
    title: CPL_CONFIG.APP_TITLE,
    version: CPL_CONFIG.VERSION,
    racecourses: master.RACE.RACECOURSES,
    surfaces: master.RACE.SURFACE,
    trackConditions: master.RACE.TRACK_CONDITION,
    body: master.BODY,
    raceCount: getRaceCount()
  };
}

function submitRace(payload) {
  saveRace(payload);
  return { ok: true, raceCount: getRaceCount() };
}
