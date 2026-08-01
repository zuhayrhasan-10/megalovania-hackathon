# Contract Review Assistant

An AI-powered web app that reads contracts (text files), finds important clauses inside them, and tells you which ones look risky. Built for a hackathon.

The whole app lives in the `frontend/` folder: `index.html`, `style.css`, and `app.js`. Open `frontend/index.html` in your browser to use it — there is no server step yet.

> 📝 **This README is a living document.** Every change we make to the project gets a new entry in the **Latest changes** section below (and a matching entry in [`CHANGELOG.md`](./CHANGELOG.md)). Keep them in sync — see [How to update this README](#how-to-update-this-readme) at the bottom.

---

## Latest changes
**Change #9 — Human in the Process (Final Review summary):** After running a review, a consolidated table at the bottom of the Findings pane shows one row per clause type with the AI's risk level, contract clause, company standard, reason, a "Human Review" pill (Required / Recommended / Optional), and the human's decision + feedback. Decisions and feedback typed on the per-finding cards above update this table in real time. Until the first decision is made, the table shows a reminder telling the reviewer to use the per-card Approve / Reject / Mark + Add Feedback controls.
**Change #8 — Honesty guard for "Not Enough Information":** When the AI cannot find a clause in the contract, the Findings card now shows the exact message *"Not enough information to invent a clause, or legal explanation."* in a dedicated banner at the top of the card. The side-by-side comparison table is left empty (with an honest "no comparison produced" note), and the references section is relabelled to *"What would have been checked"* so users can see the basis *without* the AI pretending it actually used it. The AI will never invent a clause or a legal explanation out of thin air.

**Change #7 — Risk-level system with side-by-side reasoning:** Each Findings card now explains *why* a risk level was assigned, with a side-by-side table of every discrepancy between the uploaded contract and the company standard / prior agreements, plus a numbered list of references and sources behind the rating.

Previous changes are summarized in the [Step-by-step build log](#what-we-built-step-by-step) further down and detailed in full in [`CHANGELOG.md`](./CHANGELOG.md).

---

## How to use it (30 seconds)

1. Open `frontend/index.html` in any modern browser (Chrome, Edge, Firefox, Safari).
2. On the left side, under **Exhibit C — Upload Contracts**, drop one or more `.txt` files onto the dropzone (or click it and pick files).
3. Your uploaded files appear at the top of **Exhibit A — Select Contract**. Click one to open it.
4. The main area opens the **Document** tab and underlines every important clause it found, color-coded by category. The legend at the top shows how many of each type were detected.
5. Under **Exhibit B — Clause Types**, tick the categories you want a risk report for (or just leave them all ticked).
6. Click the big **Run Review** button. It switches to the **Findings** tab and shows one card per clause category, with the matched sentence quoted and a risk rating.

---

## What we built, step by step

We added features one at a time. Here's what we did, in plain English.

### Step 1 — Built the basic review UI

We started with a three-panel layout styled like a legal case file (dark navy paper, brass accents, serif fonts).

- A **left sidebar** with three sections called "Exhibits":
  - **Exhibit A** — a list of contracts to pick from.
  - **Exhibit B** — a list of clause types to review for (checkboxes).
  - **Exhibit C** — added later (see Step 2).
- A **Run Review** button at the bottom of the sidebar.
- A **main area** on the right where findings show up as cards. Each card has a clause name, a risk badge (Low / Medium / High / Not Enough Information), the quoted contract clause, the company standard it was compared against, a reason, and three buttons (Approve / Reject / Mark for review).
- The findings come from a placeholder function called `mockAnalyze` that pretends to be the AI. It generates a few fake results so the UI can be built and clicked through before the real backend exists. There is a switch at the top of `app.js` called `USE_MOCK_ANALYZE` — flip it to `false` when the real `/api/analyze` endpoint is live.

### Step 2 — Added contract uploads (Exhibit C)

The first version had a fixed list of sample contracts. We replaced that with a real upload box.

- Added a dropzone (Exhibit C) to the sidebar — you can drag `.txt` files onto it, or click it to browse.
- Multiple files at once are supported. Each file is read in the browser (no upload to a server yet — the file text stays in memory).
- Each uploaded file is added to Exhibit A at the top of the list and gets a name based on the filename (with a size tag like "12.4 KB · uploaded just now").
- The first newly uploaded file is auto-selected so you can run a review right away.
- Non-`.txt` files are skipped with a friendly error message. Empty files and files bigger than 5 MB are also rejected.
- The seven clause categories (see Step 3) are also displayed in Exhibit B automatically, even before any backend is connected.

### Step 3 — AI scans the contract for important clauses

This is the brains of the app. The scanner reads the whole contract and pulls out the sentences that matter.

- We hard-coded the **seven clause categories** the AI is responsible for finding:
  1. Payment
  2. Data Protection
  3. Termination
  4. Confidentiality
  5. Automatic Renewal
  6. Limitation of Liability
  7. Intellectual Property
- For each category, we wrote a list of patterns (words and phrases) that strongly suggest that category. For example, "limitation of liability", "net 30", "GDPR", "automatic renewal", "confidential information", and so on.
- When you pick a contract, the app splits the text into sentences and walks through them one by one. Each sentence is checked against every category. The first match wins, so a sentence gets one category, not five.
- The matched sentences are stored in memory and used in two places:
  1. The **Document tab** underlines every detected sentence in the contract, with a different color per category. There's also a small legend at the top that shows the category name and how many times it was found.
  2. The **Run Review** results quote the matched sentence directly in each finding card, instead of a made-up placeholder.

### Step 4 — Document tab and Findings tab

The main area used to show only Findings. We split it into two tabs so the highlighted contract is always one click away.

- **Document** tab — shows the full contract text with detected clauses underlined in color. This is the default tab when you select a contract.
- **Findings** tab — shows the risk review cards. The app jumps to this tab automatically when you click **Run Review**.
- Each tab is just a click away; clicking the tab header swaps the view.

### Step 5 — Friendly status messages

When you upload files, the dropzone shows what happened:
- A green "Loaded 3 contracts · scanning for clauses…" message on success.
- A red error message (kept on screen until you upload again) if a file couldn't be read.
- Success messages auto-clear after a few seconds.

### Step 6 — Honesty guard ("Not Enough Information")

The risk system has four levels. Three are real ratings; the fourth is a deliberate no-answer. When the scanner walks the contract and finds *no sentence* matching a clause category, the AI has nothing to compare against the standard. Rather than guess, it now reports *"Not Enough Information"* and the card surfaces this exact message in a dedicated banner at the top:

> *Not enough information to invent a clause, or legal explanation.*

For those cards we also:

- leave the side-by-side comparison table empty (with a note explaining no comparison was produced), instead of inventing discrepancies;
- relabel the references section to *"What would have been checked"*, so the user can see the legal sources we *would* have used, without us pretending we used them;
- hide the matched-clause quote, because there isn't one.

The hard rule is: **the AI will not invent a clause out of thin air, and it will not produce a baseless legal explanation out of context.** If the evidence isn't there, the answer is *"Not Enough Information"* — never a fabricated risk level.

### Step 7 — Human in the Process (Final Review summary)

The AI suggests risks, but a human has the final say. Every Findings card still has the four mandatory disposition controls:

- **Approve** — the clause is acceptable as-is.
- **Reject** — the clause is not acceptable; do not sign.
- **Mark for review** — needs a second pair of eyes before deciding.
- **Add feedback** — a free-text margin note attached to that finding.

At the bottom of the Findings pane we now render a single consolidated **Final Review** table that mirrors everything the human has decided so far. One row per clause type, with columns for:

| Column | Source |
| --- | --- |
| Clause Type | name of the finding |
| Risk Level | the AI's badge (Low / Medium / High / Not Enough Information) |
| Contract Clause | the matched sentence (truncated) |
| Company Standard | the baseline we compared against |
| Reason | the AI's plain-English explanation |
| **Human Review** | the AI's recommendation pill: *Required* (High), *Recommended* (Medium), *Optional* (Low), *Required* (Not Enough Information) |
| **Decision** | the human's Approve / Reject / Mark call |
| **Feedback** | the human's margin note |

Until at least one decision is saved, the table is replaced with a short reminder telling the reviewer to use the per-card controls. As soon as a decision is made, the table fades in and updates live — typing feedback in a card updates the corresponding row in the table without losing focus. Decisions persist across re-renders, but a fresh review drops dispositions for clause types that are no longer in scope so old calls can't leak in.

---

## Project layout

```
megalovania-hackathon/
├── README.md            ← you are here
└── frontend/
    ├── index.html       ← the page layout (sidebar, tabs, result card template)
    ├── style.css        ← all the styles (case-file theme, tabs, highlights)
    └── app.js           ← all the logic (uploads, scanning, rendering, mock AI)
```

Everything is one page, one stylesheet, one script. No build step. No frameworks.

---

## What's next (not done yet)

These are stubs we kept in the code with notes for whoever picks this up:

- **Real AI endpoint** — flip `USE_MOCK_ANALYZE` to `false` in `app.js` and point `realAnalyze` at your backend's `/api/analyze`. The mock returns the right shape, so the frontend should "just work" once the backend is up.
- **Real contracts list** — `GET /api/contracts` is already wired up. Until then, the app falls back to three sample contracts.
- **Real clause types list** — `GET /api/clause-types` is already wired up. Until then, the seven hard-coded categories are used.
- **Saving dispositions** — the Approve / Reject / Mark for review buttons already call `POST /api/review`. Once that endpoint exists, decisions will be saved.
- **Better clause detection** — the current scanner uses regex patterns. A real LLM call would catch more nuanced phrasing. You can replace the body of `scanContractForClauses` with a `fetch` to `/api/scan` whenever it's ready.
- **PDF / DOCX uploads** — the dropzone only accepts `.txt` right now. Other formats would need a parser (PDF.js, mammoth, etc.).

---

## Glossary (so the code comments make sense)

- **Exhibit** — the sections in the sidebar. A, B, C. Like exhibits in a legal case file.
- **Clause type** — a category of contract clause (e.g. "Termination"). The seven we look for are listed above.
- **Detection** — the process of finding which sentences in a contract match which clause types.
- **Finding** — one result card in the Findings tab. One per clause category per review.
- **Disposition** — the Approve / Reject / Mark action a reviewer takes on a finding.
- **Case number** — the random `YYYY-MMDD-XX` stamp in the top-right corner. Decorative.

---

## How to update this README

The README is the user-facing manual. `CHANGELOG.md` is the append-only history. **Update both whenever you change the project.**

### When you ship a new feature or fix

1. **Pick the next number.** Scan the **Latest changes** section at the top of this README and the top of `CHANGELOG.md`. The next number is one higher than the last one used.
2. **Write a one-line title** that says what changed in plain English. No jargon. Example: *"Added a PDF export button to the Findings tab."*
3. **Add an entry to the top of `CHANGELOG.md`** — it goes right under the `# Changelog` heading, so the newest entry is always first. Use this template:

   ```markdown
   ## Change #N — <one-line title>

   **Date:** YYYY-MM-DD
   **What changed:** one or two sentences a non-engineer can read.
   **Why:** one sentence on the motivation (optional).
   **Files touched:** `frontend/app.js`, `frontend/style.css`, etc.
   **How to see it:** what the user does in the UI to witness the change.
   ```

4. **Add a short summary to the top of this README** under **Latest changes**. Keep it to 1–3 sentences. The detailed version lives in `CHANGELOG.md`.
5. **If the change is a big feature the user should know about**, also add a new section under **What we built, step by step** further down (one entry per shipped feature, in order).
6. **If the change retires something** (e.g. you removed the sample contracts fallback), remove it from **What's next** at the bottom.

### House rules

- **Plain English.** Pretend you're explaining to a friend who has never coded. No "refactored the abstraction layer" — say what the user can now do.
- **One change per entry.** Don't bundle a UI tweak and a backend stub into the same number. Future-you will thank present-you.
- **Date every entry.** Use the date you merged the change, not the date you started it.
- **Don't rewrite history.** The `CHANGELOG.md` is append-only. If you need to fix a typo in an old entry, fix it but add a note at the end of that entry: *"Corrected: was 'uploaded' → 'uploaded'."*
- **Commit the doc with the code.** When you open a PR for a feature, the same PR should update both files. Reviewers should reject feature PRs that don't.

### Quick checklist (copy-paste into your PR description)

```
- [ ] Bumped change number in README "Latest changes"
- [ ] Appended detailed entry to CHANGELOG.md
- [ ] Added a "Step N" entry under "What we built" if this is a user-facing feature
- [ ] Removed the item from "What's next" if it shipped
- [ ] Updated the "30-second usage" steps if the user flow changed
- [ ] Updated the "Project layout" tree if files were added/removed
```
