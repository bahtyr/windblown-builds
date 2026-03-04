# AGENTS.md — Solo Dev AI Playbook

This repo is built with AI help. The AI is a *tool*, not a teammate. The goal is:
- ship working code
- keep diffs reviewable
- preserve intent + behavior
- avoid “mystery refactors”

If you’re an AI agent reading this: follow these rules strictly.

---

## Non-Negotiables

### 1) Preserve behavior unless explicitly told otherwise
- Do not “improve” logic silently.
- Do not rename, reorder, or “clean up” unless requested.
- If you must change behavior to fix a bug, explain it in the PR/summary.

### 2) Keep changes small and reviewable
- Prefer multiple small commits over one mega commit.
- Avoid sweeping rewrites.
- If the request is large: break into phases and deliver Phase 1 cleanly.

### 3) Don’t delete features
Unless the user explicitly asks to remove them.

### 4) Tests and docs are part of “done”
- If you touch logic, add/adjust tests.
- If you add a function, document it.
- If you add a feature, include usage notes.

---

## Preferred Workflow

### Step 0 — Restate the task (briefly)
- What you will change
- What you won’t change
- Risks / assumptions

### Step 1 — Inspect before editing
- Identify entry points, data flow, side effects.
- If anything is unclear, search the codebase first.
- Do not guess function intent when it’s ambiguous—look for call sites.

### Step 2 — Implement minimally
- Smallest diff that meets the requirement.
- Extract helpers only if repeated 2+ times or function grows > ~50 lines.

### Step 3 — Verify
- Run tests / lint / typecheck if present.
- Add tests if missing.
- If you can’t run, still write tests and explain what they cover.

### Step 4 — Produce clean output
- Final changes summary (Added / Changed / Fixed / Removed).
- Include “how to test” steps.

---

## Coding Style Rules

### General
- Readable > clever.
- Prefer explicit names over abbreviations.
- Avoid long functions (>50 lines) — extract helpers.

### Structure
- Keep files under ~300 lines when possible.
- Split reusable UI components.
- Avoid circular dependencies.

### Comments
- Add comments only for non-obvious logic.

- Comments should add meaning, not repeat code.

Allowed:
- Section narration explaining stages of logic
- Explanations of non-obvious behavior
- Notes about edge cases or browser quirks

Avoid:
- Comments that simply restate the code

### Method Organization

- Group related methods together.
- Use section divider comments to separate logical groups of functions.

Rules:
- Keep related methods near each other.
- Use clear section divider comments.
- Avoid scattering similar logic across the file.

---

## Documentation Requirements

Document:
- Every exported function
- Any function with non-obvious behavior
- Complex internal helpers

JSDoc structure:
1) One–two line summary.
2) Parameters + return.
3) Edge cases / side effects (only if relevant).

Example:
```js
/**
 * Parses rich HTML into the internal document model.
 *
 * @param {string} html - Raw HTML input.
 * @returns {DocNode[]} Parsed document nodes.
 */
```

---

## Commit Messages

### Format:

Short summary (max 72 characters)
- Added:
- Changed:
- Fixed:
- Removed:

Rules:
- Use concise bullet points
- Avoid long explanations
- Do not include AI-generated disclaimers
- Do not include phrases like "This commit does..."