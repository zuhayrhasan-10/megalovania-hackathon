# Changelog

Every change to the project gets a numbered entry here, newest first. The README has a short summary at the top; this file is the full record.

> **House rules:** append-only, one change per entry, plain English, date every entry. See [How to update this README](./README.md#how-to-update-this-readme) in the main README for the template.

---

## Change #8 — Honesty guard for "Not Enough Information"

**Date:** 2026-08-01
**What changed:** When the scanner walks a contract and finds *no sentence* matching a clause category, the AI used to either fall through to a generic risk reason or silently fabricate one. That branch is now a hard "Not Enough Information" with a new guarantee:

1. The Findings card now shows a dedicated **honesty-guard banner** at the top, quoting the exact required message verbatim: *"Not enough information to invent a clause, or legal explanation."*
2. The **side-by-side comparison table** is left empty, with an explicit note ("No comparison produced — the AI did not find a clause to compare against the standard.") instead of a generic "no discrepancies" line.
3. The **references & sources** section is relabelled to *"What would have been checked"*, so users can see the legal sources we *would* have used without us pretending we used them.
4. The **matched-clause quote** is hidden (`.clause-row` already has `display: none` for `.unknown-case`), because there is nothing to quote.
5. The `reason` field and `reasoning_summary` field are both rewritten so neither asks the reader to accept an invented clause — the long-form summary now reads: *"The scanner walked the full document and looked for sentences that match this clause category. It found none, so there is no evidence to compare against the company standard. The AI is not inferring a clause from context, and it is not producing a legal explanation — those would be guesses. Showing this result is the safe default."*

The hard rule, stated once in the UI and now in this changelog: **the AI will not invent a clause out of thin air, and it will not produce a baseless legal explanation out of context.** If the evidence isn't there, the answer is "Not Enough Information" — never a fabricated risk level.
**Why:** A "Not Enough Information" card that quietly contains a made-up standard or invented discrepancy is worse than no card at all — it gives the reviewer false confidence. Surfacing the guard message verbatim, emptying the comparison table, and relabelling references makes the no-answer honest at a glance.
**Files touched:** `frontend/app.js`, `frontend/index.html`, `frontend/style.css`, `README.md`, `CHANGELOG.md`.
**How to see it:** Run a review on any contract whose text doesn't mention, say, "Intellectual Property" — open the IP card. You'll see the honesty-guard banner at the top, an empty comparison table with the "no comparison produced" note, and a references list whose heading reads "What would have been checked".

---

## Change #9 — Human in the Process (Final Review summary)

**Date:** 2026-08-01
**What changed:** Per-finding cards keep their mandatory Approve / Reject / Mark for review + Add Feedback controls, and now those decisions flow into a single consolidated **Final Review** table that appears at the bottom of the Findings pane. The table has one row per clause type and the columns: *Clause Type*, *Risk Level*, *Contract Clause* (truncated, italicised quote), *Company Standard*, *Reason*, *Human Review* (a pill — *Required* for High and for Not Enough Information, *Recommended* for Medium, *Optional* for Low), *Decision*, and *Feedback*. A footer line tracks "X of N decided" plus a "ready to file" cue once everything is decided.

Until at least one decision is saved, the table is replaced with a short reminder pointing the reviewer at the per-card controls. After the first decision, the table fades in and updates live as the user clicks buttons or types into the feedback textarea on any card above — typing in a card updates the corresponding summary row in place without losing focus. Decisions persist across re-renders, but a fresh review drops any dispositions for clause types that are no longer in scope, so old calls can't leak into a new summary.
**Why:** Reviewers had to scroll back through every card to remember what they'd decided. A consolidated table at the end of the pane is the "case file" view — one glance to see which clauses are still pending, which have been approved, and what the human's margin notes said. The "Human Review" pill also makes the AI's recommendation explicit (Required vs Recommended vs Optional) so a reviewer never confuses a Low-Risk Optional finding with a High-Risk Required one.
**Files touched:** `frontend/app.js`, `frontend/style.css`, `README.md`, `CHANGELOG.md`. (`index.html` did not need changes — the table is built dynamically from the result set.)
**How to see it:** Run any review. Click *Approve* on the first card — the Final Review table appears at the bottom of the Findings pane with one row per clause type, your decision filled in, and the footer showing "1 of N decided". Type something in a card's feedback box — the corresponding row's Feedback column updates as you type. Re-run the review with a different clause subset — only decisions for clause types still in scope survive.

---

## Change #7 — Risk-level system with side-by-side reasoning

**Date:** 2026-08-01
**What changed:** Findings cards now explain the risk level instead of just labeling it. Each card has three new pieces:
1. A **reasoning summary** under the badge — a plain-English explanation of why the AI picked that rating.
2. A **side-by-side comparison table** — rows for every aspect where the uploaded contract diverges from the company standard or from a prior agreement we signed, with a dedicated "Discrepancy" column highlighting the difference.
3. A **references & sources** block — a numbered list of internal policies, prior contracts, templates, and external rules (e.g. GDPR Art. 33) that informed the rating, so the user can audit why the AI said what it said.

The four risk levels (Low / Medium / High / Not Enough Information) each produce distinct content rather than rotating filler text.
**Why:** Before this, the risk badge was a label with no evidence behind it. A reviewer couldn't tell whether the AI was being cautious or alarmist, and there was no way to challenge the rating. Now every rating comes with the receipts.
**Files touched:** `frontend/index.html`, `frontend/app.js`, `frontend/style.css`.
**How to see it:** Run a review on any contract. Open a card with a High Risk badge — you'll see a paragraph explaining the rating, then a comparison table listing each deviation, then a numbered reference list at the bottom. Cards with Low Risk show "no specific discrepancies" and the same reference list. "Not Enough Information" cards show no comparison rows but still list what would have been checked.

---

## Change #6 — README and changelog setup

**Date:** 2026-08-01
**What changed:** Added a "Latest changes" section to the top of `README.md` so every new entry is visible immediately. Created this `CHANGELOG.md` file as the append-only home for the full history. Added a "How to update this README" section at the bottom of the README with the template and house rules for keeping both files current.
**Why:** Without a written routine, READMEs go stale the moment the project moves. Pinning a checklist and a one-line template means anyone can keep the docs honest in under a minute.
**Files touched:** `README.md`, `CHANGELOG.md` (new).
**How to see it:** Open `README.md` — there is a "Latest changes" section just below the intro and a "How to update this README" section at the very bottom. Open `CHANGELOG.md` for the full audit trail.

---

## Change #5 — Friendly status messages under the dropzone

**Date:** 2026-08-01
**What changed:** The dropzone in Exhibit C now shows a one-line status message under it after every upload. Green text on success, red text on failure, and the error message stays on screen until the next upload so the user doesn't miss it.
**Why:** Before this, uploads silently mutated the list. A user had no way to know whether their file was accepted, skipped, or rejected (e.g. too big, empty, wrong type).
**Files touched:** `frontend/app.js`, `frontend/style.css`.
**How to see it:** Drop a file into Exhibit C — you see "Loaded 3 contracts · scanning for clauses…" in green. Drop a `.pdf` — you see "Only .txt files are supported — skipped 1" in red.

---

## Change #4 — Document tab + Findings tab

**Date:** 2026-08-01
**What changed:** The main area used to show only Findings. It now has two tabs at the top: **Document** (the highlighted contract, default) and **Findings** (the review cards). Clicking "Run Review" automatically switches to the Findings tab.
**Why:** Once the AI scanner underlines clauses in the contract, the user needs to see the underlines. Having to scroll past a wall of findings to see the source text was painful.
**Files touched:** `frontend/index.html`, `frontend/app.js`, `frontend/style.css`.
**How to see it:** Pick a contract in Exhibit A — the Document tab opens with color-coded underlines. Click "Run Review" and the view jumps to Findings. Click the "Document" tab to jump back.

---

## Change #3 — AI scans the contract for important clauses

**Date:** 2026-08-01
**What changed:** The app now actually reads the contract text and finds important clauses in it. There are seven categories it looks for: Payment, Data Protection, Termination, Confidentiality, Automatic Renewal, Limitation of Liability, and Intellectual Property. Each category has a list of phrases the scanner looks for. When it finds a match, it underlines the sentence in the document and quotes it in the review card.
**Why:** Up to this point, the Findings tab was generated from a stub that made up clauses. The whole point of the app is to read the real contract and flag the real clauses — this is the feature that does that.
**Files touched:** `frontend/app.js`, `frontend/index.html`, `frontend/style.css`.
**How to see it:** Upload a `.txt` contract, pick it in Exhibit A, and the Document tab opens with different colors underlining each detected clause. The legend at the top of the document shows how many of each type were found. Click "Run Review" and the cards quote the exact sentences the scanner matched.

---

## Change #2 — Upload contracts (Exhibit C)

**Date:** 2026-08-01
**What changed:** Added a real upload box to the sidebar (Exhibit C). You can drag `.txt` files onto it or click it to browse. Multiple files at once are supported. Each uploaded file is added to Exhibit A at the top of the list, with a friendly name and a size tag, and the first new file is auto-selected.
**Why:** Before this, the only way to "review" a contract was to pick from three hard-coded sample contracts. That's not a real product.
**Files touched:** `frontend/index.html`, `frontend/app.js`, `frontend/style.css`.
**How to see it:** Open `frontend/index.html` — there's a new "Exhibit C — Upload Contracts" section in the sidebar. Drop a `.txt` file on it and watch it appear in Exhibit A above the samples.

---

## Change #1 — Basic review UI

**Date:** 2026-08-01
**What changed:** Built the very first version of the app. Three-panel layout styled like a legal case file (navy paper, brass accents, serif fonts). Sidebar with Exhibits A and B, a Run Review button, and a main area that shows one card per clause type with a risk badge, a quoted clause, the company standard, a reason, and Approve / Reject / Mark buttons. The cards come from a placeholder function (`mockAnalyze`) so the UI could be built before the real backend exists.
**Why:** Needed a working UI shell to hang features on. Building the page first meant every later feature (uploads, scanning, tabs) had a place to land.
**Files touched:** `frontend/index.html`, `frontend/app.js`, `frontend/style.css`.
**How to see it:** Open `frontend/index.html` — that's the whole app. Pick a sample contract, tick a clause type, hit Run Review, and a card appears.
