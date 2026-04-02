# Terminology Rename Map

This document maps current terminology in the repo to the finalized naming model.

## Finalized Model

- `Gear` = smallest collectible unit
- `GearCollection` = a group of gears
- `Run` = historical context containing one gear collection
- `Build` = saved/planned context containing one gear collection
- `Guide` = context containing many gear collections
- `Deck` = legacy term to remove

## Domain Rename Map

| Current term        | New term                                   | Scope            | Notes                                                                           |
|---------------------|--------------------------------------------|------------------|---------------------------------------------------------------------------------|
| `deck`              | `gear collection` / `GearCollection`       | Domain, code     | Primary replacement for grouped gears                                           |
| `decks`             | `gear collections`                         | Domain, code     | Use plural of shared grouped object                                             |
| `deck item`         | `gear` / `Gear`                            | Domain, code     | Smallest unit                                                                   |
| `deck items`        | `gears`                                    | Domain, code     | Prefer `gear` as canonical domain noun                                          |
| `saved deck`        | `build` / `Build`                          | Domain, UI, code | Saved/planned wrapper around one `GearCollection`                               |
| `shared deck`       | `shared build` / `SharedBuild`             | Domain, UI, code | Shared state of a build, not a separate collection type                         |
| `favorites deck`    | `favorite gears`                           | Domain, UI       | Derived collection, not a build                                                 |
| `deck library`      | `build library`                            | UI               | Library currently surfaces saved/planned contexts                               |
| `deck builder`      | `build editor` or `gear collection editor` | UI, code         | Use `build editor` in UI; `GearCollectionEditor` in shared code if needed       |
| `deck panel`        | `build panel` or `gear collection panel`   | UI, code         | Depends on whether the component is wrapper-facing or collection-facing         |
| `deck drawer`       | `build drawer`                             | UI, code         | UI wrapper term                                                                 |
| `deck row`          | `collection row` or `build row`            | UI, code         | `collection row` is safer because favorites may also render there               |
| `deck row item`     | `gear row item`                            | UI, code         | Row cell represents one gear                                                    |
| `deck row category` | `gear category`                            | UI, code         | Category metadata for gears                                                     |
| `deck name`         | `build name` or `gear collection name`     | Mixed            | Use `build name` for saved/planned context, `gearCollectionName` in shared code |
| `deck URL`          | `build share URL`                          | UI, code         | If the URL shares a build wrapper                                               |
| `in deck`           | `in build` or `in collection`              | UI               | Choose by surface                                                               |
| `deckOnly`          | `collectionOnly`                           | Code             | Neutral replacement                                                             |

## Type And API Rename Map

| Current code term               | New code term                                           | Notes                                                             |
|---------------------------------|---------------------------------------------------------|-------------------------------------------------------------------|
| `DeckItem`                      | `Gear`                                                  | Core atomic type                                                  |
| `DeckLimits`                    | `GearLimits`                                            | Limits on gear categories                                         |
| `SavedDeck`                     | `Build`                                                 | Saved/planned wrapper                                             |
| `SharedDeck`                    | `SharedBuild`                                           | Shared wrapper state                                              |
| `DeckMode`                      | `BuildMode` or `CollectionEditorMode`                   | Depends on whether mode belongs to build wrapper or active editor |
| `DeckSessionSnapshot`           | `GearCollectionSessionSnapshot`                         | Snapshot is for active collection editing                         |
| `DeckContextType`               | `GearCollectionContextType`                             | Context manages active collection editing                         |
| `DeckProvider`                  | `GearCollectionProvider`                                | Shared editor state                                               |
| `useDeck`                       | `useGearCollection`                                     | Shared editor hook                                                |
| `deckId`                        | `gearId`                                                | Atomic identifier                                                 |
| `makeDeckItem`                  | `makeGear`                                              | Convert entity into `Gear`                                        |
| `parseDeckParam`                | `parseGearCollectionParam`                              | Shared import format                                              |
| `hydrateDeckItems`              | `hydrateGears`                                          | Fill gear media                                                   |
| `groupDeckItemsByType`          | `groupGearsByType`                                      | Ordering helper                                                   |
| `saveDeck`                      | `saveBuild`                                             | Build wrapper action                                              |
| `saveImportedDeck`              | `saveImportedBuild`                                     | Run/build/guide import saves a build                              |
| `saveSharedDeck`                | `saveSharedBuild`                                       | Shared build action                                               |
| `discardSharedDeck`             | `discardSharedBuild`                                    | Shared build action                                               |
| `createDeck`                    | `createBuild` or `createGearCollectionDraft`            | Pick based on whether action creates wrapper or editor draft      |
| `loadDeck`                      | `loadBuild`                                             | Load saved/planned wrapper                                        |
| `editSharedDeck`                | `editSharedBuild`                                       | Shared wrapper action                                             |
| `deleteDeck`                    | `deleteBuild`                                           | Build wrapper action                                              |
| `duplicateDeck`                 | `duplicateBuild`                                        | Build wrapper action                                              |
| `resetDeck`                     | `resetGearCollection`                                   | Resets active edited grouped object                               |
| `normalizeSavedDecks`           | `normalizeBuilds`                                       | Build wrapper list                                                |
| `updateSavedDeck`               | `updateBuild`                                           | Build wrapper list                                                |
| `ensureUniqueDeckName`          | `ensureUniqueBuildName`                                 | Saved/planned context naming                                      |
| `normalizeDeckName`             | `normalizeBuildName`                                    | Saved/planned context naming                                      |
| `isEditingDeckSession`          | `isEditingBuildSession` or `isEditingCollectionSession` | Depends on actual semantics                                       |
| `resolveSharedDeckFromLocation` | `resolveSharedBuildFromLocation`                        | Shared build import                                               |
| `clearSharedDeckUrl`            | `clearSharedBuildUrl`                                   | Shared build URL                                                  |
| `buildDeckShareUrl`             | `buildBuildShareUrl` or `buildShareUrl`                 | Prefer `buildShareUrl`                                            |

## File And Component Rename Map

| Current file/component  | New name                                             | Notes                                                                   |
|-------------------------|------------------------------------------------------|-------------------------------------------------------------------------|
| `components/deck/`      | `components/build/` or `components/gear-collection/` | Split may be needed later; `build/` is the better wrapper-facing folder |
| `DeckContext.tsx`       | `GearCollectionContext.tsx`                          | Shared editing state is collection-centric                              |
| `DeckPanel.tsx`         | `BuildPanel.tsx` or `GearCollectionPanel.tsx`        | Depends on whether panel is editor UI or raw collection UI              |
| `DecksLibrary.tsx`      | `BuildLibrary.tsx`                                   | Library surface is wrapper-facing                                       |
| `DeckUiContext.tsx`     | `BuildUiContext.tsx`                                 | UI wrapper                                                              |
| `deck-share.ts`         | `build-share.ts`                                     | Share build wrapper                                                     |
| `deck-context.test.ts`  | `gear-collection-context.test.ts`                    | Shared editing state                                                    |
| `deck-share.test.ts`    | `build-share.test.ts`                                | Share wrapper                                                           |
| `decks-library.test.ts` | `build-library.test.ts`                              | UI wrapper                                                              |
| `styles/deck/...`       | `styles/build/...`                                   | UI-facing surface is build-centric                                      |

## UI Copy Rename Map

| Current UI copy    | New UI copy                     |
|--------------------|---------------------------------|
| `Your library`     | `Your library`                  |
| `Favorites`        | `Favorites`                     |
| `Recent Runs`      | `Recent Runs`                   |
| `Saved Builds`     | `Saved Builds`                  |
| `My Builds`        | `My Builds`                     |
| `Create new build` | `Create new build`              |
| `Edit build`       | `Edit build`                    |
| `Save build`       | `Save build`                    |
| `Save run`         | `Save build` or `Save as build` |
| `Update build`     | `Update build`                  |
| `Build items`      | `Gears` or `Build gears`        |
| `No items yet`     | `No gear yet` or `No gears yet` |
| `favorites deck`   | `favorites gear collection`     |
| `shared deck`      | `shared build`                  |

## Keep Terms

- `run`
- `build`
- `guide`
- `favorites`
- `shared`

## Deprecated Terms

- `deck`
- `Deck*`
- `deck item`
- `favorites deck`
- new `deck` storage keys or APIs

## Migration Note

Not every current `Deck*` symbol should become `Build*`.

- Shared grouped-object code should generally move to `GearCollection*`
- wrapper-facing library, share, and save flows should generally move to `Build*`
