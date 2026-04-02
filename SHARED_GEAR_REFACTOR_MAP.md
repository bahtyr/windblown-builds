# Shared Gear Refactor Map

This document is only about shared gear code refactoring.

It does not cover:

- UI label renames
- wrapper renames such as `Deck` -> `Build`
- route or product terminology changes

The goal is:

1. identify existing code that already works with gears or gear collections
2. define the shared gear classes/modules that should be created
3. map old code to the new shared modules it should use in the next phase

## Scope Rules

- Keep all existing feature behavior the same.
- Keep current wrapper names and UI labels as-is for now.
- Only introduce shared gear modules and refactor existing code to consume them.
- Treat the run import dialog as in scope because it renders and edits a collection of gears.

## 1. Existing Code That Interacts With Gears / Gear Collections

### [DeckContext.tsx](/C:/Users/bahti/IdeaProjects/windblown-builds/apps/web/components/deck/DeckContext.tsx)

Purpose:
Holds the active editable collection, grouped item operations, persistence wiring, and collection import/share helpers.

Existing gear / gear-collection code in this file:

- `DeckItem`
  Current role: atomic item model for one collected entity
- `DeckLimits`
  Current role: limits by entity type
- `DeckSessionSnapshot`
  Current role: snapshot of the active editable collection
- `deckId`
  Current role: stable item id builder
- `makeDeckItem`
  Current role: convert entity data into an item for the collection
- `parseDeckParam`
  Current role: deserialize one collection from URL params
- `hydrateDeckItems`
  Current role: fill in missing images for collection items
- `groupDeckItemsByType`
  Current role: apply canonical collection ordering
- `insertByType`
  Current role: insert one item into the collection in display order
- `reorderWithinType`
  Current role: reorder items within one type
- `restoreDeckSession`
  Current role: restore a prior editable collection state
- context state:
  - `items`
  - `name`
  - `add`
  - `remove`
  - `moveWithinType`
  - `setName`
  - `resetDeck`

Notes:
- this is the biggest existing source of shared collection logic
- it also contains wrapper-specific save/load behavior, but that is not the focus of this refactor map

### [DeckPanel.tsx](/C:/Users/bahti/IdeaProjects/windblown-builds/apps/web/components/deck/DeckPanel.tsx)

Purpose:
Renders the editable collection view and supports remove/reorder/reset interactions.

Existing gear / gear-collection code in this file:

- `DeckPanel`
  Current role: editor UI for the active collection
- `DeckDraggable`
  Current role: draggable chip/tile for one item in the collection
- `rows`
  Current role: split a collection into editor display rows by type

Notes:
- the save/delete buttons are wrapper-facing, but the main content rendering is shared collection UI

### [DecksLibrary.tsx](/C:/Users/bahti/IdeaProjects/windblown-builds/apps/web/components/deck/DecksLibrary.tsx)

Purpose:
Displays collection previews inside the library screen.

Existing gear / gear-collection code in this file:

- `LoadedDeckEntity`
  Current role: joined view model of collection item plus entity details
- `DeckCategoryMeta`
  Current role: category summary for a collection preview
- `DeckRowItem`
  Current role: preview renderer for one item in a collection
- `buildDeckCategoryMeta`
  Current role: compute category metadata for a collection
- `sortDeckItemsByType`
  Current role: order items in a collection
- `buildFavoritesDeck`
  Current role: create a derived collection from liked ids

Notes:
- the page itself is wrapper-specific
- preview item rendering and collection metadata are shared enough to reuse later

### [RunBuildDialog.tsx](/C:/Users/bahti/IdeaProjects/windblown-builds/apps/web/components/deck/RunBuildDialog.tsx)

Purpose:
Imports a run screenshot, shows detected items as a collection, lets the user adjust that collection, then saves it.

Existing gear / gear-collection code in this file:

- `manualItems`
  Current role: manually added detected items
- `matchedItems`
  Current role: detected collection items
- `failedSquares`
  Current role: candidate items for missed matches
- `visibleMatchedItems`
  Current role: matched items after removals
- `buildItems`
  Current role: final item collection to save
- `selectedCandidateIds`
  Current role: selected manual item ids
- `selectedMatchedIds`
  Current role: selected kept item ids
- `groupMatchedItems`
  Current role: order detected items by collection type

Notes:
- even though this is a run flow, it clearly assembles and edits a collection of gears
- it should consume shared gear collection utilities

### [run-build-flow.ts](/C:/Users/bahti/IdeaProjects/windblown-builds/apps/web/app/gift-match/run-build-flow.ts)

Purpose:
Transforms matcher output into item collections and prepares imported collections for persistence.

Existing gear / gear-collection code in this file:

- `MatchedDeckItem`
  Current role: detected item payload
- `FailedSquareCandidate`
  Current role: alternate detected item payload
- `buildDetectedDeckItems`
  Current role: convert successful matches into collection items
- `buildMatchedDeckItems`
  Current role: alias/helper for detected items
- `buildFailedSquareCandidates`
  Current role: build alternate candidate items
- `buildDeckItemFromTemplate`
  Current role: convert one template result into one collection item
- `dedupeMatchedItems`
  Current role: remove duplicate detected items
- `compareMatchedDeckItems`
  Current role: sort detected items
- `compareTypeOrder`
  Current role: compare item types
- `getTypeOrder`
  Current role: canonical type ordering

Notes:
- this file is the main source of run-detection-to-collection transformation logic

### [deck-share.ts](/C:/Users/bahti/IdeaProjects/windblown-builds/apps/web/components/deck/deck-share.ts)

Purpose:
Serializes one existing collection into a URL-friendly representation.

Existing gear / gear-collection code in this file:

- `buildDeckShareUrl`
  Current role: serialize a collection into URL params

Notes:
- share behavior itself is not a wrapper rename concern for this phase
- collection serialization is still relevant shared logic

## 2. Shared Gear Classes / Modules To Create

These are the new shared modules that should exist before old code is rewired.

### `Gear`

Purpose:
Canonical shared type for one collected unit.

Should own:

- `id`
- `type`
- `name`
- `image`

Should absorb current code from:

- `DeckItem`
- `MatchedDeckItem`
- `FailedSquareCandidate` when shape overlaps

### `GearLimits`

Purpose:
Canonical shared type for per-category collection limits.

Should absorb current code from:

- `DeckLimits`

### `GearCollection`

Purpose:
Canonical shared type for one grouped collection of gears.

Should represent:

- collection `name`
- collection `items`

Optional later:

- metadata such as `createdAt`, `source`, etc., but do not force wrapper metadata into the first shared version unless needed

Should absorb current structure from:

- active collection state in `DeckContext.tsx`
- imported item groups in `RunBuildDialog.tsx`
- preview collections rendered in `DecksLibrary.tsx`

### `GearCollectionSnapshot`

Purpose:
Shared snapshot type for restoring an editable collection session.

Should absorb current code from:

- `DeckSessionSnapshot`

### `gear-utils`

Purpose:
Shared low-level gear helpers.

Should own:

- `gearId`
- `makeGear`
- `hydrateGears`

Should absorb current code from:

- `deckId`
- `makeDeckItem`
- `hydrateDeckItems`

### `gear-collection-utils`

Purpose:
Shared collection manipulation and parsing helpers.

Should own:

- `parseGearCollectionParam`
- `groupGearsByType`
- `insertGearByType`
- `reorderGearsWithinType`
- `restoreGearCollectionSnapshot`
- collection comparison/order helpers if needed

Should absorb current code from:

- `parseDeckParam`
- `groupDeckItemsByType`
- `insertByType`
- `reorderWithinType`
- `restoreDeckSession`
- parts of `compareMatchedDeckItems`
- `compareTypeOrder`
- `getTypeOrder`

### `GearCollectionStore` or `GearCollectionContext`

Purpose:
Shared state module for the active editable collection.

Should own:

- current collection items
- current collection name
- add/remove/reorder/reset operations
- set name
- session snapshot restore

Should absorb current code from:

- the collection-focused parts of `DeckContext.tsx`

Note:
- choose `Store` if you want a logic/state module
- choose `Context` if you want to keep the current React-context pattern

### `GearCollectionEditor`

Purpose:
Shared editor component for rendering and editing one collection of gears.

Should own:

- item list rendering
- drag/reorder behavior
- remove behavior
- empty collection rendering
- collection row layout

Should absorb current code from:

- `DeckPanel`
- `DeckDraggable`
- `rows`

Note:
- wrapper-specific buttons can stay outside this component if needed

### `GearCollectionPreview`

Purpose:
Shared read-only preview components for one collection and one gear item.

Should own:

- item preview tile
- optional preview row rendering
- category metadata for a collection

Should absorb current code from:

- `DeckRowItem`
- `buildDeckCategoryMeta`
- possibly `DeckRow` later if it becomes generic enough

### `GearDetection`

Purpose:
Shared conversion layer from run matcher output into `Gear` payloads.

Should own:

- `buildDetectedGears`
- `buildMatchedGears`
- `buildFailedGearCandidates`
- `buildGearFromTemplate`
- `dedupeMatchedGears`

Should absorb current code from:

- `MatchedDeckItem`
- `FailedSquareCandidate`
- `buildDetectedDeckItems`
- `buildMatchedDeckItems`
- `buildFailedSquareCandidates`
- `buildDeckItemFromTemplate`
- `dedupeMatchedItems`

### `GearCollectionShare`

Purpose:
Shared serializer/parser for collection URL payloads if you want share/import format centralized.

Should own:

- collection serialization to URL-safe params
- collection deserialization from URL-safe params

Should absorb current code from:

- `buildDeckShareUrl`
- `parseDeckParam`

Note:
- this can wait if you want to keep share behavior where it is initially

## 3. Old Usage To New Shared Module Refactor Map

This section lists existing code that should be updated in the next phase to use the new shared modules.

### [DeckContext.tsx](/C:/Users/bahti/IdeaProjects/windblown-builds/apps/web/components/deck/DeckContext.tsx)

Update to use:

- `Gear`
- `GearLimits`
- `GearCollection`
- `GearCollectionSnapshot`
- `gear-utils`
- `gear-collection-utils`
- `GearCollectionContext` or `GearCollectionStore`

Old usage to replace internally:

- `DeckItem` -> `Gear`
- `DeckLimits` -> `GearLimits`
- `DeckSessionSnapshot` -> `GearCollectionSnapshot`
- `deckId` -> shared `gearId`
- `makeDeckItem` -> shared `makeGear`
- `parseDeckParam` -> shared `parseGearCollectionParam`
- `hydrateDeckItems` -> shared `hydrateGears`
- `groupDeckItemsByType` -> shared `groupGearsByType`
- `insertByType` -> shared `insertGearByType`
- `reorderWithinType` -> shared `reorderGearsWithinType`
- `restoreDeckSession` -> shared `restoreGearCollectionSnapshot`

### [DeckPanel.tsx](/C:/Users/bahti/IdeaProjects/windblown-builds/apps/web/components/deck/DeckPanel.tsx)

Update to use:

- `Gear`
- `GearCollectionEditor`
- row/layout helpers from shared collection editor code

Old usage to replace internally:

- `DeckItem` -> `Gear`
- `DeckDraggable` -> shared editor draggable gear component
- `rows` -> shared editor row helper

### [DecksLibrary.tsx](/C:/Users/bahti/IdeaProjects/windblown-builds/apps/web/components/deck/DecksLibrary.tsx)

Update to use:

- `Gear`
- `GearCollection`
- `GearCollectionPreview`
- shared category metadata helpers
- shared grouping/order helpers

Old usage to replace internally:

- `DeckItem` -> `Gear`
- `DeckRowItem` -> shared preview item component
- `buildDeckCategoryMeta` -> shared preview/category helper
- `sortDeckItemsByType` -> shared grouping helper
- `buildFavoritesDeck` -> construct a `GearCollection` via shared types

### [RunBuildDialog.tsx](/C:/Users/bahti/IdeaProjects/windblown-builds/apps/web/components/deck/RunBuildDialog.tsx)

Update to use:

- `Gear`
- `GearCollection`
- `GearDetection`
- shared grouping/order helpers

Old usage to replace internally:

- `MatchedDeckItem` -> shared detected `Gear` payloads
- `groupMatchedItems` -> shared grouping helper
- `buildItems` -> explicit `GearCollection` assembly using shared types

### [run-build-flow.ts](/C:/Users/bahti/IdeaProjects/windblown-builds/apps/web/app/gift-match/run-build-flow.ts)

Update to use:

- `Gear`
- `GearDetection`
- shared type-order helpers from collection utils

Old usage to replace internally:

- `MatchedDeckItem` -> shared detected gear type
- `FailedSquareCandidate` -> shared failed candidate gear type
- `buildDetectedDeckItems` -> shared detection helper
- `buildMatchedDeckItems` -> shared detection helper
- `buildFailedSquareCandidates` -> shared detection helper
- `buildDeckItemFromTemplate` -> shared detection helper
- `dedupeMatchedItems` -> shared detection helper
- `compareMatchedDeckItems` -> shared ordering helper

### [deck-share.ts](/C:/Users/bahti/IdeaProjects/windblown-builds/apps/web/components/deck/deck-share.ts)

Update to use:

- `GearCollectionShare` if created
- shared `Gear` / `GearCollection` types

Old usage to replace internally:

- `DeckItem` -> `Gear`
- share serialization logic -> shared collection serializer

## 4. First Refactor Pass Recommendation

Implement in this order:

1. create shared types:
   - `Gear`
   - `GearLimits`
   - `GearCollection`
   - `GearCollectionSnapshot`
2. create shared helpers:
   - `gear-utils`
   - `gear-collection-utils`
3. refactor `DeckContext.tsx` to consume those shared types/helpers
4. extract `GearCollectionEditor` from `DeckPanel.tsx`
5. extract preview helpers from `DecksLibrary.tsx`
6. extract detection helpers from `run-build-flow.ts`
7. refactor `RunBuildDialog.tsx` to consume shared gear modules

## 5. Practical Boundary For This Phase

Allowed in this phase:

- new shared gear types
- new shared gear utility modules
- old code importing and using those modules
- internal refactors to remove duplicated collection logic

Not part of this phase:

- label renames
- product terminology migration
- wrapper renames
- route/file naming cleanup unless required for the shared extraction
