# Contract Review Backend

AI-powered contract review assistant. Reads contracts, finds clauses
that match the selected risk categories, compares each clause against
the company's approved standard, and returns a structured risk
assessment + evidence.

The AI is powered by Google's Gemini via the official
`@google/generative-ai` SDK.

---

## Endpoints

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| `GET` | `/api/contracts` | — | `[{ id, name, meta }]` |
| `GET` | `/api/clause-types` | — | `[{ id, name, description }]` |
| `POST` | `/api/analyze` | `{ contract_id, clause_type_ids: [] }` | `{ results: [...] }` |
| `POST` | `/api/review` | `{ result_id, decision, feedback }` | `{ ok, review }` |
| `GET` | `/api/reviews` | — | debug dump of stored reviews |
| `GET` | `/health` | — | `{ ok: true }` |

Each result in `POST /api/analyze` looks like:

```json
{
  "clause_type": "Automatic Renewal",
  "risk_level": "High Risk",
  "contract_clause": "...the agreement will automatically renew for another year unless cancelled 60 days before the end date.",
  "company_standard": "Automatic renewal should require at least 30 days' notice.",
  "reason": "The contract requires 60 days' notice, which is longer than the company standard.",
  "source": "Section 2",
  "result_id": "ct5-abc123",
  "review_status": "pending"
}
```

`risk_level` is one of `Low Risk`, `Medium Risk`, `High Risk`, or
`Not Enough Information`.

---

## Step-by-step setup

1. **Install Node.js 18+** if you don't have it already.

2. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Create your `.env`**
   ```bash
   cp .env.example .env
   ```
   Then open `.env` and paste your Gemini API key from
   https://aistudio.google.com/app/apikey:
   ```env
   GEMINI_API_KEY=AIza...
   GEMINI_MODEL=gemini-1.5-flash
   PORT=3001
   ```

4. **Start the server**
   ```bash
   npm start
   ```
   You should see:
   ```
   Contract review backend listening on http://localhost:3001
   ```

5. **Hit it from the frontend**
   In `frontend/app.js`, flip the mock switch to `false`:
   ```js
   const USE_MOCK_ANALYZE = false;
   ```
   Make sure the frontend is being served from a port that can reach
   `/api/*` (e.g. run it through a static server with a proxy to
   `localhost:3001`, or use CORS — the backend already enables it).

---

## How clause comparison works

1. The frontend sends `POST /api/analyze` with a `contract_id` and
   one or more `clause_type_ids`.
2. `services/geminiService.js` builds one focused prompt **per clause
   type** and calls Gemini in parallel.
3. Each prompt gives Gemini the contract text + the matching company
   standard and asks it to return strict JSON containing:
   - the exact clause excerpt (or `null` if missing),
   - a `Low / Medium / High / Not Enough Information` verdict,
   - a short reason a non-lawyer can read.
4. If the model can't find a matching clause, the response is
   automatically downgraded to `Not Enough Information` and
   `contract_clause` is forced to `null` so we never return a risk
   verdict without evidence (per the spec).
5. Per-clause failures are isolated: one bad clause doesn't tank the
   whole review.

---

## Adding new clause types / contracts / standards

- **Contracts** — append to `backend/data/contracts.json`. Each entry
  needs `id`, `name`, `meta`, `text`.
- **Clause types** — append to `backend/data/clauseTypes.json` with
  `id`, `name`, `description`.
- **Company standards** — add the matching `id` key to
  `backend/data/companyStandards.json`. If a clause type has no
  published standard, Gemini will still return a verdict using a
  generic fallback standard.

Restart the server after editing any of these files.