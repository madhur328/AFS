const STATUSES = ['active', 'inactive', 'completed'];

function normalizeStatus(status, fallback = 'active') {
  return STATUSES.includes(status) ? status : fallback;
}

function clampProgress(progress, fallback = 0) {
  if (progress == null) return fallback;
  return Math.max(0, Math.min(1, Number(progress) || 0));
}

function validateCreate(body = {}) {
  const title = body.title?.trim();
  if (!title) return { error: 'title required' };
  return {
    title,
    description: body.description || '',
    target_date: body.target_date || null,
    aspect_link: body.aspect_link || '',
    status: normalizeStatus(body.status),
    progress: clampProgress(body.progress),
  };
}

function mergePatch(row, body = {}) {
  return {
    title: body.title != null ? String(body.title).trim() || row.title : row.title,
    description: body.description != null ? body.description : row.description,
    target_date: body.target_date !== undefined ? body.target_date : row.target_date,
    aspect_link: body.aspect_link != null ? body.aspect_link : row.aspect_link,
    progress: body.progress != null ? clampProgress(body.progress, row.progress) : row.progress,
    status: body.status != null ? normalizeStatus(body.status, row.status) : row.status,
  };
}

module.exports = {
  STATUSES,
  normalizeStatus,
  clampProgress,
  validateCreate,
  mergePatch,
};