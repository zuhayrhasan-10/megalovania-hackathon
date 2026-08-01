// ============================================================
// In-memory store — sample contracts, clause types, standards
// ============================================================
// Loads everything from /backend/data/*.json on boot. Good enough for
// the hackathon; swap for a DB later.

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

function readJson(file) {
  const full = path.join(DATA_DIR, file);
  return JSON.parse(fs.readFileSync(full, 'utf8'));
}

const contracts = readJson('contracts.json');
const clauseTypes = readJson('clauseTypes.json');
const companyStandards = readJson('companyStandards.json');

// Build a {clauseTypeId: {standard, name}} lookup for the Gemini prompt.
function getStandardsMap() {
  const map = {};
  for (const ct of clauseTypes) {
    const std = companyStandards[ct.id];
    map[ct.id] = {
      name: ct.name,
      standard: std ? std.standard : 'No standard published.',
    };
  }
  return map;
}

// Human-review log kept in memory (last write wins per result_id).
const reviews = new Map();

function recordReview({ result_id, decision, feedback }) {
  if (!result_id || !decision) {
    throw new Error('result_id and decision are required.');
  }
  const entry = {
    result_id,
    decision,
    feedback: feedback || null,
    recorded_at: new Date().toISOString(),
  };
  reviews.set(result_id, entry);
  return entry;
}

function getReviews() {
  return [...reviews.values()];
}

module.exports = {
  contracts,
  clauseTypes,
  companyStandards,
  getStandardsMap,
  recordReview,
  getReviews,
};