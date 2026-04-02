# New finalized naming 

| Term           | Meaning                                                 | Code Use   | Notes                                            |
|----------------|---------------------------------------------------------|------------|--------------------------------------------------|
| Gear           | Smallest collectible unit                               | Canonical  | Replaces deck item / item as primary domain term |
| GearCollection | A group of gears                                        | Canonical  | Core shared grouped object across contexts       |
| Run            | Historical record containing one gear collection        | Canonical  | Historical/provenance context                    |
| Build          | Saved or planned context containing one gear collection | Canonical  | User-authored/planned context                    |
| Guide          | Curated context containing many gear collections        | Canonical  |                                                  |
| Deck           | Legacy term                                             | Deprecated | Do not introduce new usage                       |

Relationship rules:
• Run -> one GearCollection
• Build -> one GearCollection
• Guide -> many GearCollections
• The active editor works with one GearCollection. Run and Build provide one GearCollection. Guide provides one selected GearCollection at a time.

Naming rules:
• Use GearCollection as the shared collection term in code.
• Use Run, Build, and Guide only as context wrappers.
• Do not use Deck in new names.
• Do not use variant as a primary domain object.
• UI may use friendlier copy later, but the domain/code model stays fixed.


# Terminology Inventory

This document lists the terminology currently used in the repo for the run/build/deck/favorites area.

It is an inventory, not a proposal.

## Goal

Capture the current naming surface across:
- UI labels
- code terms
- type names
- method names
- variables
- storage keys
- relevant files

## Current Core Terms

These are the main terms currently used in the codebase.

- `deck`
- `saved deck`
- `shared deck`
- `deck item`
- `deck library`
- `deck builder`
- `build`
- `saved build`
- `run`
- `new run`
- `recent runs`
- `favorites`
- `favorites deck`
- `editing build`
- `create new build`
- `save build`
- `save run`
- `shared`

## User-Facing UI Terminology

### Library / navigation

- `Your library`
- `Favorites`
- `Recent Runs`
- `Saved Builds`
- `My Builds`

### Build / run actions

- `New run`
- `Create new build`
- `Edit build`
- `Save build`
- `Save run`
- `Update build`
- `Discard`
- `Edit`
- `Save`
- `Delete`
- `Duplicate`
- `Share`
- `Reset`
- `Cancel`

### Empty states / descriptive copy

- `Quick access to everything you have liked.`
- `Saved builds will appear here.`
- `Revisit your runs and share with others.`
- `No favorites yet.`
- `No saved builds yet.`
- `No recent runs yet.`
- `No items yet`
- `No gift categories`

### Run dialog text

- `New run`
- `Close new run dialog`
- `Build name`
- `Build items`
- `Candidates for failed matches`
- `Save run`
- `Edit`
- `Cancel`
- `drop an image or click to upload`
- `Replace image`
- `Parsing screenshot...`
- `Preparing matcher...`

## Code Terminology

### Dominant domain term in code

The dominant code term is still `deck`.

Examples:
- `DeckContext`
- `DeckPanel`
- `DecksLibrary`
- `DeckItem`
- `SavedDeck`
- `SharedDeck`
- `deckId`
- `makeDeckItem`
- `saveDeck`
- `loadDeck`
- `deleteDeck`
- `duplicateDeck`

### Related secondary terms

- `build`
- `run`
- `favorites`
- `shared`

### Terms not currently centralized

There is no single current module that centralizes all run/build/favorites labels.

The terminology is spread across:
- UI components
- context/state
- tests
- docs

## Relevant Files

### Main ownership files

- [AI_REFERENCE_MAP.md](/C:/Users/bahti/IdeaProjects/windblown-builds/AI_REFERENCE_MAP.md)
- [todo.md](/C:/Users/bahti/IdeaProjects/windblown-builds/todo.md)
- [apps/web/components/deck/DeckContext.tsx](/C:/Users/bahti/IdeaProjects/windblown-builds/apps/web/components/deck/DeckContext.tsx)
- [apps/web/components/deck/DeckPanel.tsx](/C:/Users/bahti/IdeaProjects/windblown-builds/apps/web/components/deck/DeckPanel.tsx)
- [apps/web/components/deck/DecksLibrary.tsx](/C:/Users/bahti/IdeaProjects/windblown-builds/apps/web/components/deck/DecksLibrary.tsx)
- [apps/web/components/deck/RunBuildDialog.tsx](/C:/Users/bahti/IdeaProjects/windblown-builds/apps/web/components/deck/RunBuildDialog.tsx)
- [apps/web/components/deck/RunBuildUiContext.tsx](/C:/Users/bahti/IdeaProjects/windblown-builds/apps/web/components/deck/RunBuildUiContext.tsx)
- [apps/web/components/deck/DeckUiContext.tsx](/C:/Users/bahti/IdeaProjects/windblown-builds/apps/web/components/deck/DeckUiContext.tsx)
- [apps/web/components/deck/deck-share.ts](/C:/Users/bahti/IdeaProjects/windblown-builds/apps/web/components/deck/deck-share.ts)
- [apps/web/components/like/LikeContext.tsx](/C:/Users/bahti/IdeaProjects/windblown-builds/apps/web/components/like/LikeContext.tsx)
- [apps/web/components/entity/EntityBrowser.tsx](/C:/Users/bahti/IdeaProjects/windblown-builds/apps/web/components/entity/EntityBrowser.tsx)
- [apps/web/app/gift-match/run-build-flow.ts](/C:/Users/bahti/IdeaProjects/windblown-builds/apps/web/app/gift-match/run-build-flow.ts)

### Tests that encode terminology / behavior

- [apps/web/app/deck-context.test.ts](/C:/Users/bahti/IdeaProjects/windblown-builds/apps/web/app/deck-context.test.ts)
- [apps/web/app/deck-share.test.ts](/C:/Users/bahti/IdeaProjects/windblown-builds/apps/web/app/deck-share.test.ts)
- [apps/web/app/decks/decks-library.test.ts](/C:/Users/bahti/IdeaProjects/windblown-builds/apps/web/app/decks/decks-library.test.ts)
- [apps/web/app/gift-match/run-build-flow.test.ts](/C:/Users/bahti/IdeaProjects/windblown-builds/apps/web/app/gift-match/run-build-flow.test.ts)
- [apps/web/tests/e2e/home.spec.ts](/C:/Users/bahti/IdeaProjects/windblown-builds/apps/web/tests/e2e/home.spec.ts)
- [apps/web/tests/e2e/browse.spec.ts](/C:/Users/bahti/IdeaProjects/windblown-builds/apps/web/tests/e2e/browse.spec.ts)

### Styling files tied to this area

- [apps/web/app/styles/deck/deck_1_drawer.css](/C:/Users/bahti/IdeaProjects/windblown-builds/apps/web/app/styles/deck/deck_1_drawer.css)
- [apps/web/app/styles/deck/deck_3_manager.css](/C:/Users/bahti/IdeaProjects/windblown-builds/apps/web/app/styles/deck/deck_3_manager.css)
- [apps/web/app/styles/deck/deck_4_item.css](/C:/Users/bahti/IdeaProjects/windblown-builds/apps/web/app/styles/deck/deck_4_item.css)
- [apps/web/app/styles/deck/deck_5_library.css](/C:/Users/bahti/IdeaProjects/windblown-builds/apps/web/app/styles/deck/deck_5_library.css)

## Storage Terminology

### Current localStorage keys

- `windblown.deck.v3`
  Meaning:
  active deck session

- `windblown.deck.saved.v3`
  Meaning:
  saved build library

- `windblown.likes.v1`
  Meaning:
  liked entity ids used to derive favorites

### Current storage language

Storage is still deck-centric:
- `deck`
- `saved`
- `editingDeckName`

There is not currently separate persisted storage for:
- recent runs
- saved builds

At the current code state, runs and builds are still mixed into one persisted deck collection.

## Types And Type Aliases

### In `DeckContext.tsx`

- `DeckItem`
- `DeckLimits`
- `SavedDeck`
- `SharedDeck`
- `DeckMode`
- `DeckSessionSnapshot`
- `EditingSource`
- `DeckContextType`

### In `RunBuildDialog.tsx`

- `RunBuildDialogProps`
- `GiftMatchRunResult`
- `GiftMatchTemplateSpec`
- `MatchedDeckItem`

### In `run-build-flow.ts`

- `MatchedDeckItem`
- `FailedSquareCandidate`

## Method Names

### `DeckContext.tsx`

- `DeckProvider`
- `useDeck`
- `deckId`
- `makeDeckItem`
- `parseDeckParam`
- `hydrateDeckItems`
- `groupDeckItemsByType`
- `insertByType`
- `reorderWithinType`
- `selectFirstSavedAfterDelete`
- `normalizeSavedDecks`
- `suggestDuplicateName`
- `updateSavedDeck`
- `dedupeDeckNames`
- `ensureUniqueDeckName`
- `normalizeDeckName`
- `restoreDeckSession`
- `isEditingDeckSession`
- `resolveSharedDeckFromLocation`
- `clearSharedDeckUrl`
- `createTimestamp`

### Context action methods exposed through `useDeck()`

- `add`
- `remove`
- `moveWithinType`
- `setName`
- `saveDeck`
- `saveImportedDeck`
- `saveSharedDeck`
- `discardSharedDeck`
- `createDeck`
- `loadDeck`
- `editSharedDeck`
- `cancelEditing`
- `deleteDeck`
- `duplicateDeck`
- `resetDeck`

### `DecksLibrary.tsx`

- `DecksLibrary`
- `DeckRow`
- `DeckRowItem`
- `formatRoughDate`
- `pluralize`
- `buildFavoritesDeck`
- `buildDeckCategoryMeta`
- `sortDeckItemsByType`

### `DeckPanel.tsx`

- `DeckPanel`
- `DeckDraggable`
- `rows`

### `RunBuildDialog.tsx`

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
- `groupMatchedItems`

### `run-build-flow.ts`

- `buildDetectedDeckItems`
- `buildMatchedDeckItems`
- `buildFailedSquareCandidates`
- `saveExternalDeck`
- `buildDetectedRunName`
- `buildDeckItemFromTemplate`
- `dedupeMatchedItems`
- `extractEntityTypeFromPath`
- `ensureUniqueDeckName`
- `normalizeDeckName`
- `compareMatchedDeckItems`
- `compareTypeOrder`
- `getTypeOrder`

### `deck-share.ts`

- `buildDeckShareUrl`

## Key Variables And Properties

### State variables in `DeckContext.tsx`

- `items`
- `name`
- `saved`
- `sharedDeck`
- `editingDeckName`
- `sessionStart`
- `editingSource`
- `hydrated`

### Derived values in `DeckContext.tsx`

- `mode`
- `isEditingBuild`

### Important property names in persisted/session data

- `name`
- `items`
- `createdAt`
- `source`
- `editingDeckName`

### Variables in `DecksLibrary.tsx`

- `activeTab`
- `drawerMounted`
- `drawerPhase`
- `entityLookup`
- `giftCategoryLookup`
- `favoritesRow`
- `rows`
- `tabCopy`
- `cancelEditOnCloseRef`

### Variables in `RunBuildDialog.tsx`

- `sourceSrc`
- `pendingSourceFile`
- `runResult`
- `manualItems`
- `removedMatchedIds`
- `buildName`
- `error`
- `isRunning`
- `isDragActive`
- `matchedItems`
- `failedSquares`
- `visibleMatchedItems`
- `buildItems`
- `selectedCandidateIds`
- `selectedMatchedIds`

## Term Clusters

### Deck cluster

- `deck`
- `saved deck`
- `shared deck`
- `deck item`
- `deck row`
- `deck builder`
- `deck panel`
- `deck library`
- `deck name`
- `deck URL`
- `in deck`
- `deckOnly`

### Build cluster

- `build`
- `saved build`
- `edit build`
- `create new build`
- `save build`
- `update build`
- `build name`
- `build items`
- `isEditingBuild`

### Run cluster

- `run`
- `new run`
- `recent runs`
- `save run`
- `run result`
- `run dialog`
- `run build flow`
- `run detection`
- `buildDetectedRunName`

### Favorites cluster

- `favorites`
- `favorites deck`
- `liked`
- `likes`
- `liked-only`

### Shared cluster

- `shared`
- `shared deck`
- `save shared deck`
- `discard shared deck`
- `resolveSharedDeckFromLocation`
- `clearSharedDeckUrl`

## Raw Terminology List

Flat list of relevant terms found in this area:

- `deck`
- `decks`
- `deck item`
- `deck items`
- `deck builder`
- `deck drawer`
- `deck panel`
- `deck row`
- `deck row item`
- `deck row category`
- `deck library`
- `deck name`
- `saved deck`
- `shared deck`
- `shared`
- `build`
- `builds`
- `saved build`
- `saved builds`
- `edit build`
- `create new build`
- `save build`
- `update build`
- `build name`
- `build items`
- `run`
- `runs`
- `new run`
- `recent runs`
- `save run`
- `run result`
- `run dialog`
- `run build flow`
- `favorites`
- `favorites deck`
- `liked`
- `likes`
- `in deck`
- `deckOnly`
- `editingDeckName`
- `isEditingBuild`
- `DeckMode`
- `SavedDeck`
- `SharedDeck`
- `DeckItem`
- `DeckSessionSnapshot`

## Summary

Current naming is mixed.

The most important facts:
- storage and state are still centered on `deck`
- UI mixes `run`, `build`, and `deck`
- `Favorites` is treated as a derived deck
- method names are mostly deck-centric
- there is no single centralized terminology map in the current codebase
