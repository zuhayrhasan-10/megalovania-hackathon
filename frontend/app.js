// ============================================================
// Contract Review Assistant — frontend logic
// ============================================================

const API_BASE = '/api';

// ------------------------------------------------------------
// MOCK SWITCH
// While the backend isn't live yet, /api/analyze returns a
// hardcoded fake object matching the documented response shape
// instead of calling fetch. Flip this to false once the real
// POST /api/analyze route is up, and remove/ignore MOCK_ANALYZE_RESPONSE.
// ------------------------------------------------------------
const USE_MOCK_ANALYZE = true;

// Sample data used only if GET /api/contracts or GET /api/clause-types
// fail (e.g. backend not running yet). Delete once both routes are live.
const SAMPLE_CONTRACTS = [
  { id: 'c1', name: 'Vendor Services Agreement — Meridian Corp', meta: 'Uploaded Jul 12' },
  { id: 'c2', name: 'Master Supply Agreement — Ashford Logistics', meta: 'Uploaded Jul 20' },
  { id: 'c3', name: 'SaaS Subscription Agreement — Nimbus Cloud', meta: 'Uploaded Jul 27' },
];

const SAMPLE_CLAUSE_TYPES = [
  { id: 'ct1', name: 'Indemnification' },
  { id: 'ct2', name: 'Limitation of Liability' },
  { id: 'ct3', name: 'Termination for Convenience' },
  { id: 'ct4', name: 'Confidentiality' },
  { id: 'ct5', name: 'Non-Compete' },
];

// ------------------------------------------------------------
// State
// ------------------------------------------------------------
const state = {
  contracts: [],
  clauseTypes: [],
  selectedContractId: null,
  selectedClauseTypeIds: new Set(),
};

// ------------------------------------------------------------
// DOM refs
// ------------------------------------------------------------
const contractListEl = document.getElementById('contractList');
const clauseListEl = document.getElementById('clauseList');
const runBtn = document.getElementById('runBtn');
const runHint = document.getElementById('runHint');
const resultsArea = document.getElementById('resultsArea');
const resultsCount = document.getElementById('resultsCount');
const resultCardTemplate = document.getElementById('resultCardTemplate');
const caseNumberEl = document.getElementById('caseNumber');

// ------------------------------------------------------------
// Init
// ------------------------------------------------------------
init();

function init() {
  stampCaseNumber();
  loadContracts();
  loadClauseTypes();
  runBtn.addEventListener('click', runReview);
}

function stampCaseNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const suffix = Math.random().toString(36).slice(2, 4).toUpperCase();
  caseNumberEl.textContent = `${y}-${m}${d}-${suffix}`;
}

// ------------------------------------------------------------
// Load contracts (Exhibit A)
// ------------------------------------------------------------
async function loadContracts() {
  try {
    const res = await fetch(`${API_BASE}/contracts`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    state.contracts = Array.isArray(data) ? data : (data.contracts || []);
    renderContracts();
  } catch (err) {
    // Backend not reachable yet — fall back to sample contracts so the
    // rest of the UI can still be built and clicked through. Remove
    // SAMPLE_CONTRACTS once GET /api/contracts is live.
    state.contracts = SAMPLE_CONTRACTS;
    renderContracts();
    contractListEl.insertAdjacentHTML('beforeend', `<p class="placeholder">Showing sample contracts — backend unreachable (${escapeHtml(err.message)}).</p>`);
  }
}

function renderContracts() {
  if (state.contracts.length === 0) {
    contractListEl.innerHTML = `<p class="placeholder">No contracts found.</p>`;
    return;
  }
  contractListEl.innerHTML = '';
  state.contracts.forEach((contract) => {
    const id = contract.id ?? contract.contract_id;
    const name = contract.name ?? contract.title ?? `Contract ${id}`;
    const meta = contract.meta ?? contract.subtitle ?? '';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'contract-item';
    btn.dataset.contractId = id;
    btn.innerHTML = `${escapeHtml(name)}${meta ? `<span class="contract-meta">${escapeHtml(meta)}</span>` : ''}`;
    btn.addEventListener('click', () => selectContract(id));
    contractListEl.appendChild(btn);
  });
}

function selectContract(id) {
  state.selectedContractId = id;
  [...contractListEl.querySelectorAll('.contract-item')].forEach((el) => {
    el.classList.toggle('selected', String(el.dataset.contractId) === String(id));
  });
  updateRunButtonState();
}

// ------------------------------------------------------------
// Load clause types (Exhibit B)
// ------------------------------------------------------------
async function loadClauseTypes() {
  try {
    const res = await fetch(`${API_BASE}/clause-types`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    state.clauseTypes = Array.isArray(data) ? data : (data.clause_types || []);
    renderClauseTypes();
  } catch (err) {
    // Same fallback as loadContracts — remove SAMPLE_CLAUSE_TYPES once
    // GET /api/clause-types is live.
    state.clauseTypes = SAMPLE_CLAUSE_TYPES;
    renderClauseTypes();
    clauseListEl.insertAdjacentHTML('beforeend', `<p class="placeholder">Showing sample clause types — backend unreachable (${escapeHtml(err.message)}).</p>`);
  }
}

function renderClauseTypes() {
  if (state.clauseTypes.length === 0) {
    clauseListEl.innerHTML = `<p class="placeholder">No clause types found.</p>`;
    return;
  }
  clauseListEl.innerHTML = '';
  state.clauseTypes.forEach((clauseType) => {
    const id = clauseType.id ?? clauseType.clause_type_id;
    const name = clauseType.name ?? clauseType.label ?? `Clause ${id}`;

    const label = document.createElement('label');
    label.className = 'clause-item';
    label.innerHTML = `<input type="checkbox" data-clause-id="${id}"> <span>${escapeHtml(name)}</span>`;
    const checkbox = label.querySelector('input');
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) state.selectedClauseTypeIds.add(id);
      else state.selectedClauseTypeIds.delete(id);
      updateRunButtonState();
    });
    clauseListEl.appendChild(label);
  });
}

// ------------------------------------------------------------
// Run button state
// ------------------------------------------------------------
function updateRunButtonState() {
  const ready = state.selectedContractId != null && state.selectedClauseTypeIds.size > 0;
  runBtn.disabled = !ready;
  runHint.textContent = ready
    ? 'Ready to run.'
    : 'Select a contract and at least one clause type.';
}

// ------------------------------------------------------------
// Run review — POST /api/analyze
// ------------------------------------------------------------
async function runReview() {
  runBtn.disabled = true;
  showLoading();

  const payload = {
    contract_id: state.selectedContractId,
    clause_type_ids: [...state.selectedClauseTypeIds],
  };

  try {
    const data = USE_MOCK_ANALYZE
      ? await mockAnalyze(payload)
      : await realAnalyze(payload);

    renderResults(data.results || []);
  } catch (err) {
    showError(err.message);
  } finally {
    updateRunButtonState();
  }
}

async function realAnalyze(payload) {
  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Analysis failed (HTTP ${res.status})`);
  return res.json();
}

// Fake object matching the documented /api/analyze response shape.
// Swap USE_MOCK_ANALYZE to false to call the real backend instead.
async function mockAnalyze(payload) {
  await wait(900); // simulate the couple of seconds a real LLM call takes

  const selected = state.clauseTypes.filter((c) =>
    payload.clause_type_ids.includes(c.id ?? c.clause_type_id)
  );

  const sampleRiskLevels = ['Low Risk', 'Medium Risk', 'High Risk', 'Not Enough Information'];

  const results = (selected.length ? selected : state.clauseTypes).map((clauseType, i) => {
    const name = clauseType.name ?? clauseType.label ?? `Clause ${i + 1}`;
    const riskLevel = sampleRiskLevels[i % sampleRiskLevels.length];

    if (riskLevel === 'Not Enough Information') {
      return {
        clause_type: name,
        risk_level: riskLevel,
        contract_clause: null,
        company_standard: 'Every agreement must include a clause of this type addressing scope and duration.',
        reason: 'No matching clause could be located in the uploaded contract text.',
        source: null,
        result_id: `mock-${i}`,
        review_status: 'pending',
      };
    }

    return {
      clause_type: name,
      risk_level: riskLevel,
      contract_clause: `"...the parties agree that ${name.toLowerCase()} obligations shall survive termination for a period of twelve (12) months..."`,
      company_standard: `Standard requires ${name.toLowerCase()} terms not to exceed six (6) months post-termination.`,
      reason: riskLevel === 'High Risk'
        ? 'Clause duration significantly exceeds internal policy.'
        : riskLevel === 'Medium Risk'
          ? 'Clause deviates moderately from the standard term.'
          : 'Clause is within acceptable bounds of the standard.',
      source: 'Section 3',
      result_id: `mock-${i}`,
      review_status: 'pending',
    };
  });

  return { results };
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ------------------------------------------------------------
// Rendering: loading / error / empty / results
// ------------------------------------------------------------
function showLoading() {
  resultsCount.textContent = '';
  resultsArea.innerHTML = `
    <div class="loading-state">
      <span class="loading-dot"></span><span class="loading-dot"></span><span class="loading-dot"></span>
      Running review — this can take a few seconds…
    </div>`;
}

function showError(message) {
  resultsCount.textContent = '';
  resultsArea.innerHTML = `
    <div class="error-state">
      <h3>The review couldn't be completed</h3>
      <p>${escapeHtml(message)}</p>
    </div>`;
}

function renderResults(results) {
  if (!results || results.length === 0) {
    resultsCount.textContent = '';
    resultsArea.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-mark">§</div>
        <p>No findings were returned.</p>
      </div>`;
    return;
  }

  resultsCount.textContent = `${results.length} clause type${results.length === 1 ? '' : 's'} reviewed`;

  const grid = document.createElement('div');
  grid.className = 'results-grid';

  results.forEach((result) => grid.appendChild(buildResultCard(result)));

  resultsArea.innerHTML = '';
  resultsArea.appendChild(grid);
}

function buildResultCard(result) {
  const node = resultCardTemplate.content.cloneNode(true);
  const card = node.querySelector('.result-card');

  const riskKey = riskLevelToKey(result.risk_level);
  card.dataset.risk = riskKey;

  const isUnknown = riskKey === 'unknown';
  if (isUnknown) card.classList.add('unknown-case');

  card.querySelector('.clause-name').textContent = result.clause_type ?? '';
  card.querySelector('.risk-badge-text').textContent = result.risk_level ?? '';
  card.querySelector('.reason').textContent = result.reason ?? '';

  if (!isUnknown) {
    card.querySelector('.clause-text').textContent = result.contract_clause ?? '(no clause text returned)';
  }
  card.querySelector('.standard-text').textContent = result.company_standard ?? '';
  card.querySelector('.evidence-source').textContent = result.source ?? '';

  // Disposition buttons
  const statusEl = card.querySelector('.disposition-status');
  const feedbackEl = card.querySelector('.feedback-input');
  const buttons = card.querySelectorAll('.disp-btn');

  buttons.forEach((btn) => {
    btn.addEventListener('click', async () => {
      buttons.forEach((b) => { b.disabled = true; b.classList.remove('active'); });
      statusEl.textContent = 'Saving…';
      try {
        await submitReview({
          result_id: result.result_id,
          decision: btn.dataset.decision,
          feedback: feedbackEl.value || undefined,
        });
        btn.classList.add('active');
        statusEl.textContent = `Saved — marked "${btn.dataset.decision}".`;
      } catch (err) {
        statusEl.textContent = `Couldn't save (${err.message}).`;
        buttons.forEach((b) => { b.disabled = false; });
      }
    });
  });

  return node;
}

function riskLevelToKey(riskLevel) {
  switch (riskLevel) {
    case 'Low Risk': return 'low';
    case 'Medium Risk': return 'medium';
    case 'High Risk': return 'high';
    case 'Not Enough Information': return 'unknown';
    default: return 'unknown';
  }
}

// ------------------------------------------------------------
// Submit review — POST /api/review
// ------------------------------------------------------------
async function submitReview({ result_id, decision, feedback }) {
  const res = await fetch(`${API_BASE}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ result_id, decision, feedback }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json().catch(() => ({}));
}

// ------------------------------------------------------------
// Utils
// ------------------------------------------------------------
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
