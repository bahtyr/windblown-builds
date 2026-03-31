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

remove done todos. keep the heading & goal. put ✅ to done items.

## 1. Liked deck build ✅
Goal: add a dynamic Favorites deck to My Builds.

## 2. Deck hover content ✅
Goal: make deck items image-first and move detail to hover.

## 3. Deck more info ✅
Goal: show extra metadata for every deck.
- doesn't look nice
- spacing bottom.
- when image empty should not take up space
- hovering on one of these items sets a filter, does not go away when hover out.
- fades unmatching items in the deck.
- show reset button at the end of these items when a filter is present.

## 4. Entity videos ✅
Goal: bring entity videos into the app and surface them in deck/browse hover UI.
- on the "my builds" page - move the video after the description to the end of the tooltip - hover tooltip of deck items

## 5. Better detect build flow ✅
Goal: keep the debugger flow separate, and create a simpler user-facing flow for making a build from an image.

### v1 dialog ✅
- source image area zone: no hover state when image already selected and want to replace
- update subtext: "Calculated in {rounded seconds} seconds. x items detected."
- Build name: "Sunday 23:30" (round minute)
- make initial source text color white (used in the app) "drop an image or click to upload"
- add hover state to drop zone - blue highlight the box /border.
- drop zone cursor pointer

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
