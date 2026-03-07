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
- `src/pages/weapons.ts`: weapon scraper.
- `src/pages/trinkets.ts`: trinket scraper.
- `src/pages/magifishes.ts`: magifish scraper.
- `src/pages/hexes.ts`: hexes scraper.
- `src/pages/boosts.ts`: boosts scraper (single-table layout).
- `src/pages/effects.ts`: effects (buffs/debuffs/etc.) scraper.
- `src/richTextParser.ts`: rich description parser used by page scrapers.
