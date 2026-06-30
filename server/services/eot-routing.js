/**
 * Save8 EOT meta-routing — entry is always EOT; routedTool declares synthesis grade applied.
 * EOT (direct) → basic · DCS → diamond · RCS → resonant · RDTQ → infinite
 */
const { gradeFromOperator } = require('./aspect-quality');
const { isGenericRadiantFaces } = require('./grok-extract');

const ROUTED_TOOLS = new Set(['EOT', 'DCS', 'RCS', 'RDTQ']);

function hasFacetLattice(faces) {
  return faces?.length >= 2 && !isGenericRadiantFaces(faces);
}

function inferRoutedTool(aspect, { faces = [], curated, integration = {}, masterFusion } = {}) {
  if (curated?.operator && ROUTED_TOOLS.has(curated.operator) && curated.operator !== 'EOT') {
    return curated.operator;
  }
  if (integration.routedTool && ROUTED_TOOLS.has(integration.routedTool)) {
    return integration.routedTool;
  }
  if (integration.operator && ROUTED_TOOLS.has(integration.operator) && integration.operator !== 'EOT') {
    return integration.operator;
  }
  if (!hasFacetLattice(faces)) return 'EOT';
  if (curated?.operator === 'RDTQ') return 'RDTQ';
  if (integration.operator === 'RDTQ') return 'RDTQ';
  if (integration.operator === 'RCS') return 'RCS';
  if (aspect.category === 'red-leaf' && masterFusion?.name && faces.length >= 5) return 'RDTQ';
  if (faces.length >= 4 && /FMH|Five Meanings|Resonant/i.test(aspect.name)) return 'RCS';
  return 'DCS';
}

function buildEotIntegration(aspect, ctx = {}) {
  const entryTool = 'EOT';
  const routedTool = inferRoutedTool(aspect, ctx);
  return {
    entryTool,
    routedTool,
    operator: routedTool,
    grade: gradeFromOperator(routedTool) === 'basic' && hasFacetLattice(ctx.faces)
      ? 'diamond'
      : gradeFromOperator(routedTool),
  };
}

function formatEotRoutingLabel(integration = {}) {
  const entry = integration.entryTool || 'EOT';
  const routed = integration.routedTool || integration.operator || entry;
  if (routed === 'EOT') return `${entry} → basic`;
  return `${entry} → ${routed}`;
}

module.exports = {
  inferRoutedTool,
  buildEotIntegration,
  formatEotRoutingLabel,
  hasFacetLattice,
};