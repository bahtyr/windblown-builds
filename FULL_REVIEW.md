Good. Then do a **cleanup review pass**, not a performance pass.

Split it into these buckets so you do not mentally mix everything together:

## 1. Code cleanliness

Check:

* files doing too many things
* components too large
* functions too long
* unclear responsibilities
* repeated logic that should be extracted
* over-extraction where helpers made things harder to read
* weird AI abstractions
* inconsistent patterns between similar files
* state names that do not match what they actually mean
* comments that explain *what* instead of *why*
* placeholder TODO/debug code left behind

Questions:

* is this the simplest version that still reads well?
* does this file have one main job?
* would I understand this in 2 weeks?

## 2. Consistency

This is where AI often makes the codebase ugly.

Look for inconsistency in:

* naming style
* component structure
* prop order
* hook placement
* event handler naming
* class naming
* file naming
* import ordering
* spacing / formatting
* how conditionals are written
* how empty/loading/error states are handled
* button/card/input patterns
* how similar screens solve similar problems

Bad sign:
same concept implemented 3 different ways.

## 3. Dead code / useless code

Look for:

* unused imports
* unused state
* unused props
* unused helper functions
* unused CSS classes
* old variants no longer reachable
* console logs
* commented-out code
* fallback branches that can never happen
* temporary wrappers
* duplicate utilities after refactor
* components only used once and not worth extracting

AI often leaves:

* “future-proofing” code
* alternate paths not actually used
* generic helpers for one call site

Delete aggressively.

## 4. Naming review

This matters more than people admit.

Review:

* component names
* prop names
* state names
* handler names
* CSS class names
* booleans especially

Common bad names:

* `data`
* `items2`
* `temp`
* `handleClick` when there are 8 clicks
* `isActive` when it means selected / open / highlighted / editing
* `list` when it is actually filtered list
* `value` when it is search text / selected id / filter state

Ask:

* does the name describe role, not implementation?
* does boolean read naturally in conditionals?
* would a new dev misunderstand this?

## 5. CSS / UI code cleanliness

Not performance now — cleanliness and maintainability.

Check:

* duplicated utility/class groups
* one-off hacks
* magic numbers everywhere
* margins used to patch broken layout
* random z-index values
* over-nested wrappers
* style rules fighting each other
* state styles spread everywhere
* no clear shared tokens for spacing/radius/colors
* multiple card/button/input styles that should be one pattern

Bad signs:

* “why is this `top: -3px`?”
* “why does this need 4 wrappers?”
* “why do these two cards look same but use different markup/styles?”

## 6. UI consistency review

Separate from code.

Look for:

* button hierarchy inconsistency
* same action labeled differently in different places
* spacing rhythm off
* card states inconsistent
* selected/active state inconsistent
* empty states inconsistent
* icon sizes inconsistent
* hover/focus states missing or mixed
* destructive actions not visually distinct
* “create/edit/view” flows named inconsistently
* pages that do not look like they belong to same app

This is where you should ask:

* does the app have a visual grammar?
* do similar actions look and behave the same?

## 7. Product/UI wording consistency

Very underrated.

Check:

* deck vs build vs run terminology
* save vs create vs update wording
* profile vs library vs collection wording
* import wording
* button labels
* empty-state copy
* headings
* tab names

If the same concept has 2–3 names, fix it.

---

## Best review order

Do it in this order:

### Pass 1 — obvious garbage

Fast sweep:

* console logs
* commented code
* unused imports
* dead CSS
* obvious naming garbage
* duplicate helpers

### Pass 2 — structural cleanliness

* large files
* unclear responsibilities
* repeated logic
* awkward abstractions
* component boundaries

### Pass 3 — UI consistency

Open app and compare:

* buttons
* cards
* spacing
* terminology
* active states
* page structure

### Pass 4 — naming polish

Rename only after structure settles.

---

## How to label findings

Use a simple tag system:

* **Delete** — dead/useless
* **Simplify** — too complex for no gain
* **Rename** — misleading naming
* **Standardize** — inconsistent with app pattern
* **Split** — file/component too large
* **Keep** — weird but justified

This stops cleanup from turning into vague perfectionism.

---

## Good cleanup principles

* prefer deleting over abstracting
* prefer one clear pattern over “flexible” patterns
* prefer local clarity over fake reusability
* keep shared components only when repetition is real
* do not restyle whole app during code cleanup
* do not mix visual redesign with cleanup unless tiny

---

## Practical checklist

You can literally review each file with this:

```txt
Code
[ ] File has one clear job
[ ] Logic is readable
[ ] No obvious duplication
[ ] No unnecessary abstraction
[ ] No dead code
[ ] No debug leftovers

Naming
[ ] Component names are clear
[ ] Prop/state names match actual meaning
[ ] Booleans read clearly
[ ] Terms are consistent with rest of app

CSS / UI code
[ ] No layout hacks unless justified
[ ] No duplicated styling patterns
[ ] No messy wrapper nesting
[ ] Shared patterns are actually shared

UI consistency
[ ] Similar actions look the same
[ ] Similar components behave the same
[ ] Terminology is consistent
[ ] Spacing / hierarchy feels aligned
```

---

## Biggest AI-code smell list

These are the things I would expect to find:

* over-componentization
* generic helper names
* extracted constants used once
* fake reusable hooks
* repeated inline mapping logic
* too many booleans controlling UI states
* conditionals that are technically correct but hard to read
* CSS classes copied and slightly changed
* inconsistent button variants
* old code path left beside new one
* “smart” utilities that hide simple logic

---

## What not to do

* do not clean entire repo in one commit
* do not rename everything before deciding final patterns
* do not extract shared components too early
* do not keep bad code just because AI wrote a lot of it

Be ruthless:
**if it adds complexity without clear value, cut it.**

If you want, paste a file or diff and I’ll do a blunt cleanup review on it.
