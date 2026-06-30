const { buildAspectDetail } = require('./aspect-detail');
const { canHaveRadiantFaces } = require('./aspect-quality');

let cache = null;

function buildAspectFaceCache(db) {
  const aspects = db.prepare('SELECT * FROM aspects ORDER BY id').all();
  const byId = {};
  for (const aspect of aspects) {
    const detail = buildAspectDetail(db, aspect);
    const faces = canHaveRadiantFaces(detail.quality) ? (detail.diamondFaces ?? detail.radiantFaces ?? []) : [];
    byId[aspect.id] = faces.map((f) => ({
      name: f.name,
      symbol: f.symbol,
      mantra: f.mantra,
      explanation: f.explanation,
    }));
  }
  cache = {
    byId,
    builtAt: new Date().toISOString(),
    aspectCount: aspects.length,
    faceCount: Object.values(byId).reduce((n, faces) => n + faces.length, 0),
  };
  return cache;
}

function getAspectFaceCache(db) {
  if (!cache) buildAspectFaceCache(db);
  return cache;
}

function getFacesForAspect(db, aspectId) {
  return getAspectFaceCache(db).byId[aspectId] || [];
}

function invalidateAspectFaceCache() {
  cache = null;
}

module.exports = {
  buildAspectFaceCache,
  getAspectFaceCache,
  getFacesForAspect,
  invalidateAspectFaceCache,
};