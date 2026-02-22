# Windblown scraper (TypeScript)

```bash
npm install
npm run dev
npm run check
npm run build
npm start
npm test
```

## Project structure

- `src/core/wikiHtml.ts`: reusable wiki HTML fetch + section-table row helpers.
- `src/pages/gifts.ts`: gifts-specific URL, sections, and row parsing.
- `src/richTextParser.ts`: rich description parser used by page scrapers.