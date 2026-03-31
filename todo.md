# TODO

---

## 1. Liked deck build ✅
Goal: add a dynamic Favorites deck to My Builds.
## 2. Deck hover content ✅
Goal: make deck items image-first and move detail to hover.
## 3. Deck more info ✅
Goal: show extra metadata for every deck.
## 4. Entity videos ✅
Goal: bring entity videos into the app and surface them in deck/browse hover UI.
## 5. Better detect build flow ✅
Goal: keep the debugger flow separate, and create a simpler user-facing flow for making a build from an image.
### v1 dialog ✅
### v2 anywhere in the app ✅

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

---

- deck hover tooltip - should be considered of browser overflow. tooltip should position within browser when close to the edge of the screen.
- cursor issue: even when a div is cursor pointer, hovering on a text within reverts to cursor default

- add alternate view mode to the browse page - details (default current) - add new thumbs mode - bigger image - show description + video on hover like in deck
- my profile
  - favorites
  - runs tab
  - saved builds tab
  - most picked gifts
  - least picked gifts/weapons...

- wiki accreditation / "contibute"
- boost count support +-
- runs should also import diffuclty - run time - damage count 