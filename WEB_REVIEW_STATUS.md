# Web Review Status

Scope:
- `apps/web`
- reference docs: `APP_REVIEW_CHECKLIST.md`, `AI_REFERENCE_MAP.md`
- review mode: cleanup review, starting with Pass 1 (`obvious garbage`)

What this covers:
- break the web app into practical review sections
- keep a running plan and status log
- track findings with `Delete`, `Simplify`, `Rename`, `Standardize`, `Split`, `Keep`

What this does not cover yet:
- scraper cleanup
- broad redesign work
- behavior changes beyond bugs or clear checklist issues

---

## Review Sections

### 1. App shell and routes
Owner files:
- `apps/web/app/layout.tsx`
- `apps/web/components/layout/NavBar.tsx`
- `apps/web/app/browse/page.tsx`
- `apps/web/app/decks/page.tsx`
- `apps/web/app/gift-match/page.tsx`

Focus:
- top-level naming
- page headings
- route-level terminology
- nav consistency

Status:
- Pass 1 in progress

### 2. Browse experience
Owner files:
- `apps/web/components/entity/EntityBrowser.tsx`
- `apps/web/app/[type]/entity-utils.ts`
- `apps/web/app/styles/body/2_filters.css`
- `apps/web/app/styles/body/2_sidebar.css`

Focus:
- filters
- browse modes
- sidebar labels
- embedded vs full-page behavior

Status:
- Pass 1 in progress

### 3. Entity cards, rich text, and hover media
Owner files:
- `apps/web/components/entity/EntityCard.tsx`
- `apps/web/components/entity/RichText.tsx`
- `apps/web/components/entity/EntityVideoPreview.tsx`
- `apps/web/components/tooltip/hoverTooltip.ts`
- `apps/web/app/styles/browsing/3_card.css`
- `apps/web/app/styles/browsing/3_card_contents.css`

Focus:
- card hover description
- video preview behavior
- description text wrapping / word break
- icon and action label consistency

Status:
- Pass 1 in progress

### 4. Deck library
Owner files:
- `apps/web/components/deck/DecksLibrary.tsx`
- `apps/web/app/styles/deck/deck_5_library.css`
- `apps/web/app/decks/decks-library.test.ts`

Focus:
- library wording
- deck row hover cards
- category chips
- row actions
- empty states

Status:
- Pass 1 in progress

### 5. Deck builder drawer
Owner files:
- `apps/web/components/deck/DeckPanel.tsx`
- `apps/web/components/deck/DeckUiContext.tsx`
- embedded `EntityBrowser`

Focus:
- create/edit/save wording
- drawer behavior
- deck item presentation
- consistency with library and browse flows

Status:
- Pass 1 in progress

### 6. Run build flow
Owner files:
- `apps/web/components/deck/RunBuildDialog.tsx`
- `apps/web/components/deck/RunBuildUiContext.tsx`
- `apps/web/app/gift-match/*`
- run-build styles inside `apps/web/app/styles/deck/deck_5_library.css`

Focus:
- run naming vs build/deck naming
- modal wording
- overlap with library flows

Status:
- Pass 1 queued

### 7. Shared styling and test coverage
Owner files:
- `apps/web/app/globals.css`
- `apps/web/app/styles/**/*`
- `apps/web/tests/e2e/browse.spec.ts`
- `apps/web/tests/e2e/home.spec.ts`

Focus:
- dead CSS
- commented CSS
- repeated patterns
- visible-state verification
- test drift vs current UI

Status:
- Pass 1 in progress

---

## Plan

### Pass 1 - obvious garbage
Status:
- in progress

Targets:
- commented-out UI and CSS
- obvious dead code
- obvious naming/label drift
- visible encoding issues in labels
- stale tests

### Pass 2 - structural cleanliness
Status:
- pending

Targets:
- oversize files
- mixed responsibilities
- duplicate hover logic
- extraction opportunities with real repetition

### Pass 3 - UI consistency
Status:
- pending

Targets:
- button hierarchy
- card behavior parity
- page structure
- active/selected states

### Pass 4 - naming polish
Status:
- pending

Targets:
- deck/build/run terminology
- button labels
- page headings
- state and prop naming if code cleanup requires it

---

## Pass 1 Findings

### 2026-03-31

Cleanup applied:
- restored the deck row category `Reset` control in `apps/web/components/deck/DecksLibrary.tsx`
- restored deck row timestamp metadata rendering for non-shared, non-favorites rows
- removed nearby dead commented JSX/CSS in the deck library path
- normalized external nav link arrow text in `apps/web/components/layout/NavBar.tsx`

1. `Standardize` Terminology is inconsistent across nav, page headers, tabs, and actions.
Files:
- `apps/web/components/layout/NavBar.tsx`
- `apps/web/app/browse/page.tsx`
- `apps/web/components/deck/DecksLibrary.tsx`
- `apps/web/components/deck/DeckPanel.tsx`

Examples:
- nav says `My Builds`
- deck page heading says `Your library`
- tabs say `Recent Runs` and `Saved Builds`
- actions say `Create new build`, `New run`, `Edit build`, `Save build`, `Update build`

Pass 1 note:
- keep this as a naming/system cleanup item, not an isolated string tweak

2. `Delete` / `Standardize` `DecksLibrary.tsx` contains commented-out UI for category reset.
Files:
- `apps/web/components/deck/DecksLibrary.tsx`

Impact:
- current source keeps dead commented JSX for a `Reset` control
- this makes intended behavior unclear
- Playwright coverage still expects the reset button to exist

Verification:
- `npm test -- app/decks/decks-library.test.ts` -> passed on 2026-03-31
- `npx playwright test tests/e2e/browse.spec.ts --grep "deck category hover activates a filter and reset clears it"` -> passed after restoring `Reset` and clearing category state when actions take hover

Decision for next pass:
- either restore the control and keep the test
- or remove the stale test and settle on hover-only category filtering

3. `Delete` There is a meaningful amount of commented-out CSS and JSX in the reviewed areas.
Files:
- `apps/web/app/styles/browsing/3_card.css`
- `apps/web/app/styles/browsing/3_card_contents.css`
- `apps/web/app/styles/deck/deck_5_library.css`
- `apps/web/components/deck/DecksLibrary.tsx`

Examples:
- disabled liked-state variants
- disabled shadows/borders
- disabled layout blocks
- disabled reset chip/button markup

Pass 1 note:
- this is straightforward cleanup once behavior decisions are settled

4. `Rename` / `Standardize` Several visible strings are mojibaked in source and should be normalized before broader naming cleanup.
Files:
- `apps/web/components/layout/NavBar.tsx`
- `apps/web/components/entity/EntityCard.tsx`
- `apps/web/components/entity/EntityBrowser.tsx`

Examples seen in source:
- `Wiki â†—`
- `â™¥`
- `Ã—`
- `ðŸ§© In deck`
- `â¤ï¸ Likes`

Impact:
- user-facing labels are inconsistent
- source readability is degraded
- naming review is harder while these remain

5. `Simplify` Hover tooltip logic is duplicated between browse thumbs cards and deck library items.
Files:
- `apps/web/components/entity/EntityCard.tsx`
- `apps/web/components/deck/DecksLibrary.tsx`

Pass 1 note:
- not a delete/swap candidate yet
- record for Pass 2 structural review

6. `Keep` Hover video/card placement has focused Playwright coverage already.
Files:
- `apps/web/tests/e2e/browse.spec.ts`

Covered areas:
- browse image preview video
- browse thumbs hover video
- deck library hover tooltip video
- embedded drawer hover placement

Pass 1 note:
- keep these tests as behavior anchors while cleaning source

7. `Investigate` Rich description text wrapping issue is likely rooted in inline part rendering, not only card CSS.
Files:
- `apps/web/components/entity/RichText.tsx`
- `apps/web/app/styles/browsing/3_card_contents.css`

Reason:
- descriptions are assembled from separate inline spans and entity pills
- current rendering does not preserve word grouping beyond each part
- checklist note says `word break due to separated texts`

Next pass:
- inspect source data shape and rendered spacing before changing markup

---

## Verification Log

2026-03-31:
- `apps/web`: `npm test -- app/decks/decks-library.test.ts` -> passed
- `apps/web`: `npx playwright test tests/e2e/browse.spec.ts --grep "deck category hover activates a filter and reset clears it|decks hover tooltip renders a visible video area"` -> passed

---

## Next Actions

1. Finish Pass 1 on remaining run-build and shared style areas.
2. Decide terminology system for `deck` vs `build` vs `run` before string cleanup.
3. Resolve the category reset mismatch between `DecksLibrary.tsx` and Playwright.
4. Inspect `RichText` and rendered data for the description word-break issue.
