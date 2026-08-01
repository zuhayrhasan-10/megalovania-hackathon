# Changelog

Every change to the project gets a numbered entry here, newest first. The README has a short summary at the top; this file is the full record.

> **House rules:** append-only, one change per entry, plain English, date every entry. See [How to update this README](./README.md#how-to-update-this-readme) in the main README for the template.

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
