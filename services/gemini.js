const { GoogleGenerativeAI } = require('@google/generative-ai');
const { VALID_CATEGORIES, VALID_PRIORITIES } = require('../constants');

const MODEL_NAME = 'gemini-1.5-flash';

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

const incidentSchema = {
  type: 'object',
  properties: {
    category: {
      type: 'string',
      enum: VALID_CATEGORIES,
      description: 'Operational category of the incident',
    },
    priority: {
      type: 'string',
      enum: VALID_PRIORITIES,
      description: 'Urgency level based on risk to life and operations',
    },
    summary: {
      type: 'string',
      description: 'One to two concise sentences summarising the incident for the operations log',
    },
    actionScript: {
      type: 'array',
      items: { type: 'string' },
      minItems: 3,
      maxItems: 3,
      description: 'Exactly three specific, actionable tactical instructions for field crew',
    },
    confidence: {
      type: 'number',
      description: 'Model confidence in the classification, expressed as a decimal between 0 and 1',
    },
  },
  required: ['category', 'priority', 'summary', 'actionScript', 'confidence'],
};

function isConfigured() {
  return genAI !== null;
}

/**
 * Classifies raw incident text using Gemini with a strict JSON schema.
 * Throws on any failure so the caller can fall back to the heuristic engine.
 */
async function classifyWithGemini(rawText) {
  if (!genAI) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: incidentSchema,
      temperature: 0.4,
      maxOutputTokens: 512,
    },
  });

  const prompt = `Staff update received at ${new Date().toUTCString()}:\n"${rawText}"`;
  const result = await model.generateContent([SYSTEM_PROMPT, prompt]);
  return JSON.parse(result.response.text());
}

/**
 * Generates a synthesized situational briefing across multiple active
 * incidents. Plain text response — a briefing reads better as prose
 * than as structured JSON.
 */
async function generateBriefing(activeIncidents) {
  if (!genAI) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  const incidentSummary = activeIncidents.map((inc) => ({
    category: inc.category,
    priority: inc.priority,
    summary: inc.summary,
  }));

  const prompt = `You are the senior operations commander at a FIFA World Cup 2026 stadium.
Below is a list of currently active incidents. Write a concise, 3-4 sentence
situational briefing for the command staff: what's happening, what the biggest
risk is right now, and what should be prioritized next. Do not repeat the raw
incident list verbatim — synthesize it into a judgment call.

Incidents:
${JSON.stringify(incidentSummary, null, 2)}`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

const SYSTEM_PROMPT = `
You are an elite AI operations analyst embedded in the FIFA World Cup 2026 Stadium Command Center.
You receive raw, unstructured staff radio updates and field reports. Your sole task is to classify each update and return a structured operational briefing.
Respond ONLY with a JSON object containing category, priority, summary, actionScript, and confidence.
`.trim();

module.exports = { isConfigured, classifyWithGemini, generateBriefing, MODEL_NAME };
