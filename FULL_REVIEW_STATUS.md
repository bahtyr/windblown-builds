**Findings**

1. WAIT **Rename / Simplify**: `deck.mode` does not describe the real editing state, and it drives the wrong UI branch for shared-deck edits. In [DeckContext.tsx:154], `mode` is derived only from `editingDeckName`, while shared-deck editing is tracked separately by `editingSource` and `isEditingBuild`. [DeckPanel.tsx:20], [DeckPanel.tsx:37], and [DeckPanel.tsx:59] then treat shared editing as “Create new build” / “Save build”. This is both a misleading name and a split state model.


2. WAIT **Standardize / Delete**: the library tabs do not match the data they render. [DecksLibrary.tsx:65] defaults to `"recent-runs"`, [DecksLibrary.tsx:113] builds `rows` from `deck.saved`, and [DecksLibrary.tsx:269] renders those saved decks under “Recent Runs”, while [DecksLibrary.tsx:263] hardcodes “No saved builds yet.” for the “Saved Builds” tab. The Playwright test at [home.spec.ts:14] through [home.spec.ts:45] currently locks in that inconsistency. Same concept, two labels, one dead tab.


3. DO **Simplify**: gift-match deck-item derivation is duplicated between debug and user-facing flows. [GiftMatchDebug.tsx:21], [GiftMatchDebug.tsx:268], and [GiftMatchDebug.tsx:296] reimplement `MatchedDeckItem`, `buildDeckItems`, and `extractEntityTypeFromPath`, while [run-build-flow.ts:5], [run-build-flow.ts:25], and [run-build-flow.ts:112] already own the same logic. This is classic drift-prone AI duplication.

NOTE: there is a difference in usage workflow between debug vs user facing. keep a single algorithm but usage differences should be preserved.


4. DO **Simplify**: tooltip hover control is duplicated almost line-for-line in two places. [EntityCard.tsx:60] through [EntityCard.tsx:150] and [DecksLibrary.tsx:456] through [DecksLibrary.tsx:529] both manage refs, RAF scheduling, `ResizeObserver`, scroll-parent listeners, and placement updates. Shared low-level math already exists in [hoverTooltip.ts]; the controller behavior should either be shared too or intentionally kept local with much smaller wrappers.

NOTE: prefer advanced calculation as browse page in the drawer had issues that is why it diverged.


5. DO **Delete**: `DecksLibrary` has obvious leftover scaffolding. [DecksLibrary.tsx:245] through [DecksLibrary.tsx:255] pass no-op handlers into `DeckRow`, and [DecksLibrary.tsx:364] plus [DecksLibrary.tsx:413] through [DecksLibrary.tsx:423] keep commented-out UI in place. That makes the file feel half-finished and harder to trust.


6. DO **Delete**: scraper test debug code is still checked in. [richParser.test.ts:20] has a live `console.log`, and [richParser.test.ts:44] keeps the commented version beside it.


7. DON'T **Standardize / Rename**: there are mojibake-corrupted labels and symbols in source, which makes the code and likely the UI look broken. See [EntityBrowser.tsx:382], [EntityBrowser.tsx:391], [EntityCard.tsx:351], and [EntityCard.tsx:374]. Even if runtime rendering hides some of it, the source readability is already degraded.