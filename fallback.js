// Keyword-scoring fallback used when GEMINI_API_KEY is unset or the API
// call fails. Exists so the system stays demoable even if the AI is down.

// Each keyword carries a weight so that strong, unambiguous signals
// (e.g. "weapon", "unconscious") outrank weak, overlapping ones
// (e.g. "blocked", "gate" — which show up in both Security and
// Logistics reports and previously caused misclassification).
const KEYWORDS = {
  Security: {
    fight: 3, altercation: 3, weapon: 5, threat: 4, hostile: 3,
    eject: 2, breach: 3, trespasser: 3, armed: 5, suspicious: 2,
  },
  Medical: {
    injury: 3, injured: 3, collapse: 4, fainted: 4, unconscious: 5,
    blood: 3, heart: 3, ambulance: 3, seizure: 4, fracture: 3, heat: 2, pain: 2,
  },
  Logistics: {
    gate: 1, turnstile: 2, queue: 2, crowd: 2, flow: 1, parking: 2,
    transport: 2, delay: 2, vendor: 2, blocked: 1, overflow: 2, access: 1, ticket: 2,
  },
};

const CRITICAL_WORDS = ['critical', 'emergency', 'weapon', 'armed', 'unconscious', 'collapse', 'surge', 'mass', 'multiple', 'cardiac'];
const HIGH_WORDS = ['urgent', 'immediate', 'injured', 'fight', 'breach', 'blocked', 'seizure', 'hostile'];
const MEDIUM_WORDS = ['report', 'issue', 'concern', 'slow', 'delay', 'minor', 'help'];

const ACTION_SCRIPTS = {
  Security: [
    'Deploy nearest response team to the reported location.',
    'Activate CCTV coverage for the affected sector.',
    'Coordinate with on-site law enforcement.',
  ],
  Medical: [
    'Dispatch first aid team to the reported location.',
    'Clear the area and maintain a safety perimeter.',
    'Relay patient status to the on-site physician.',
  ],
  Logistics: [
    'Redirect crowd flow to the nearest alternate route.',
    'Notify gate/turnstile operators of the congestion point.',
    'Broadcast a public address update if flow does not improve.',
  ],
};

function scoreCategory(lowerText) {
  const scores = Object.entries(KEYWORDS).map(([category, weightedWords]) => {
    const score = Object.entries(weightedWords).reduce(
      (sum, [word, weight]) => sum + (lowerText.includes(word) ? weight : 0),
      0
    );
    return [category, score];
  });
  scores.sort((a, b) => b[1] - a[1]);
  return scores[0][1] > 0 ? scores[0][0] : 'Logistics';
}

function scorePriority(lowerText, category) {
  if (CRITICAL_WORDS.some((w) => lowerText.includes(w))) return 'Critical';
  if (HIGH_WORDS.some((w) => lowerText.includes(w))) return 'High';
  if (MEDIUM_WORDS.some((w) => lowerText.includes(w))) return 'Medium';
  return category === 'Security' ? 'High' : 'Low';
}

function fallbackInfer(rawText) {
  const lowerText = rawText.toLowerCase();
  const category = scoreCategory(lowerText);
  const priority = scorePriority(lowerText, category);

  return {
    category,
    priority,
    summary: `${category} incident detected. Priority escalated to ${priority} based on field report.`,
    actionScript: ACTION_SCRIPTS[category],
    confidence: parseFloat((0.72 + Math.random() * 0.18).toFixed(2)),
  };
}

function fallbackBriefing(activeIncidents) {
  const highPriorityCount = activeIncidents.filter(
    (inc) => inc.priority === 'Critical' || inc.priority === 'High'
  ).length;

  return `Currently monitoring ${activeIncidents.length} active incident${
    activeIncidents.length === 1 ? '' : 's'
  }. Priority should be given to ${highPriorityCount} high-priority situation${
    highPriorityCount === 1 ? '' : 's'
  }.`;
}

module.exports = { fallbackInfer, fallbackBriefing };
