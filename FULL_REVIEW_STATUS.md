**Findings**

1. WAIT **Rename / Simplify**: `deck.mode` does not describe the real editing state, and it drives the wrong UI branch for shared-deck edits. In [DeckContext.tsx:154], `mode` is derived only from `editingDeckName`, while shared-deck editing is tracked separately by `editingSource` and `isEditingBuild`. [DeckPanel.tsx:20], [DeckPanel.tsx:37], and [DeckPanel.tsx:59] then treat shared editing as “Create new build” / “Save build”. This is both a misleading name and a split state model.


2. WAIT **Standardize / Delete**: the library tabs do not match the data they render. [DecksLibrary.tsx:65] defaults to `"recent-runs"`, [DecksLibrary.tsx:113] builds `rows` from `deck.saved`, and [DecksLibrary.tsx:269] renders those saved decks under “Recent Runs”, while [DecksLibrary.tsx:263] hardcodes “No saved builds yet.” for the “Saved Builds” tab. The Playwright test at [home.spec.ts:14] through [home.spec.ts:45] currently locks in that inconsistency. Same concept, two labels, one dead tab.


3. ✅ **Simplify**: gift-match deck-item derivation is duplicated between debug and user-facing flows. [GiftMatchDebug.tsx:21], [GiftMatchDebug.tsx:268], and [GiftMatchDebug.tsx:296] reimplement `MatchedDeckItem`, `buildDeckItems`, and `extractEntityTypeFromPath`, while [run-build-flow.ts:5], [run-build-flow.ts:25], and [run-build-flow.ts:112] already own the same logic. This is classic drift-prone AI duplication.

NOTE: there is a difference in usage workflow between debug vs user facing. keep a single algorithm but usage differences should be preserved.


4. ✅ **Simplify**: tooltip hover control is duplicated almost line-for-line in two places. [EntityCard.tsx:60] through [EntityCard.tsx:150] and [DecksLibrary.tsx:456] through [DecksLibrary.tsx:529] both manage refs, RAF scheduling, `ResizeObserver`, scroll-parent listeners, and placement updates. Shared low-level math already exists in [hoverTooltip.ts]; the controller behavior should either be shared too or intentionally kept local with much smaller wrappers.

NOTE: prefer advanced calculation as browse page in the drawer had issues that is why it diverged.


5. ✅ **Delete**: `DecksLibrary` has obvious leftover scaffolding. [DecksLibrary.tsx:245] through [DecksLibrary.tsx:255] pass no-op handlers into `DeckRow`, and [DecksLibrary.tsx:364] plus [DecksLibrary.tsx:413] through [DecksLibrary.tsx:423] keep commented-out UI in place. That makes the file feel half-finished and harder to trust.


6. ✅ **Delete**: scraper test debug code is still checked in. [richParser.test.ts:20] has a live `console.log`, and [richParser.test.ts:44] keeps the commented version beside it.


7. DON'T **Standardize / Rename**: there are mojibake-corrupted labels and symbols in source, which makes the code and likely the UI look broken. See [EntityBrowser.tsx:382], [EntityBrowser.tsx:391], [EntityCard.tsx:351], and [EntityCard.tsx:374]. Even if runtime rendering hides some of it, the source readability is already degraded.

## 2. Consistency

[//]: # (TODO decine on run / build / deck / items ...)

8. WAIT **Standardize / Rename**: the deck editing state is modeled two different ways, and the UI reads the wrong one. [DeckContext.tsx:154] derives `mode` only from `editingDeckName`, while [DeckContext.tsx:155] separately derives `isEditingBuild` from `editingDeckName` plus `editingSource`. [DeckPanel.tsx:20], [DeckPanel.tsx:37], and [DeckPanel.tsx:59] then use `mode`, so shared-deck editing renders the "Create new build" / "Save build" copy even though it is an edit flow. Same concept, two state flags, two meanings.

9. WAIT **Standardize**: the library taxonomy does not match the underlying data model. [DecksLibrary.tsx:57] defaults to `"recent-runs"`, [DecksLibrary.tsx:105] through [DecksLibrary.tsx:116] populate that tab from `deck.saved`, and [DecksLibrary.tsx:249] through [DecksLibrary.tsx:283] leave `"saved-builds"` empty while `"recent-runs"` renders saved decks. The naming drift continues in navigation and tests: [NavBar.tsx:15] through [NavBar.tsx:17] says "My Builds", [DecksLibrary.tsx:189] says "Your library", and [home.spec.ts:34] through [home.spec.ts:44] lock in "Recent Runs" for saved builds. One persisted concept is currently presented as library / build / run depending on screen.

10. WAIT **Standardize / Rename**: the new-run flow mixes `run`, `build`, and `deck` terminology inside the same interaction, which makes button labels and field names feel arbitrary. In [RunBuildDialog.tsx:33] the dialog is described as a run upload flow, but [RunBuildDialog.tsx:57], [RunBuildDialog.tsx:115], [RunBuildDialog.tsx:208], [RunBuildDialog.tsx:233], [RunBuildDialog.tsx:336], [RunBuildDialog.tsx:349], and [RunBuildDialog.tsx:393] alternate between `buildName`, `buildItems`, "New run", "Build name", "Build items", and "Save run". [RunBuildUiContext.tsx:16] and [RunBuildUiContext.tsx:180] add "new-run" and "create build" wording on the same feature. The code and UI need one primary noun for the saved artifact.

11. WAIT **Standardize**: empty/loading/error states are handled with different UI rules on adjacent surfaces. [EntityBrowser.tsx:208] renders loading as an empty `.status` container, [EntityBrowser.tsx:209] renders only the raw error string, [DecksLibrary.tsx:244], [DecksLibrary.tsx:251], and [DecksLibrary.tsx:281] use explicit empty-state copy blocks, and [RunBuildDialog.tsx:285] through [RunBuildDialog.tsx:330] uses in-panel overlays plus inline error paragraphs. The app currently has no stable pattern for "loading", "nothing here", or "failed to load", so similar screens do not read like the same product.

## Structural Cleanliness

12. WAIT **Split**: `EntityBrowser` is carrying too many responsibilities for one component boundary. [EntityBrowser.tsx:39] owns data loading, [EntityBrowser.tsx:59] through [EntityBrowser.tsx:103] owns persistence and embedded-mode hydration, [EntityBrowser.tsx:105] through [EntityBrowser.tsx:160] owns filter computation and reset logic, [EntityBrowser.tsx:162] through [EntityBrowser.tsx:288] renders the full page shell, and [EntityBrowser.tsx:545] through [EntityBrowser.tsx:639] embeds a custom match-navigation controller in the same file. This is the largest UI owner in the repo and it mixes page composition, storage behavior, search/filter derivation, and viewport measurement. It should be split before more browse features land.

13. WAIT **Split**: `DecksLibrary` has the same boundary problem on the library side. [DecksLibrary.tsx:51] through [DecksLibrary.tsx:98] loads and normalizes entity lookups, [DecksLibrary.tsx:118] through [DecksLibrary.tsx:173] manages drawer mount/animation lifecycle, [DecksLibrary.tsx:181] through [DecksLibrary.tsx:315] renders the page shell and editor overlay, and [DecksLibrary.tsx:332] through [DecksLibrary.tsx:495] contains row rendering plus tooltip behavior. The file is acting as page container, data loader, animation coordinator, and row-detail presenter at once, which makes every library change riskier than it needs to be.

14. WAIT **Simplify / Delete**: deck persistence rules are duplicated across modules instead of flowing through one owner. [DeckContext.tsx:186] through [DeckContext.tsx:206] contains the main save-name normalization and uniqueness rules, but [run-build-flow.ts:82] through [run-build-flow.ts:99], [run-build-flow.ts:163] through [run-build-flow.ts:178] reimplement `saveExternalDeck`, `ensureUniqueDeckName`, and `normalizeDeckName` separately. The current code already imports `saveExternalDeck` back into [DeckContext.tsx:6], so the ownership is inverted: the context depends on a gift-match helper for core library persistence while also keeping a second copy of the same naming rules.

15. WAIT **Simplify / Split**: the run-matching flow duplicates file-input lifecycle and detection orchestration between the debug screen and the user-facing dialog. Compare [GiftMatchDebug.tsx:28] through [GiftMatchDebug.tsx:82] with [RunBuildDialog.tsx:50] through [RunBuildDialog.tsx:185]: both manage object URL cleanup, source-file replacement, detection reset, and `runGiftMatchWorkflow(...)` execution. The user-facing dialog adds more behavior on top, but the underlying source-image/session controller is the same problem solved twice. That is drift-prone logic, not two clearly separated products.

16. WAIT **Split**: `GiftMatchDebug` hides a large style system inside the component file, which makes the actual debug behavior harder to review. [GiftMatchDebug.tsx:98] through [GiftMatchDebug.tsx:235] is the UI logic, but [GiftMatchDebug.tsx:271] through [GiftMatchDebug.tsx:497] is a massive inline `styles` object living beside it. Even if the page remains debug-only, the file currently mixes control flow, layout, and visual tokens into one unit, which is exactly the kind of AI-generated “single file does everything” shape that becomes unpleasant to maintain.
