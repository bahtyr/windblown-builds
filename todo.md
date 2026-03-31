# TODO

## Status Overview

### Ready to implement, execution order
1. Deck more info follow-up polish
2. Entity videos tooltip order
3. Better detect build flow follow-up polish

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

## 5. Better detect build flow ✅
Goal: keep the debugger flow separate, and create a simpler user-facing flow for making a build from an image.

### v1 dialog ✅

### v2 anywhere in the app
- Allow drag-and-drop image upload anywhere in the app.
- Show a clear "drop image to create deck" style affordance.
- Dropping an image should open the same dialog.
- Also support paste:
- If the user pastes an image, open the same dialog.

---

## Follow-up TODO for Done Items

### Deck more info follow-up
- Improve the overall visual treatment.
- Fix bottom spacing.
- Hide empty category-image slots so they do not take space.
- Fix hover filters so they clear on hover-out.
- Stop fading unmatched deck items when category hover/filter is active.
- Show a reset button at the end of the category row when a filter is active.

### Entity videos follow-up
- On the My Builds page, move the video after the description to the end of the deck-item tooltip.

### Better detect build flow follow-up
- Change the v1 dialog subtext to: `Calculated in {rounded seconds} seconds. x items detected.`
- Change the build-name default to a weekday/time format like `Sunday 23:30` using rounded minutes.
- Make the initial source prompt use the app white text style: `drop an image or click to upload`.
- Add a clear hover state to the empty drop zone with a blue highlighted border.
- Ensure the empty drop zone uses a pointer cursor.

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
