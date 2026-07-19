// Single source of truth for incident state.
// Kept as a plain in-memory array on purpose: this is a demo-scale
// command-center app, not a production system, so a database would
// add setup complexity without adding real value here.

const { PRIORITY_COLORS } = require('./constants');

function seedIncident(category, priority, rawUpdate, summary, actionScript, minutesAgo) {
  return {
    incidentId: `INC-SEED${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    timestamp: new Date(Date.now() - minutesAgo * 60000).toISOString(),
    category,
    priority,
    priorityColor: PRIORITY_COLORS[priority],
    rawUpdate,
    summary,
    actionScript,
    confidence: '0.91',
    status: 'Active',
    processedBy: 'Seed data (demo)',
  };
}

let incidents = [
  seedIncident(
    'Security', 'High',
    'Verbal altercation between rival fan groups, Sector E12.',
    'Verbal altercation between rival fan groups escalating in Sector E12.',
    ['Deploy nearest response team to the reported location.', 'Activate CCTV coverage for the affected sector.', 'Coordinate with on-site law enforcement.'],
    6
  ),
  seedIncident(
    'Medical', 'Critical',
    'Cardiac event reported, male 80s, Section A3 Row 4.',
    'Cardiac event reported, male in 80s, Section A3 Row 4. Defibrillator deployed.',
    ['Dispatch first aid team to the reported location.', 'Clear the area and maintain a safety perimeter.', 'Relay patient status to the on-site physician.'],
    3
  ),
  seedIncident(
    'Logistics', 'Medium',
    'Turnstile congestion at Gate 4 exceeding capacity.',
    'Turnstile congestion at Gate 4 exceeding limit, flow redirected to Reserve Gate 6.',
    ['Redirect crowd flow to the nearest alternate route.', 'Notify gate/turnstile operators of the congestion point.', 'Broadcast a public address update if flow does not improve.'],
    12
  ),
];
let attendanceBase = 87494;

function addIncident(envelope) {
  incidents.unshift(envelope); // newest first
  return envelope;
}

function getAllIncidents() {
  return incidents;
}

function getActiveIncidents() {
  return incidents.filter((inc) => inc.status === 'Active');
}

function findIncidentById(incidentId) {
  return incidents.find((inc) => inc.incidentId === incidentId);
}

function resolveIncidentById(incidentId) {
  const incident = findIncidentById(incidentId);
  if (!incident) return null;
  incident.status = 'Resolved';
  incident.resolvedAt = new Date().toISOString();
  return incident;
}

function getMetrics() {
  const active = getActiveIncidents();
  // Small drift so attendance feels "live" during a demo, not core to the AI story.
  attendanceBase += Math.floor(Math.random() * 5) - 2;

  return {
    totalActive: active.length,
    security: active.filter((inc) => inc.category === 'Security').length,
    medical: active.filter((inc) => inc.category === 'Medical').length,
    logistics: active.filter((inc) => inc.category === 'Logistics').length,
    attendance: attendanceBase,
  };
}

module.exports = {
  addIncident,
  getAllIncidents,
  getActiveIncidents,
  findIncidentById,
  resolveIncidentById,
  getMetrics,
};
