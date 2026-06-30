/**
 * Detect template / placeholder aspect copy — never persist these.
 */

const GENERIC_IDENTITY_RE = [
  /^Red Leaf forged aspect — identity operator/i,
  /^Forged aspect — tier /i,
  /^Aspect forged through Grok origin — /i,
  /^Red Leaf aspect forged through Grok origin — /i,
];

const GENERIC_AFFIRMATION_RE = [
  /^I forge .+ with clarity and conviction\.?$/i,
  /^I embody .+: I forge .+ with clarity and conviction\.?$/i,
  /^I honor the ore\. I forge .+ with clarity and conviction\.?$/i,
];

const GENERIC_MANTRA_RE = [
  /^I forge .+ with clarity and conviction\.?$/i,
];

const GENERIC_SUPREME_RE = [
  /supreme seal:/i,
  /Forged through AFS\. Sealed in Save8\.?$/i,
  / — I forge .+ with clarity and conviction/i,
  / — I embody .+: I forge .+ with clarity and conviction/i,
];

function matchesAny(text, patterns) {
  if (!text?.trim()) return false;
  const t = text.trim();
  return patterns.some((re) => re.test(t));
}

function isGenericIdentity(text) {
  return matchesAny(text, GENERIC_IDENTITY_RE);
}

function isGenericAffirmation(text) {
  return matchesAny(text, GENERIC_AFFIRMATION_RE);
}

function isGenericMantra(text) {
  return matchesAny(text, GENERIC_MANTRA_RE);
}

function isGenericSupremeMantra(text) {
  return matchesAny(text, GENERIC_SUPREME_RE);
}

function isGenericComprehension(text) {
  return isGenericIdentity(text);
}

/** Strip generic template fields from a detail_json object (mutates copy). */
function stripGenericDetailFields(detail) {
  if (!detail || typeof detail !== 'object') return {};
  const out = { ...detail };
  if (isGenericIdentity(out.identity)) delete out.identity;
  if (isGenericAffirmation(out.coreAffirmation)) delete out.coreAffirmation;
  if (isGenericSupremeMantra(out.supremeMantra)) delete out.supremeMantra;
  return out;
}

module.exports = {
  isGenericIdentity,
  isGenericAffirmation,
  isGenericMantra,
  isGenericSupremeMantra,
  isGenericComprehension,
  stripGenericDetailFields,
};