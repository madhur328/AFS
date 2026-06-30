/**
 * Aspect tier = inherent potential (potential_score), not corpus mentions or synergy links.
 */
function tierFromPotential(potential, isBase = false) {
  if (isBase) return 'S';
  const p = Number(potential);
  if (!Number.isFinite(p)) return 'D';
  if (p >= 0.85) return 'S';
  if (p >= 0.7) return 'A';
  if (p >= 0.55) return 'B';
  if (p >= 0.4) return 'C';
  return 'D';
}

function potentialFromMentions(mentions, isBase = false) {
  if (isBase) return 0.95;
  return Math.min(0.99, 0.35 + Number(mentions || 0) * 0.004);
}

module.exports = {
  tierFromPotential,
  potentialFromMentions,
};