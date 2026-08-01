// ============================================================
// Gemini service — clause extraction + risk comparison
// ============================================================
// Responsibilities:
//   1. Read a contract.
//   2. For each requested clause type, find the matching clause text.
//   3. Compare the clause text against the company standard.
//   4. Return a structured risk assessment with evidence and reason.
//
// All Gemini calls go through this single module so prompts stay
// consistent and easy to tweak.

const { GoogleGenerativeAI } = require('@google/generative-ai');

// One-time SDK init from env. Throws fast if the key is missing so the
// developer notices immediately rather than at the first /api/analyze call.
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error(
    'GEMINI_API_KEY is missing. Copy backend/.env.example to backend/.env and add your key.'
  );
}

const genAI = new GoogleGenerativeAI(apiKey);
const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const model = genAI.getGenerativeModel({
  model: modelName,
  // We force JSON so we can parse results deterministically.
  generationConfig: {
    temperature: 0.1,
    responseMimeType: 'application/json',
  },
});

// ------------------------------------------------------------
// Prompt: analyze a single clause type in the contract.
// ------------------------------------------------------------
// We deliberately ask for one clause type per call so the model has
// a smaller, focused task and we can parallelise calls for speed.
function buildPrompt({ clauseType, clauseDescription, contractText, companyStandard }) {
  return `You are a contract review assistant. Your job is to compare a specific clause in a vendor contract against the company's approved standard for that clause type.

IMPORTANT RULES
- You must ONLY use information that is explicitly written in the contract text. Do not invent clauses, rules, or legal explanations.
- If the contract does not contain a clause that reasonably matches this clause type, return risk_level = "Not Enough Information" and contract_clause = null.
- Every result must include a short reason that a non-lawyer can understand.

CLAUSE TYPE TO REVIEW
Name: ${clauseType}
Description: ${clauseDescription}

COMPANY APPROVED STANDARD
${companyStandard}

CONTRACT TEXT
"""
${contractText}
"""
`;

  // (formatted schema appended below — kept outside the template string so
  //  future schema tweaks don't accidentally re-wrap the prompt body)
}

// Schema the model must produce for a single clause type.
const RESPONSE_SCHEMA_DESCRIPTION = `
Respond with a single JSON object that matches this exact shape:

{
  "clause_type": string,                    // repeat the clause type name
  "risk_level": "Low Risk" | "Medium Risk" | "High Risk" | "Not Enough Information",
  "contract_clause": string | null,         // exact quoted excerpt, or null if missing
  "company_standard": string,               // the standard the model compared against
  "reason": string,                         // short, plain-English explanation
  "source": string | null                   // section number / heading where the clause was found, or null
}

Risk level guidance:
- "Low Risk"        : clause matches or is more favorable than the company standard.
- "Medium Risk"     : clause deviates from the standard but is still acceptable (e.g. a longer notice window).
- "High Risk"       : clause clearly conflicts with the standard (e.g. shorter termination notice, weaker liability cap, longer auto-renew).
- "Not Enough Information": contract_clause is null because no matching clause was found.
`;

// ------------------------------------------------------------
// Public API: analyzeClauseTypes({ contractText, clauseTypes, standardsMap })
// ------------------------------------------------------------
// Returns an array of result objects matching the schema above, one
// per requested clause type. Calls Gemini once per clause type in parallel.
async function analyzeClauseTypes({ contractText, clauseTypes, standardsMap }) {
  if (!contractText) throw new Error('contractText is required.');
  if (!Array.isArray(clauseTypes) || clauseTypes.length === 0) {
    throw new Error('At least one clause type is required.');
  }

  const tasks = clauseTypes.map(async (ct) => {
    const id = ct.id ?? ct.clause_type_id;
    const name = ct.name ?? ct.label ?? `Clause ${id}`;
    const description = ct.description ?? '';
    const standard =
      (standardsMap[id] && standardsMap[id].standard) ||
      'No company standard has been published for this clause type yet.';

    const prompt =
      buildPrompt({
        clauseType: name,
        clauseDescription: description,
        contractText,
        companyStandard: standard,
      }) + RESPONSE_SCHEMA_DESCRIPTION;

    try {
      const result = await model.generateContent(prompt);
      const raw = result.response.text();
      const parsed = safeParseJson(raw);

      // Defensive normalisation: the model occasionally renames/omits keys.
      return normalizeResult({
        result_id: `${id}-${nanoid()}`,
        clause_type: name,
        risk_level: parsed.risk_level,
        contract_clause: parsed.contract_clause,
        company_standard: parsed.company_standard || standard,
        reason: parsed.reason,
        source: parsed.source,
        review_status: 'pending',
      });
    } catch (err) {
      // Never crash the whole /api/analyze call because of one bad clause.
      // Surface the failure as a "Not Enough Information" row so the UI
      // still renders and the reviewer knows something went wrong.
      console.error(`[gemini] ${name} failed:`, err.message);
      return normalizeResult({
        result_id: `${id}-${nanoid()}`,
        clause_type: name,
        risk_level: 'Not Enough Information',
        contract_clause: null,
        company_standard: standard,
        reason: `The AI couldn't review this clause right now (${err.message}). Please review manually.`,
        source: null,
        review_status: 'pending',
      });
    }
  });

  // Parallel = ~Nx faster than awaiting sequentially when there are many
  // clause types, while still capping the per-call prompt size.
  return Promise.all(tasks);
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function safeParseJson(text) {
  // Gemini may wrap JSON in ```json fences; strip them.
  const cleaned = String(text)
    .trim()
    .replace(/^```json/i, '')
    .replace(/^```/, '')
    .replace(/```$/, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`Model returned non-JSON response: ${cleaned.slice(0, 200)}`);
  }
}

function normalizeResult(r) {
  const allowedRisk = ['Low Risk', 'Medium Risk', 'High Risk', 'Not Enough Information'];
  if (!allowedRisk.includes(r.risk_level)) {
    r.risk_level = 'Not Enough Information';
  }
  if (r.risk_level === 'Not Enough Information') {
    // Rule from the spec: no risk result without evidence.
    r.contract_clause = null;
    r.source = null;
  }
  if (r.contract_clause == null) {
    r.reason = r.reason || 'No matching clause could be located in the uploaded contract text.';
  }
  return r;
}

// Tiny id helper — avoids pulling in another dep just for this.
function nanoid(len = 10) {
  return Math.random().toString(36).slice(2, 2 + len);
}

module.exports = { analyzeClauseTypes };