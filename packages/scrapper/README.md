npm# Windblown scraper (TypeScript)

## Install & run

```bash
npm install
npm start
```

## Build & typecheck

```bash
npm run check
npm run build
```

## Project structure

- `src/core/wikiHtml.ts`: reusable wiki HTML fetch + section-table row helpers.
- `src/pages/gifts.ts`: gifts-specific URL, sections, and row parsing.
- `src/richTextParser.ts`: rich description parser used by page scrapers.