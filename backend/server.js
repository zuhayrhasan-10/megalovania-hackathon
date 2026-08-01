// ============================================================
// Contract Review Backend — entry point
// ============================================================

require('dotenv').config();

const express = require('express');
const cors = require('cors');

const apiRouter = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.use('/api', apiRouter);

// Health check
app.get('/health', (_req, res) => res.json({ ok: true }));

// Centralised error handler — keeps route handlers clean.
app.use((err, _req, res, _next) => {
  console.error('[server] unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`Contract review backend listening on http://localhost:${PORT}`);
  console.log(`  GET  /api/contracts`);
  console.log(`  GET  /api/clause-types`);
  console.log(`  POST /api/analyze        { contract_id, clause_type_ids[] }`);
  console.log(`  POST /api/review         { result_id, decision, feedback }`);
});