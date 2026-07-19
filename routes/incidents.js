const express = require('express');
const store = require('../store');
const gemini = require('../services/gemini');
const fallback = require('../services/fallback');
const { PRIORITY_COLORS } = require('../constants');

const router = express.Router();

const MAX_INPUT_LENGTH = 2000; // basic abuse/cost guard on Gemini calls

function buildEnvelope(rawText, aiPayload, processedBy) {
  return {
    incidentId: `INC-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    category: aiPayload.category,
    priority: aiPayload.priority,
    priorityColor: PRIORITY_COLORS[aiPayload.priority] || '#3b82f6',
    rawUpdate: rawText,
    summary: aiPayload.summary,
    actionScript: aiPayload.actionScript,
    confidence: String(aiPayload.confidence),
    status: 'Active',
    processedBy,
  };
}

// POST /api/generate — classify raw text and store the resulting incident
router.post('/generate', async (req, res) => {
  const { text } = req.body;

  if (!text || typeof text !== 'string' || text.trim().length < 5) {
    return res.status(400).json({ error: 'Provide a text field with at least 5 characters.' });
  }
  if (text.length > MAX_INPUT_LENGTH) {
    return res.status(400).json({ error: `Text exceeds maximum length of ${MAX_INPUT_LENGTH} characters.` });
  }

  const rawText = text.trim();

  try {
    let aiPayload;
    let processedBy;

    if (gemini.isConfigured()) {
      try {
        aiPayload = await gemini.classifyWithGemini(rawText);
        processedBy = `${gemini.MODEL_NAME} · google/generative-ai`;
      } catch (err) {
        console.warn('Gemini classification failed, using fallback:', err.message);
        aiPayload = fallback.fallbackInfer(rawText);
        processedBy = 'Local heuristic (fallback route)';
      }
    } else {
      aiPayload = fallback.fallbackInfer(rawText);
      processedBy = 'Local heuristic (no GEMINI_API_KEY set)';
    }

    const envelope = buildEnvelope(rawText, aiPayload, processedBy);
    store.addIncident(envelope);
    res.json(envelope);
  } catch (err) {
    console.error('Unexpected error in /api/generate:', err);
    res.status(500).json({ error: 'Classification failed unexpectedly.' });
  }
});

// GET /api/incidents — full current list (used to hydrate the UI on load)
router.get('/incidents', (req, res) => {
  res.json(store.getAllIncidents());
});

// PATCH /api/incidents/:incidentId/resolve — mark one incident resolved
router.patch('/incidents/:incidentId/resolve', (req, res) => {
  const updated = store.resolveIncidentById(req.params.incidentId);
  if (!updated) {
    return res.status(404).json({ error: 'Incident not found.' });
  }
  res.json(updated);
});

// GET /api/metrics — computed live counts
router.get('/metrics', (req, res) => {
  res.json(store.getMetrics());
});

// GET /api/briefing — AI-synthesized summary of active incidents, cached briefly
let briefingCache = { text: null, timestamp: null, incidentCount: null };
const CACHE_DURATION_MS = 15000;

router.get('/briefing', async (req, res) => {
  const activeIncidents = store.getActiveIncidents();
  const now = Date.now();
  const incidentCount = activeIncidents.length;

  const cacheValid =
    briefingCache.text &&
    briefingCache.timestamp &&
    now - briefingCache.timestamp < CACHE_DURATION_MS &&
    briefingCache.incidentCount === incidentCount;

  if (cacheValid) {
    return res.json({
      briefing: briefingCache.text,
      generatedAt: new Date(briefingCache.timestamp).toISOString(),
      basedOnIncidentCount: briefingCache.incidentCount,
      cached: true,
    });
  }

  if (incidentCount === 0) {
    const text = 'All clear. No active incidents at this time.';
    briefingCache = { text, timestamp: now, incidentCount: 0 };
    return res.json({ briefing: text, generatedAt: new Date(now).toISOString(), basedOnIncidentCount: 0, cached: false });
  }

  try {
    const text = gemini.isConfigured()
      ? await gemini.generateBriefing(activeIncidents)
      : fallback.fallbackBriefing(activeIncidents);

    briefingCache = { text, timestamp: now, incidentCount };
    res.json({ briefing: text, generatedAt: new Date(now).toISOString(), basedOnIncidentCount: incidentCount, cached: false });
  } catch (err) {
    console.warn('Gemini briefing failed, using fallback:', err.message);
    const text = fallback.fallbackBriefing(activeIncidents);
    briefingCache = { text, timestamp: now, incidentCount };
    res.json({ briefing: text, generatedAt: new Date(now).toISOString(), basedOnIncidentCount: incidentCount, cached: false });
  }
});

module.exports = router;