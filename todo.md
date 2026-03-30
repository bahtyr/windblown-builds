# TODO

## Status Overview

### Ready to implement, execution order
1. Liked deck build
2. Deck more info
3. Deck hover content
4. Entity videos
5. Better detect build flow

### To discuss before implementing
- Gift matching debugger
- Builds vs runs
- Browse filter button

---

## 1. Liked deck build

Goal: add a dynamic Favorites deck to My Builds.

- Add a `Favorites` deck to the My Builds page.
- Hide it if there are no liked entities.
- The deck is auto-generated from the user's current likes from the Browse page.
- This is not a snapshot or independent saved deck.

---

## 2. Deck hover content

Goal: make deck items image-first and move detail to hover.

- Remove visible names from deck items so the grid is image only.
- On hover, show the entity name.
- On hover, show the entity description using the same card-style content used on Browse.
- Hide image actions inside the hover content:
- No favorite action
- No add action

---

## 3. Deck more info

Goal: show extra metadata for every deck.

- Add a visible list of gift categories for every deck.
- Place this to the left of the deck, similar to a side panel.
- This should always be visible, not only on selection or expand.
- Categories do not currently have their own image list.
- Create a category-image mapping based on existing entity images.
- Store that mapping in a JSON file.
- This can be generated once and used only for this deck info UI.
- No need to add category images to the Browse page.

---

## 4. Entity videos

Goal: bring entity videos into the app and surface them in deck/browse hover UI.

- Parse videos from the wiki so opening an entity page has video data available.
- Store video assets as URLs, consistent with current scraper asset handling.
- Weapons can have multiple videos, so all videos need to be stored.
- Decide where to show them in the UI:
- On deck hover, show the video above the entity description card.
- On the Browse page, hovering the image should show the video as a floating preview, not inserted into the card.
- Video previews should stay small, like thumbnails, not large embeds.

Reference:
- Wiki parsing lives in `packages/scrapper`.

---

## 5. Better detect build flow

Goal: keep the debugger flow separate, and create a simpler user-facing flow for making a build from an image.

- Keep the gift matcher debugger page as a separate UI flow.
- Add a user-facing flow to upload a run screenshot, parse it, and create a build.
- For v1, this still saves into normal builds.
- The entry point button should be named `New run`.

### v1 dialog

- Add a `New run` button.
- Meaning: the user just played a game/run and wants to upload the screenshot.
- Clicking it opens a popup dialog.
- Dialog should support:
  - Click to upload image
  - Drag and drop image
  - Use a familiar upload/dropzone pattern, similar to file attach or Google Drive drag/drop modals.
  - The source image preview should have a max width/height and should not take over the full screen.
  - Auto-start parsing when the file is selected.
    - No need to show total parsing time.
      - Still highlight found and not-found squares in the source image.
- Show a deck-builder style layout with:
  - Input for build name
  - List of added items
  - Remove button for added items
  - Successful matches should be added automatically to the build list.
  - Below that, show failed matches in a separate section.
  - For failed matches, show alternate candidates in a similar UI with add buttons.
  - Adding a candidate adds it to the build list above.
    - Do not remove it from the failed list when added.
- Save build button.
- Edit button: 
  - Save first
  - Then open the edit modal
  - This prevents the user from losing the build
- Dialog should have:
  - X button at top right
  - Faded background overlay
- Clicking items should not change the highlighted squares in the source image.
- This flow should save the deck immediately.
- Do not use the previous share-link/open-link method.

### v2 anywhere in the app

- Allow drag-and-drop image upload anywhere in the app.
- Show a clear "drop image to create deck" style affordance.
- Dropping an image should open the same dialog.
- Also support paste:
- If the user pastes an image, open the same dialog.

---

## 6. Gift matching debugger

Status: discuss before implementing.

Open questions / ideas:
- Suggest a crop zone automatically.
- Problem: large in-game screenshots can detect unintended squares.
- The detector should focus on the correct area automatically.
- Need to define how that automatic crop suggestion works.
- Consider whether the user should be allowed to adjust the crop if needed.
- For failed cases, allow picking from the top 3 candidates.
- Consider whether successful matches should appear faded / less visually prominent.

---

## 7. Builds vs runs

Status: discuss before implementing.

Discussion point:
- Parsing a deck from an image will make it easy for users to create many records.
- We may need to distinguish between:
- Auto-generated run history / recently played runs
- Saved, curated, liked builds

Possible directions:
- Two tabs on My Builds
- Two separate sections/lists
- Potentially rebrand My Builds / Your Library as `My Profile`

Current decision:
- For now, `New run` still saves into the same builds collection.

---

## 8. Browse filter button

Status: discuss before implementing.

Problem:
- Need to consider both reset-filter button placement and side-panel layout.
- When scrolling inside the side panel, the reset button and selected filters can be hidden.
- That hurts usability.

Initial implementation direction:
- Make selected filters and relevant actions sticky while scrolling.

Still to consider:
- Whether the side-panel layout should be changed more broadly.
