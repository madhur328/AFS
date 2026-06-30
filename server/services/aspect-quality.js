const { isGenericRadiantFaces } = require('./grok-extract');

/** Synthesis tools that may produce faceted aspects (radiant-face lattice). */
const FACET_SYNTHESIS_OPERATORS = new Set(['DCS', 'RCS', 'RDTQ']);

/** EOT is the adaptive entry router — may output basic or route upward. */
const EOT_OPERATOR = 'EOT';

/**
 * Synthesis grade (Save8 clarified hierarchy):
 * - basic     → Basic Aspects (simple ore / AFP / EOT without facet lattice)
 * - diamond   → Diamond Aspects (DCS)
 * - resonant  → Resonant Diamond Aspects (RCS + FMH)
 * - infinite  → Infinitely Resonant Diamond Aspects (RDTQ + Hamsa synthesis)
 */
function gradeFromOperator(operator) {
  switch (operator) {
    case 'RDTQ':
      return 'infinite';
    case 'RCS':
      return 'resonant';
    case 'DCS':
      return 'diamond';
    default:
      return 'basic';
  }
}

function resolveAspectQuality(aspect, detail = {}) {
  const faces = detail.radiantFaces || detail.diamondFaces || [];
  const hasFacets = faces.length >= 2 && !isGenericRadiantFaces(faces);
  const routedTool =
    detail.integration?.routedTool || detail.integration?.operator || 'AFP';

  if (!hasFacets) return 'basic';

  const grade = gradeFromOperator(routedTool);
  if (grade !== 'basic') return grade;

  // EOT entry routed upward (legacy rows with operator EOT but facet lattice present)
  if (routedTool === EOT_OPERATOR) {
    if (detail.masterFusion?.name && aspect.category === 'red-leaf') return 'infinite';
    return 'diamond';
  }

  if (['S', 'A'].includes(aspect.tier) && hasFacets) return 'diamond';

  return 'basic';
}

/** Legacy API/UI values before Save8 4-tier grades. */
function normalizeAspectQuality(quality) {
  if (quality === 'master') return 'infinite';
  if (quality === 'diamond' || quality === 'resonant' || quality === 'infinite' || quality === 'basic') {
    return quality;
  }
  return 'basic';
}

function canHaveRadiantFaces(quality) {
  const q = normalizeAspectQuality(quality);
  return q === 'diamond' || q === 'resonant' || q === 'infinite';
}

function operatorForGrade(grade) {
  switch (grade) {
    case 'infinite':
      return 'RDTQ';
    case 'resonant':
      return 'RCS';
    case 'diamond':
      return 'DCS';
    default:
      return 'EOT';
  }
}

module.exports = {
  resolveAspectQuality,
  normalizeAspectQuality,
  canHaveRadiantFaces,
  gradeFromOperator,
  operatorForGrade,
  FACET_SYNTHESIS_OPERATORS,
  EOT_OPERATOR,
};