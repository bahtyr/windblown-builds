# AI Agent Instructions

This repository allows AI coding agents to assist with development.

Follow the rules below when modifying code or generating commits.

---

## Commit Messages

Format:

Short summary (max 72 characters)

- Added:
- Changed:
- Fixed:
- Removed:

Rules:
- Use concise bullet points
- Avoid long explanations
- Do not include AI-generated disclaimers
- Do not include "This commit does..."

Example:

Improve deck filter UI

- Added sticky filter panel
- Simplified deck card layout
- Reduced spacing between items

---

## Coding Style

General:
- Prefer readable code over clever code
- Avoid long functions (>50 lines)
- Extract reusable logic

Naming:
- Use clear descriptive variable names
- Avoid abbreviations unless common

Files:
- Keep files under ~300 lines when possible
- Split reusable UI components

---

## Refactoring

When refactoring:
- Preserve existing behavior
- Do not remove features unless explicitly requested
- Keep commits focused on one change

---

## Documentation

When adding features:
- Update README if needed
- Add comments for non-obvious logic
- Prefer short explanations

---

## Safety Rules

Never:
- delete unrelated code
- rewrite entire files without reason
- introduce dependencies without explanation