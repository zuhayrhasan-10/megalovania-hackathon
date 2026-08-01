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

// The seven clause categories the AI scanner is responsible for finding.
// Order matters — earlier entries take precedence when spans overlap
// (e.g. a sentence that mentions both payment and termination).
const CLAUSE_CATEGORIES = [
  {
    id: 'payment',
    name: 'Payment',
    // Phrases that strongly indicate a payment clause. Multi-word phrases
    // are matched before single words so "net 30" wins over a stray "fee".
    patterns: [
      /\bpayment\s+terms?\b/gi,
      /\binvoice(?:s|d)?\b/gi,
      /\bnet\s+\d+\b/gi,
      /\bfee(?:s)?\b/gi,
      /\bcompensation\b/gi,
      /\bprice\s+and\s+payment\b/gi,
      /\bpayable\s+(?:within|in)\b/gi,
      /\bcost(?:s)?\b/gi,
    ],
  },
  {
    id: 'data-protection',
    name: 'Data Protection',
    patterns: [
      /\bdata\s+protection\b/gi,
      /\bpersonal\s+(?:data|information)\b/gi,
      /\bGDPR\b/gi,
      /\bprivacy\s+(?:policy|notice|laws?)\b/gi,
      /\bprocessing\s+of\s+(?:personal|user)\b/gi,
      /\bdata\s+(?:security|breach|controller|processor)\b/gi,
    ],
  },
  {
    id: 'termination',
    name: 'Termination',
    patterns: [
      /\btermination\s+for\s+(?:convenience|cause)\b/gi,
      /\bterminate\s+this\s+(?:agreement|contract)\b/gi,
      /\bnotice\s+of\s+termination\b/gi,
      /\bupon\s+termination\b/gi,
      /\bsurviv(?:e|al)\s+(?:of|ing)\b/gi,
      /\bend\s+of\s+(?:the\s+)?term\b/gi,
    ],
  },
  {
    id: 'confidentiality',
    name: 'Confidentiality',
    patterns: [
      /\bconfidentiality\b/gi,
      /\bconfidential\s+information\b/gi,
      /\bnon[\s-]?disclosure\b/gi,
      /\bNDA\b/gi,
      /\bproprietary\s+(?:information|data)\b/gi,
      /\btrade\s+secret(?:s)?\b/gi,
    ],
  },
  {
    id: 'auto-renewal',
    name: 'Automatic Renewal',
    patterns: [
      /\bautomatic(?:ally)?\s+renew(?:al|ed|s)?\b/gi,
      /\bauto[\s-]?renew(?:al|ed|s)?\b/gi,
      /\brenew(?:al|s|ed)?\s+(?:this\s+)?agreement\b/gi,
      /\bunless\s+(?:either\s+party\s+)?(?:gives?\s+)?notice\s+(?:of\s+)?termination\b/gi,
      /\bsuccessive\s+(?:\d+[\s-]?(?:year|month)\s+)?terms?\b/gi,
    ],
  },
  {
    id: 'limitation-liability',
    name: 'Limitation of Liability',
    patterns: [
      /\blimitation\s+of\s+liability\b/gi,
      /\bliab(?:le|ility)\s+(?:shall\s+be\s+)?limited\b/gi,
      /\bin\s+no\s+event\s+shall\b/gi,
      /\bconsequential\s+damages?\b/gi,
      /\bmaximum\s+liability\b/gi,
      /\baggregate\s+liability\b/gi,
    ],
  },
  {
    id: 'ip',
    name: 'Intellectual Property',
    patterns: [
      /\bintellectual\s+property\b/gi,
      /\b(?:all\s+)?right(?:s)?\s+,\s+title\s+(?:and|or)\s+interest\b/gi,
      /\bcopyright(?:s|ed)?\b/gi,
      /\btrademark(?:s)?\b/gi,
      /\bpatent(?:s)?\b/gi,
      /\bwork\s+product\b/gi,
      /\bownership\s+of\s+(?:the\s+)?(?:deliverables|results|work)\b/gi,
    ],
  },
];

// The clause list shown in Exhibit B is derived from CLAUSE_CATEGORIES —
// these are the seven categories the AI scans for. Falls back to this
// list if /api/clause-types fails too.
const SAMPLE_CLAUSE_TYPES = CLAUSE_CATEGORIES.map((c, i) => ({
  id: `ct${i + 1}`,
  categoryId: c.id,
  name: c.name,
}));

// ------------------------------------------------------------
// State
// ------------------------------------------------------------
const state = {
  contracts: [],
  clauseTypes: [],
  selectedContractId: null,
  selectedClauseTypeIds: new Set(),
  // detectedClauses[contractId] -> [{ categoryId, sentence, start, end }]
  // populated when a contract is selected, used to highlight the document
  // and to seed the "Run Review" results.
  detectedClauses: {},
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
const dropzoneEl = document.getElementById('dropzone');
const fileInputEl = document.getElementById('fileInput');
const uploadStatusEl = document.getElementById('uploadStatus');
const documentAreaEl = document.getElementById('documentArea');

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB per file — guard against accidental huge drops

// ------------------------------------------------------------
// Init
// ------------------------------------------------------------
init();

function init() {
  stampCaseNumber();
  loadContracts();
  loadClauseTypes();
  runBtn.addEventListener('click', runReview);
  setupUploader();
  setupTabs();
  renderDocumentPane();
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
  // Run the AI scan as soon as the user picks a contract so findings are
  // ready by the time they hit "Run Review". For local uploads this is
  // synchronous; for backend-served contracts we kick off an async fetch.
  scanContractForClauses(id);
  renderDocumentPane();
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
  activateTab('findings');

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

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => activateTab(btn.dataset.tab));
  });
}

function activateTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    const active = btn.dataset.tab === tabName;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  document.querySelectorAll('.tab-panel').forEach((panel) => {
    panel.hidden = panel.dataset.tab !== tabName;
  });
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

  // Use the real detected spans as the contract_clause so the mock is
  // indistinguishable from a real backend response. Falls back to a
  // generic sentence if detection hasn't run yet.
  const detected = state.detectedClauses[payload.contract_id] || [];
  const detectedByCategory = detected.reduce((acc, d) => {
    (acc[d.categoryId] ||= []).push(d);
    return acc;
  }, {});

  const sampleRiskLevels = ['Low Risk', 'Medium Risk', 'High Risk', 'Not Enough Information'];

  const results = (selected.length ? selected : state.clauseTypes).map((clauseType, i) => {
    const name = clauseType.name ?? clauseType.label ?? `Clause ${i + 1}`;
    const categoryId = clauseType.categoryId ?? clauseType.id;
    const matches = detectedByCategory[categoryId] || [];
    const riskLevel = sampleRiskLevels[i % sampleRiskLevels.length];

    if (riskLevel === 'Not Enough Information' || matches.length === 0) {
      return {
        clause_type: name,
        risk_level: matches.length === 0 ? 'Not Enough Information' : riskLevel,
        contract_clause: matches.length === 0 ? null : matches[0].sentence,
        company_standard: 'Every agreement must include a clause of this type addressing scope and duration.',
        reason: matches.length === 0
          ? 'No matching clause could be located in the uploaded contract text.'
          : 'Clause deviates moderately from the standard term.',
        source: matches.length === 0 ? null : `Section ${i + 1}`,
        result_id: `mock-${i}`,
        review_status: 'pending',
      };
    }

    // Use the first detected sentence as the quoted clause text; the
    // document pane highlights every match.
    return {
      clause_type: name,
      risk_level: riskLevel,
      contract_clause: matches[0].sentence,
      company_standard: `Standard requires ${name.toLowerCase()} terms to be specific, time-bound, and consistent with internal policy.`,
      reason: riskLevel === 'High Risk'
        ? 'Clause deviates significantly from the standard — review with counsel.'
        : riskLevel === 'Medium Risk'
          ? 'Clause deviates moderately from the standard term.'
          : 'Clause is within acceptable bounds of the standard.',
      source: `Section ${i + 1}`,
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

// ------------------------------------------------------------
// AI clause scan — finds each of the 7 clause categories inside a
// contract's text. Splits into sentences, classifies each against the
// regex patterns in CLAUSE_CATEGORIES, and merges adjacent matches of
// the same category into a single span. Result: an array of
// { categoryId, sentence, start, end } that downstream rendering can
// quote and highlight.
// ------------------------------------------------------------
function scanContractForClauses(contractId) {
  const contract = state.contracts.find((c) => (c.id ?? c.contract_id) === contractId);
  const text = contract?.text;
  if (!text) {
    // Backend-served contracts (SAMPLE_CONTRACTS) don't carry text. The
    // mock analyze path synthesizes placeholder findings; nothing to scan.
    state.detectedClauses[contractId] = [];
    return;
  }

  const sentences = splitIntoSentences(text);
  const hits = [];

  for (const sentence of sentences) {
    let bestCategoryId = null;
    let bestPatternIndex = Infinity;

    for (const category of CLAUSE_CATEGORIES) {
      for (let p = 0; p < category.patterns.length; p += 1) {
        // Re-create the regex per check (they're flag-bearing, so .test
        // mutates lastIndex) — harmless but keeps state predictable.
        const re = new RegExp(category.patterns[p].source, category.patterns[p].flags);
        if (re.test(sentence.text)) {
          // Earlier categories and earlier patterns within a category win.
          const score = CLAUSE_CATEGORIES.indexOf(category) * 100 + p;
          if (score < bestPatternIndex) {
            bestPatternIndex = score;
            bestCategoryId = category.id;
          }
          break; // first matching pattern in this category is enough
        }
      }
    }

    if (bestCategoryId) {
      hits.push({
        categoryId: bestCategoryId,
        sentence: sentence.text.trim(),
        start: sentence.start,
        end: sentence.end,
      });
    }
  }

  state.detectedClauses[contractId] = hits;
}

function splitIntoSentences(text) {
  // Naive but predictable: split on `.`, `!`, `?`, or a newline followed by
  // a capital letter (typical contract section break). Returns each slice
  // with its absolute offset so we can render <mark> spans later.
  const sentences = [];
  const re = /[^.!?\n]+[.!?]?/g;
  let match;
  while ((match = re.exec(text)) !== null) {
    const raw = match[0];
    const start = match.index;
    const end = start + raw.length;
    if (raw.trim().length === 0) continue;
    sentences.push({ text: raw, start, end });
  }
  return sentences;
}

function getDetectedClauseCategories(contractId) {
  const hits = state.detectedClauses[contractId] || [];
  const set = new Set();
  for (const h of hits) set.add(h.categoryId);
  return set;
}

// Re-render the "Document" pane in the main area with highlighted spans.
// Falls back to a placeholder if no contract is selected or the selected
// contract has no text (backend-served).
function renderDocumentPane() {
  const docPane = document.getElementById('documentArea');
  if (!docPane) return;

  if (state.selectedContractId == null) {
    docPane.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-mark">§</div>
        <p>No contract selected.</p>
        <p class="empty-state-sub">Pick a contract from Exhibit A to see highlighted clauses here.</p>
      </div>`;
    return;
  }

  const contract = state.contracts.find((c) => (c.id ?? c.contract_id) === state.selectedContractId);
  const text = contract?.text;

  if (!text) {
    docPane.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-mark">§</div>
        <p>Document preview unavailable.</p>
        <p class="empty-state-sub">This contract wasn't uploaded as a .txt file — there's no text to scan and highlight here.</p>
      </div>`;
    return;
  }

  const hits = state.detectedClauses[state.selectedContractId] || [];
  docPane.innerHTML = renderHighlightedDocument(text, hits);
}

function renderHighlightedDocument(text, hits) {
  // Build the legend chip list so the user can see which categories were
  // found and how many times.
  const countsByCategory = hits.reduce((acc, h) => {
    acc[h.categoryId] = (acc[h.categoryId] || 0) + 1;
    return acc;
  }, {});

  const legendItems = CLAUSE_CATEGORIES
    .filter((c) => countsByCategory[c.id])
    .map((c) => `<li><span class="legend-chip legend-${c.id}">${escapeHtml(c.name)}</span><span class="legend-count">${countsByCategory[c.id]}</span></li>`)
    .join('');

  // Walk the text in order and emit alternating plain/marked segments.
  // Hits are absolute character ranges into `text`; we sort and merge any
  // overlaps defensively (the detector already disambiguates by category).
  const sortedHits = [...hits].sort((a, b) => a.start - b.start);

  let cursor = 0;
  let html = '';
  for (const hit of sortedHits) {
    const start = Math.max(hit.start, cursor);
    const end = Math.min(hit.end, text.length);
    if (start >= end) continue;
    if (cursor < start) html += escapeHtml(text.slice(cursor, start));
    html += `<mark class="hl hl-${hit.categoryId}" data-category="${hit.categoryId}">${escapeHtml(text.slice(start, end))}</mark>`;
    cursor = end;
  }
  if (cursor < text.length) html += escapeHtml(text.slice(cursor));

  const legend = legendItems
    ? `<ul class="doc-legend">${legendItems}</ul>`
    : `<p class="doc-legend-empty">No clauses from the 7 standard categories were detected in this document.</p>`;

  return `${legend}<div class="doc-text">${html}</div>`;
}

// ------------------------------------------------------------
// Upload (Exhibit C) — local-only; reads text files into memory
// and registers them as contracts. No network call.
// ------------------------------------------------------------
function setupUploader() {
  if (!dropzoneEl || !fileInputEl) return;

  fileInputEl.addEventListener('change', (e) => {
    handleFiles(Array.from(e.target.files || []));
    // reset so selecting the same file again still fires `change`
    fileInputEl.value = '';
  });

  // Click + keyboard activation on the label triggers the hidden input natively;
  // we only need to wire drag-and-drop and the visual state here.
  ['dragenter', 'dragover'].forEach((evt) => {
    dropzoneEl.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzoneEl.classList.add('is-dragover');
    });
  });

  ['dragleave', 'dragend'].forEach((evt) => {
    dropzoneEl.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      // dragleave fires when entering child elements too — only clear if we
      // genuinely left the dropzone
      if (evt === 'dragleave' && dropzoneEl.contains(e.relatedTarget)) return;
      dropzoneEl.classList.remove('is-dragover');
    });
  });

  dropzoneEl.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzoneEl.classList.remove('is-dragover');
    const files = Array.from(e.dataTransfer?.files || []);
    handleFiles(files);
  });
}

async function handleFiles(files) {
  if (!files || files.length === 0) return;

  // Filter to plain text only — the UI is built around .txt contracts.
  const textFiles = files.filter(
    (f) => f.type === 'text/plain' || /\.txt$/i.test(f.name)
  );
  const skipped = files.length - textFiles.length;

  if (textFiles.length === 0) {
    setUploadStatus(
      `Only .txt files are supported${skipped ? ` — skipped ${skipped}` : ''}.`,
      'err'
    );
    return;
  }

  setUploadStatus(`Reading ${textFiles.length} file${textFiles.length === 1 ? '' : 's'}…`);

  const added = [];
  for (const file of textFiles) {
    try {
      if (file.size > MAX_FILE_BYTES) {
        throw new Error(`larger than 5 MB`);
      }
      const text = await file.text();
      if (!text.trim()) {
        throw new Error('file is empty');
      }
      const contract = makeContractFromFile(file, text);
      // New uploads sit at the top of the list so the user can find them.
      state.contracts = [contract, ...state.contracts];
      added.push(contract);
    } catch (err) {
      console.warn('Upload failed for', file.name, err);
      setUploadStatus(`Couldn't read "${file.name}" — ${err.message}.`, 'err', /* keep */ true);
    }
  }

  if (added.length > 0) {
    renderContracts();
    // Auto-select the first newly uploaded contract so the user can run a
    // review immediately. Skip if a selection already exists and they haven't
    // uploaded before — preserve their context.
    const firstId = added[0].id;
    if (state.selectedContractId == null) {
      selectContract(firstId);
    }
    const skippedNote = skipped ? ` (skipped ${skipped} non-.txt)` : '';
    setUploadStatus(
      `Loaded ${added.length} contract${added.length === 1 ? '' : 's'}${skippedNote} · scanning for clauses…`,
      'ok'
    );
  }
}

function makeContractFromFile(file, text) {
  // Derive a friendly title from the filename — strip extension, drop
  // trailing dashes/dots, and trim length so it fits the sidebar.
  const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
  const name = baseName || file.name;
  const meta = `${formatBytes(file.size)} · uploaded just now`;
  // local-only contracts use a stable id prefixed so they can't collide
  // with backend ids (which are typically short slugs like "c1").
  const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  return { id, name, meta, text };
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function setUploadStatus(message, kind, keep = false) {
  uploadStatusEl.innerHTML = kind
    ? `<span class="upload-${kind}">${escapeHtml(message)}</span>`
    : escapeHtml(message);
  if (!keep) {
    // Auto-clear success/info messages after a beat; keep errors visible.
    clearTimeout(setUploadStatus._t);
    setUploadStatus._t = setTimeout(() => {
      uploadStatusEl.innerHTML = '';
    }, 4500);
  }
}
