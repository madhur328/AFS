/**
 * Voice for radiant-face explanations vs self-affirmations (mantra).
 * - Self-affirmation (mantra): first-person "I" — practitioner embodies the facet.
 * - Red-leaf explanation: "The red leaf …" — operator speaks through the Aspect.
 * - Other aspects: "I …" — demechanize "This facet".
 * - Virah / curated I-voice red-leaf pinnacles: keep first-person.
 */

const VERB_FIXES = [
  [/^I refuses\b/i, 'I refuse'],
  [/^I chooses\b/i, 'I choose'],
  [/^I bears\b/i, 'I bear'],
  [/^I finds\b/i, 'I find'],
  [/^I understands\b/i, 'I understand'],
  [/^I honors\b/i, 'I honor'],
  [/^I brews\b/i, 'I brew'],
  [/^I carries\b/i, 'I carry'],
  [/^I takes\b/i, 'I take'],
  [/^I burns\b/i, 'I burn'],
  [/^I accepts\b/i, 'I accept'],
  [/^I releases\b/i, 'I release'],
  [/^I breaks\b/i, 'I break'],
  [/^I recognizes\b/i, 'I recognize'],
  [/^I knows\b/i, 'I know'],
  [/^I practices\b/i, 'I practice'],
  [/^I allows\b/i, 'I allow'],
  [/^I receives\b/i, 'I receive'],
  [/^I spends\b/i, 'I spend'],
  [/^I asks\b/i, 'I ask'],
  [/^I dies\b/i, 'I die'],
  [/^I looks\b/i, 'I look'],
  [/^I channels\b/i, 'I channel'],
  [/^I reflects\b/i, 'I reflect'],
  [/^I integrates\b/i, 'I integrate'],
  [/^I savors\b/i, 'I savor'],
  [/^I endures\b/i, 'I endure'],
  [/^I embraces\b/i, 'I embrace'],
  [/^I offers\b/i, 'I offer'],
  [/^I falls\b/i, 'I fall'],
  [/^I encircles\b/i, 'I encircle'],
  [/^I transforms\b/i, 'I transform'],
  [/^I unlocks\b/i, 'I unlock'],
  [/^I appreciates\b/i, 'I appreciate'],
  [/^I responds\b/i, 'I respond'],
  [/^I plants\b/i, 'I plant'],
  [/^I guards\b/i, 'I guard'],
  [/^I awakens\b/i, 'I awaken'],
  [/^I remains\b/i, 'I remain'],
  [/^I listens\b/i, 'I listen'],
  [/^I safeguards\b/i, 'I safeguard'],
  [/^I blesses\b/i, 'I bless'],
  [/^I feels\b/i, 'I feel'],
  [/^I sees\b/i, 'I see'],
  [/^I speaks\b/i, 'I speak'],
  [/^I breathes\b/i, 'I breathe'],
  [/^I rules\b/i, 'I rule'],
  [/^I brings\b/i, 'I bring'],
  [/^I crosses\b/i, 'I cross'],
  [/^I perceives\b/i, 'I perceive'],
  [/^I spins\b/i, 'I spin'],
  [/^I protects\b/i, 'I protect'],
  [/^I acts\b/i, 'I act'],
  [/^I builds\b/i, 'I build'],
  [/^I keeps\b/i, 'I keep'],
  [/^I repairs\b/i, 'I repair'],
  [/^I becomes\b/i, 'I become'],
  [/^I lives\b/i, 'I live'],
  [/^I turns\b/i, 'I turn'],
  [/^I stopped\b/i, 'I stopped'],
  [/^I will\b/i, 'I will'],
  [/^I do not\b/i, 'I do not'],
  [/^I have\b/i, 'I have'],
  [/^I am\b/i, 'I am'],
  [/^I feel\b/i, 'I feel'],
  [/^I bless\b/i, 'I bless'],
];

function fixFirstPersonGrammar(text) {
  let t = text;
  for (const [re, rep] of VERB_FIXES) t = t.replace(re, rep);
  return t;
}

function isRedLeafContext(context = {}) {
  return context.category === 'red-leaf' || (context.aspectName || '').startsWith('Red Leaf');
}

function demechanizeExplanation(text) {
  if (!text?.trim()) return '';
  let t = text.trim();
  t = t.replace(/^This facet is not\b/i, 'I am not');
  t = t.replace(/^This facet isn't\b/i, 'I am not');
  t = t.replace(/^This facet is\b/i, 'I am');
  t = t.replace(/^This facet am\b/i, 'I am');
  t = t.replace(/^This facet\b/i, 'I');
  t = t.replace(/^I not\b/i, 'I do not');

  return fixFirstPersonGrammar(t);
}

/** Journal / operator voice — red leaf speaks through the Aspect (not practitioner "I"). */
function normalizeRedLeafExplanationVoice(text) {
  if (!text?.trim()) return '';
  let t = text.trim();
  t = t.replace(/^This facet is not\b/i, 'The red leaf is not');
  t = t.replace(/^This facet isn't\b/i, 'The red leaf is not');
  t = t.replace(/^This facet is\b/i, 'The red leaf is');
  t = t.replace(/^This facet am\b/i, 'The red leaf is');
  t = t.replace(/^This facet\b/i, 'The red leaf');
  t = t.replace(/^This aspect\b/i, 'The red leaf');
  t = t.replace(/^The leaf\b/i, 'The red leaf');
  return t;
}

/** @deprecated Use normalizeRedLeafExplanationVoice — kept for script imports */
function leafToFirstPerson(text, { preferLeafVoice = true } = {}) {
  if (!preferLeafVoice) return text;
  return normalizeRedLeafExplanationVoice(text);
}

function isVirahTone(context = {}) {
  const blob = `${context.aspectName || ''} ${context.faceName || ''}`.toLowerCase();
  return /virah|yashodhara|waiting|offering|remembering flame|mature love|dignified release|silent offering|graceful waiting/.test(blob);
}

/** Practitioner mantra (I) → red leaf operator explanation (The red leaf / it). */
function mantraToRedLeafOperatorExplanation(mantra) {
  if (!mantra?.trim()) return '';
  let t = mantra.trim();
  t = t.replace(/\bFrom my own\b/gi, 'From its own');
  t = t.replace(/\bmy own\b/gi, 'its own');
  t = t.replace(/\bmyself\b/gi, 'itself');
  t = t.replace(/\bmy\b/gi, 'its');
  t = t.replace(/\bme\b/gi, 'it');

  const sentences = t.split(/(?<=[.!?])\s+/).filter(Boolean);
  t = sentences
    .map((sentence, idx) => {
      let s = sentence.trim();
      const subject = idx === 0 ? 'The red leaf' : 'It';
      const subjectLower = idx === 0 ? 'the red leaf' : 'it';
      s = s.replace(/^I'm\b/i, `${subject} is`);
      s = s.replace(/^I've\b/i, `${subject} has`);
      s = s.replace(/^I'll\b/i, `${subject} will`);
      s = s.replace(/^I am\b/i, `${subject} is`);
      s = s.replace(/^I have\b/i, `${subject} has`);
      s = s.replace(/^I do not\b/i, `${subject} does not`);
      s = s.replace(/^I\b/i, subject);
      s = s.replace(/,\s*I\b/g, ', it');
      s = s.replace(/;\s*I\b/g, '; it');
      if (idx > 0 && !/^It\b/i.test(s)) {
        s = s.replace(new RegExp(`^${subjectLower}\\b`, 'i'), 'It');
      }
      return s;
    })
    .join(' ');

  const RED_LEAF_VERB_FIXES = [
    [/^The red leaf willingly leave\b/i, 'The red leaf willingly leaves'],
    [/^The red leaf reject\b/i, 'The red leaf rejects'],
    [/^The red leaf walk\b/i, 'The red leaf walks'],
    [/^The red leaf see\b/i, 'The red leaf sees'],
    [/^The red leaf extend\b/i, 'The red leaf extends'],
    [/^The red leaf rise\b/i, 'The red leaf rises'],
    [/^The red leaf let\b/i, 'The red leaf lets'],
    [/^The red leaf leave\b/i, 'The red leaf leaves'],
    [/^The red leaf release\b/i, 'The red leaf releases'],
    [/^The red leaf accept\b/i, 'The red leaf accepts'],
    [/^The red leaf honor\b/i, 'The red leaf honors'],
    [/^The red leaf guard\b/i, 'The red leaf guards'],
    [/^The red leaf hold\b/i, 'The red leaf holds'],
    [/^The red leaf choose\b/i, 'The red leaf chooses'],
    [/^The red leaf remain\b/i, 'The red leaf remains'],
    [/^The red leaf listen\b/i, 'The red leaf listens'],
    [/^The red leaf feel\b/i, 'The red leaf feels'],
    [/^The red leaf burn\b/i, 'The red leaf burns'],
    [/^The red leaf build\b/i, 'The red leaf builds'],
    [/^The red leaf turn\b/i, 'The red leaf turns'],
    [/^The red leaf spin\b/i, 'The red leaf spins'],
    [/^The red leaf am\b/i, 'The red leaf is'],
    [/^The red leaf have\b/i, 'The red leaf has'],
    [/^The red leaf do not\b/i, 'The red leaf does not'],
    [/\bIt let\b/g, 'It lets'],
    [/\bIt walk\b/g, 'It walks'],
    [/\bIt see\b/g, 'It sees'],
    [/\bIt rise\b/g, 'It rises'],
    [/\bIt reject\b/g, 'It rejects'],
    [/\bIt leave\b/g, 'It leaves'],
    [/\bIt release\b/g, 'It releases'],
    [/\bit extend\b/gi, 'it extends'],
    [/\bthe red leaf walk\b/gi, 'the red leaf walks'],
    [/\bIt walk\b/g, 'It walks'],
  ];
  for (const [re, rep] of RED_LEAF_VERB_FIXES) t = t.replace(re, rep);
  return t;
}

function expandVirahExplanation(mantra, faceName) {
  const m = mantra.trim();
  const byFace = {
    'Silent Offering': 'The ache is real, and I let it move through me — but I refuse to let it harden into bitterness.',
    'Graceful Waiting': 'I do not chase what has already chosen its path. I hold this space with quiet strength, as love taught me to wait.',
    'Remembering Flame': 'Even when he is gone, the love in my heart stays pure — a flame that needs no witness to remain true.',
    'Dignified Release': 'I bless the path he walks, even while my own heart aches. Release is not defeat; it is mature love.',
    'Mature Love': 'This love has outgrown the need for return. I give without ledger, and that is my sovereignty.',
  };
  return byFace[faceName] || m;
}

function humanizeExplanation(text, context = {}) {
  if (!text?.trim()) return '';
  const trimmed = text.trim();

  if (isVirahTone(context)) {
    let t = demechanizeExplanation(trimmed);
    if (/^This facet/i.test(t)) t = demechanizeExplanation(t);
    return t.trim();
  }

  if (isRedLeafContext(context)) {
    if (/^The leaf\b/i.test(trimmed) || /^This (facet|aspect)\b/i.test(trimmed)) {
      return normalizeRedLeafExplanationVoice(trimmed);
    }
    if (/^I[\s']/.test(trimmed) || /^Even when\b/i.test(trimmed) || /^This is\b/i.test(trimmed)) {
      return fixFirstPersonGrammar(trimmed);
    }
    return trimmed;
  }

  let t = demechanizeExplanation(trimmed);
  if (/^This facet/i.test(t)) t = demechanizeExplanation(t);
  return t.trim();
}

function deriveAliveExplanation(face, context = {}) {
  const curated = face.explanation?.trim();
  if (curated && !/^This facet/i.test(curated)) {
    return humanizeExplanation(curated, { ...context, faceName: face.name });
  }
  const mantra = face.mantra?.trim();
  if (!mantra) return '';
  if (isVirahTone({ ...context, faceName: face.name })) {
    return expandVirahExplanation(mantra, face.name);
  }
  if (isRedLeafContext(context)) {
    return mantraToRedLeafOperatorExplanation(mantra);
  }
  return humanizeExplanation(mantra, { ...context, faceName: face.name });
}

function humanizeRadiantFace(face, context = {}) {
  const ctx = { ...context, faceName: face.name };
  let explanation =
    face.explanation?.trim() && !/^This facet/i.test(face.explanation)
      ? humanizeExplanation(face.explanation, ctx)
      : deriveAliveExplanation(face, ctx);
  if (!explanation && face.mantra?.trim()) {
    explanation = deriveAliveExplanation(face, ctx);
  }
  if (explanation && face.mantra?.trim() && explanation === face.mantra.trim()) {
    if (isVirahTone(ctx)) {
      explanation = expandVirahExplanation(face.mantra, face.name);
    } else if (isRedLeafContext(ctx)) {
      explanation = mantraToRedLeafOperatorExplanation(face.mantra);
    }
  }
  return explanation ? { ...face, explanation } : { ...face, explanation: face.mantra?.trim() || '' };
}

function humanizeRadiantFaces(faces, context = {}) {
  if (!faces?.length) return [];
  return faces.map((f) => humanizeRadiantFace(f, context));
}

module.exports = {
  demechanizeExplanation,
  normalizeRedLeafExplanationVoice,
  leafToFirstPerson,
  humanizeExplanation,
  deriveAliveExplanation,
  humanizeRadiantFace,
  humanizeRadiantFaces,
  mantraToRedLeafOperatorExplanation,
  isRedLeafContext,
};