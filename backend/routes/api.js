// ============================================================
// /api/* routes — contracts, clause-types, analyze, review
// ============================================================

const express = require('express');
const router = express.Router();

const store = require('../services/store');
const { analyzeClauseTypes } = require('../services/geminiService');

// GET /api/contracts  ->  [{ id, name, meta }, ...]
router.get('/contracts', (_req, res) => {
  const list = store.contracts.map((c) => ({
    id: c.id,
    name: c.name,
    meta: c.meta,
  }));
  res.json(list);
});

// GET /api/clause-types  ->  [{ id, name, description }, ...]
router.get('/clause-types', (_req, res) => {
  res.json(store.clauseTypes);
});

// POST /api/analyze  ->  { contract_id, clause_type_ids } => { results: [...] }
router.post('/analyze', async (req, res, next) => {
  try {
    const { contract_id, clause_type_ids } = req.body || {};
    if (!contract_id) {
      return res.status(400).json({ error: 'contract_id is required.' });
    }
    if (!Array.isArray(clause_type_ids) || clause_type_ids.length === 0) {
      return res
        .status(400)
        .json({ error: 'clause_type_ids must be a non-empty array.' });
    }

    const contract = store.contracts.find((c) => c.id === contract_id);
    if (!contract) {
      return res.status(404).json({ error: `Contract ${contract_id} not found.` });
    }

    const selectedClauseTypes = store.clauseTypes.filter((ct) =>
      clause_type_ids.includes(ct.id)
    );
    if (selectedClauseTypes.length === 0) {
      return res
        .status(400)
        .json({ error: 'None of the provided clause_type_ids matched known clause types.' });
    }

    // Gemini call(s) — see services/geminiService.js for prompt details.
    const results = await analyzeClauseTypes({
      contractText: contract.text,
      clauseTypes: selectedClauseTypes,
      standardsMap: store.getStandardsMap(),
    });

    res.json({ results });
  } catch (err) {
    next(err);
  }
});

// POST /api/review  ->  { result_id, decision, feedback }
router.post('/review', (req, res, next) => {
  try {
    const { result_id, decision, feedback } = req.body || {};
    const entry = store.recordReview({ result_id, decision, feedback });
    res.json({ ok: true, review: entry });
  } catch (err) {
    next(err);
  }
});

// GET /api/reviews  (handy for debugging — lists everything stored so far)
router.get('/reviews', (_req, res) => {
  res.json({ reviews: store.getReviews() });
});

module.exports = router;