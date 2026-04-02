# Shared Gear Module Reference

1.  Create new dedicated folder
2. Keep DeckContext.tsx as a compatibility wrapper in this phase.
3. Extract only the shared surface needed by current consumers; don’t create unused APIs yet.
4. Keep prop shapes close to current usage for a shallow migration.
5. Don't update tests.

This document identifies the current deck/build/run code that should be treated as shared `Gear` / `GearCollection`
logic before wrapper-specific terminology is renamed in the UI.

The goal is:

- extract shared `GearCollection` modules first
- keep `Run`, `Build`, and later `Guide` as wrappers around that shared system
- avoid leaking wrapper-specific naming into shared code

## Core Rule

Shared code should use:

- `Gear`
- `GearCollection`
- `GearCollectionEditor`
- `GearCollectionContext`

Wrapper-specific code should use:

- `Run`
- `Build`
- `Guide`

UI labels can still say things like `Edit build` or `New run`, but the underlying shared modules should stay
collection-centric.

## Module Review

### [DeckContext.tsx](/C:/Users/bahti/IdeaProjects/windblown-builds/apps/web/components/deck/DeckContext.tsx)

Purpose:
Shared state container for the active editable grouped object plus persistence for saved/shared deck data.

Current role:

- mixes shared collection editing logic with build wrapper storage and shared-build URL behavior

Extract to shared core:

- `DeckItem` -> `Gear`
- `DeckLimits` -> `GearLimits`
- `DeckSessionSnapshot` -> `GearCollectionSnapshot`
- `DeckContextType` -> `GearCollectionContextType`
- `DeckProvider` -> `GearCollectionProvider`
- `useDeck` -> `useGearCollection`
- `deckId` -> `gearId`
- `makeDeckItem` -> `makeGear`
- `parseDeckParam` -> `parseGearCollectionParam`
- `hydrateDeckItems` -> `hydrateGears`
- `groupDeckItemsByType` -> `groupGearsByType`
- `insertByType` -> `insertGearByType`
- `reorderWithinType` -> `reorderGearsWithinType`
- `restoreDeckSession` -> `restoreGearCollectionSnapshot`
- `resetDeck` -> `resetGearCollection`

Keep wrapper-specific:

- `SavedDeck` -> `Build`
- `SharedDeck` -> `SharedBuild`
- `saveDeck` -> `saveBuild`
- `saveImportedDeck` -> `saveImportedBuild`
- `saveSharedDeck` -> `saveSharedBuild`
- `discardSharedDeck` -> `discardSharedBuild`
- `createDeck` -> `createBuildDraft` or `createBuild`
- `loadDeck` -> `loadBuild`
- `editSharedDeck` -> `editSharedBuild`
- `deleteDeck` -> `deleteBuild`
- `duplicateDeck` -> `duplicateBuild`
- `normalizeSavedDecks` -> `normalizeBuilds`
- `updateSavedDeck` -> `updateBuild`
- `dedupeDeckNames` -> `dedupeBuildNames`
- `ensureUniqueDeckName` -> `ensureUniqueBuildName`
- `normalizeDeckName` -> `normalizeBuildName`
- `isEditingDeckSession` -> `isEditingBuildSession`
- `resolveSharedDeckFromLocation` -> `resolveSharedBuildFromLocation`
- `clearSharedDeckUrl` -> `clearSharedBuildUrl`

Notes:

- this file is currently the most important mixed-responsibility module
- it should eventually be split into shared collection state vs build persistence/share behavior

### [DeckPanel.tsx](/C:/Users/bahti/IdeaProjects/windblown-builds/apps/web/components/deck/DeckPanel.tsx)

Purpose:
Editor UI for the current active grouped object, including naming, reset, delete, reorder, and remove.

Current role:

- mostly shared collection editor UI
- currently uses build labels and build save/delete actions directly

Extract to shared core:

- `DeckPanel` -> `GearCollectionEditor` or `GearCollectionPanel`
- `DeckDraggable` -> `GearChipDraggable` or `DraggableGearChip`
- `rows` -> `buildGearCollectionRows` or `groupGearsForEditorRows`

Keep wrapper-specific:

- commit/delete button labels
- whether the current edit session is a build edit
- wrapper-level save/delete wiring if you choose to move actions out of the shared editor later

Notes:

- structurally this is the best candidate for a shared editor component
- the current title and button text are wrapper-facing, but the rendering of grouped gears is core behavior

### [DecksLibrary.tsx](/C:/Users/bahti/IdeaProjects/windblown-builds/apps/web/components/deck/DecksLibrary.tsx)

Purpose:
Wrapper-facing library page for favorites, recent runs, and saved builds, including preview rows and edit/share actions.

Current role:

- mixed wrapper library surface
- also contains shared rendering helpers for grouped items

Do not extract whole module to shared core.

Extract to shared core:

- `DeckRowItem` -> `GearCollectionPreviewItem` or `GearPreviewItem`
- `buildDeckCategoryMeta` -> `buildGearCategoryMeta`
- `sortDeckItemsByType` -> reuse `groupGearsByType`

Potentially shared but lower priority:

- `DeckRow` -> `GearCollectionPreviewRow` only if you want a generic row renderer reused by `Run`, `Build`, and `Guide`

Keep wrapper-specific:

- `DecksLibrary` -> wrapper module, target `BuildLibrary`
- tabs for `Favorites`, `Recent Runs`, `Saved Builds`
- actions like share, duplicate, load, discard shared
- favorites/build/run grouping

Notes:

- this should stay mostly wrapper-facing
- only the visual preview of gears and category metadata are obvious shared extraction candidates

### [RunBuildDialog.tsx](/C:/Users/bahti/IdeaProjects/windblown-builds/apps/web/components/deck/RunBuildDialog.tsx)

Purpose:
Run import flow that uploads a screenshot, detects matched items, lets the user adjust the result, and saves it.

Current role:

- wrapper-specific run import UI
- contains some shared collection assembly logic

Do not extract whole module to shared core.

Extract to shared core:

- `groupMatchedItems` -> `groupDetectedGearsByType` or direct reuse of `groupGearsByType`

Keep wrapper-specific:

- `RunBuildDialog`
- `runDetection`
- `resetDialogState`
- `setSourceFile`
- `handleFileInput`
- `handleAddCandidate`
- `handleToggleMatchedItem`
- `handleSave`
- `handleSaveAndEdit`
- `buildOverlayStyle`
- `formatRoundedSeconds`

Notes:

- this is specifically a `Run` import surface, not a shared collection editor
- detected output should be converted into shared `Gear` / `GearCollection` types, but the dialog itself should stay
  run-specific

### [RunBuildUiContext.tsx](/C:/Users/bahti/IdeaProjects/windblown-builds/apps/web/components/deck/RunBuildUiContext.tsx)

Purpose:
Global UI launcher for the run-import dialog, with drag/drop/paste screenshot handling.

Current role:

- fully wrapper-specific

Do not extract to shared core.

Keep wrapper-specific:

- `RunBuildUiContextType`
- `RunBuildUiProvider`
- `useRunBuildUi`
- `openRunBuildDialog`

Notes:

- this belongs to `Run` flows, not `GearCollection` core

### [DeckUiContext.tsx](/C:/Users/bahti/IdeaProjects/windblown-builds/apps/web/components/deck/DeckUiContext.tsx)

Purpose:
Local UI state for opening and closing the deck/build editor drawer.

Current role:

- generic editor-shell UI state
- currently named for deck/build

Extract to shared core:

- `DeckUiContextType` -> `GearCollectionEditorUiContextType`
- `DeckUiProvider` -> `GearCollectionEditorUiProvider`
- `useDeckUi` -> `useGearCollectionEditorUi`
- `openDeck` -> `openGearCollectionEditor`
- `closeDeck` -> `closeGearCollectionEditor`

Notes:

- this is generic editor shell state and should be reusable across all wrappers

### [deck-share.ts](/C:/Users/bahti/IdeaProjects/windblown-builds/apps/web/components/deck/deck-share.ts)

Purpose:
Serialize a saved deck/build into a share URL.

Current role:

- wrapper-specific build-sharing utility
- serializes one grouped collection into URL params

Shared extraction:

- none required right now

Keep wrapper-specific:

- `buildDeckShareUrl` -> `buildShareUrl` or `buildBuildShareUrl`

Notes:

- this is tied to shared build behavior and URL format, not generic collection editing

### [run-build-flow.ts](/C:/Users/bahti/IdeaProjects/windblown-builds/apps/web/app/gift-match/run-build-flow.ts)

Purpose:
Transforms run-detection output into grouped items and persists imported results into saved deck/build storage.

Current role:

- mixed run wrapper logic and shared grouping/name helpers

Extract to shared core:

- `MatchedDeckItem` -> `MatchedGear`
- `FailedSquareCandidate` -> `FailedGearCandidate`
- `buildDetectedDeckItems` -> `buildDetectedGears`
- `buildMatchedDeckItems` -> `buildMatchedGears`
- `buildDeckItemFromTemplate` -> `buildGearFromTemplate`
- `dedupeMatchedItems` -> `dedupeMatchedGears`
- `compareMatchedDeckItems` -> `compareMatchedGears`

Keep wrapper-specific:

- `saveExternalDeck` -> `saveImportedBuild`
- `buildDetectedRunName`

Probably shared utility, but build carefully:

- `extractEntityTypeFromPath`
- `compareTypeOrder`
- `getTypeOrder`

Notes:

- detection-to-gear transformation is shared enough to move toward core
- run naming and imported-build persistence should stay wrapper-facing

## Shared Core Extraction Map

These are the current modules that should become the initial shared gear modules.

| Current code                | Shared target                    | Purpose                                           |
|-----------------------------|----------------------------------|---------------------------------------------------|
| `DeckItem`                  | `Gear`                           | Canonical atomic gear type                        |
| `DeckLimits`                | `GearLimits`                     | Limits by gear type                               |
| `deckId`                    | `gearId`                         | Stable gear identifier                            |
| `makeDeckItem`              | `makeGear`                       | Build a `Gear` from entity data                   |
| `DeckSessionSnapshot`       | `GearCollectionSnapshot`         | Snapshot of active editable collection            |
| `DeckContextType`           | `GearCollectionContextType`      | Shared collection editing API                     |
| `DeckProvider`              | `GearCollectionProvider`         | Shared state provider for active collection       |
| `useDeck`                   | `useGearCollection`              | Hook into active collection state                 |
| `parseDeckParam`            | `parseGearCollectionParam`       | Deserialize one collection from URL/search params |
| `hydrateDeckItems`          | `hydrateGears`                   | Backfill gear media data                          |
| `groupDeckItemsByType`      | `groupGearsByType`               | Canonical ordering/grouping                       |
| `insertByType`              | `insertGearByType`               | Ordered insertion helper                          |
| `reorderWithinType`         | `reorderGearsWithinType`         | Intra-type reorder helper                         |
| `restoreDeckSession`        | `restoreGearCollectionSnapshot`  | Restore editor session state                      |
| `resetDeck`                 | `resetGearCollection`            | Clear current editable collection                 |
| `DeckUiProvider`            | `GearCollectionEditorUiProvider` | Open/close state for collection editor shell      |
| `useDeckUi`                 | `useGearCollectionEditorUi`      | Hook for editor shell state                       |
| `DeckPanel`                 | `GearCollectionEditor`           | Main shared editor UI                             |
| `DeckDraggable`             | `DraggableGearChip`              | Draggable gear chip UI                            |
| `rows`                      | `groupGearsForEditorRows`        | Editor row layout helper                          |
| `DeckRowItem`               | `GearCollectionPreviewItem`      | Reusable preview tile for one gear                |
| `buildDeckCategoryMeta`     | `buildGearCategoryMeta`          | Category metadata builder for previews            |
| `MatchedDeckItem`           | `MatchedGear`                    | Run-detected gear payload                         |
| `FailedSquareCandidate`     | `FailedGearCandidate`            | Failed-match gear candidate payload               |
| `buildDetectedDeckItems`    | `buildDetectedGears`             | Convert detection results into gears              |
| `buildMatchedDeckItems`     | `buildMatchedGears`              | Alias/helper for matched gears                    |
| `buildDeckItemFromTemplate` | `buildGearFromTemplate`          | Convert template match into gear                  |
| `dedupeMatchedItems`        | `dedupeMatchedGears`             | Remove duplicate detected gears                   |
| `compareMatchedDeckItems`   | `compareMatchedGears`            | Stable sort for matched gears                     |

## Wrapper Modules That Should Stay Context-Specific

These should continue to belong to wrapper layers, even if they eventually consume shared core modules.

### Build wrapper

- `SavedDeck` -> `Build`
- `SharedDeck` -> `SharedBuild`
- `saveDeck` -> `saveBuild`
- `saveImportedDeck` -> `saveImportedBuild`
- `saveSharedDeck` -> `saveSharedBuild`
- `discardSharedDeck` -> `discardSharedBuild`
- `createDeck` -> `createBuild`
- `loadDeck` -> `loadBuild`
- `editSharedDeck` -> `editSharedBuild`
- `deleteDeck` -> `deleteBuild`
- `duplicateDeck` -> `duplicateBuild`
- `normalizeSavedDecks` -> `normalizeBuilds`
- `updateSavedDeck` -> `updateBuild`
- `dedupeDeckNames` -> `dedupeBuildNames`
- `ensureUniqueDeckName` -> `ensureUniqueBuildName`
- `normalizeDeckName` -> `normalizeBuildName`
- `resolveSharedDeckFromLocation` -> `resolveSharedBuildFromLocation`
- `clearSharedDeckUrl` -> `clearSharedBuildUrl`
- `buildDeckShareUrl` -> `buildShareUrl`
- `DecksLibrary` -> `BuildLibrary`

### Run wrapper

- `RunBuildDialog`
- `RunBuildUiProvider`
- `useRunBuildUi`
- `openRunBuildDialog`
- `runDetection`
- `buildDetectedRunName`
- screenshot upload/drop/paste handling

### Future guide wrapper

No current concrete modules in this area yet, but it should consume shared `GearCollection` modules instead of inventing
guide-specific collection types.

## Suggested Shared Module Targets

This is a suggested implementation-oriented target map for the first extraction pass.

| Target module                   | What it should own                                                                          |
|---------------------------------|---------------------------------------------------------------------------------------------|
| `GearCollectionContext`         | active collection state, collection mutations, ordering, hydration, editor snapshot restore |
| `GearCollectionEditor`          | editable grouped gear UI, remove/reorder/reset interactions                                 |
| `GearCollectionEditorUiContext` | drawer/modal open-close shell state                                                         |
| `gear-collection-utils`         | id creation, grouping, insertion, reorder, parsing, compare helpers                         |
| `gear-preview`                  | reusable preview item renderer and category metadata helpers                                |
| `gear-detection`                | transform detected run matches into `Gear` payloads                                         |

## Implementation Guide

Use this when extracting code before label renames:

1. Move shared grouped-object logic into `GearCollection` modules first.
2. Keep `Run` and `Build` wrappers thin and dependent on shared collection APIs.
3. Do not rename user-facing labels yet unless the extraction requires it.
4. Avoid introducing new `Deck*` symbols during the refactor.
5. If a module mixes shared and wrapper logic, split responsibilities before doing broad renames.

## Priority Order

Suggested extraction order:

1. `DeckContext.tsx` shared parts -> `GearCollectionContext` plus supporting utils
2. `DeckUiContext.tsx` -> `GearCollectionEditorUiContext`
3. `DeckPanel.tsx` -> `GearCollectionEditor`
4. preview helpers from `DecksLibrary.tsx`
5. detection-to-gear helpers from `run-build-flow.ts`
6. update wrapper modules to consume the new shared modules

