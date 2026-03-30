# Windblown scraper (TypeScript)

```bash
npm install
npm run dev

npm run build
npm start

```

## Project structure

## E2E testing

Playwright tests live in `tests/e2e`.

```bash
npm run test:e2e
npm run test:e2e:headed
npm run test:e2e:ui
```

Notes:
- Playwright uses the local Next dev server at `http://127.0.0.1:3000`.
- The config starts the dev server automatically unless one is already running.
- No snapshots are used right now. If snapshot assertions are added later, update them with `npx playwright test --update-snapshots`.
