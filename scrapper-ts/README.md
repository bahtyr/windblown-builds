# Windblown scraper (TypeScript)

## Install

```bash
npm install
```

## Run gifts scraper

```bash
npm start
```

Pretty JSON output:

```bash
npm start -- --pretty
```

## Project structure

- `src/core/wikiHtml.ts`: reusable wiki HTML fetch + section-table row helpers.
- `src/pages/gifts.ts`: gifts-specific URL, sections, and row parsing.
- `src/richTextParser.ts`: rich description parser used by page scrapers.

## Build / typecheck

```bash
npm run check
npm run build
```
