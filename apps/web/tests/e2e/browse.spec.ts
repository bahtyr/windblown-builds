import {expect, test} from "@playwright/test";

test("browse search flow can narrow and reset visible results", async ({page}) => {
  await page.goto("/browse");

  await expect(page.getByRole("heading", {name: "Browse items"})).toBeVisible();

  const sidebarSubtitles = page.locator(".browse-sidebar .browse-sidebar-subtitle");
  await expect(sidebarSubtitles.nth(0)).toHaveText("Category");
  await expect(sidebarSubtitles.nth(1)).toHaveText("Entities");

  const searchInput = page.getByPlaceholder("Search text...");
  await searchInput.fill("Abundance");

  await expect(page.getByText("1 result")).toBeVisible();
  await expect(page.getByText("Abundance", {exact: true})).toBeVisible();
  await expect(page.getByText("Balance", {exact: true})).toBeVisible();

  await page.getByRole("button", {name: "Hide unmatching results"}).click();
  await expect(page.getByText("Balance", {exact: true})).not.toBeVisible();

  await page.getByRole("button", {name: "Reset filters"}).click();
  await expect(searchInput).toHaveValue("");
  await expect(page.getByText(/total$/)).toBeVisible();
  await expect(page.getByText("Balance", {exact: true})).toBeVisible();
  await expect(page.getByRole("button", {name: "Add to deck"})).toHaveCount(0);
});

test("browse hover preview plays above the hovered card", async ({page}) => {
  await page.goto("/browse");

  const searchInput = page.getByPlaceholder("Search text...");
  await searchInput.fill("Abundance");

  const card = page.locator(".card", {has: page.getByText("Abundance", {exact: true})}).first();
  await expect(card).toBeVisible();

  await card.locator(".card-thumb-wrap").hover();

  const preview = card.locator(".card-image-hover-preview");
  const video = preview.locator("video");

  await expect(preview).toBeVisible();
  await expect(video).toBeVisible();

  await expect
    .poll(async () => {
      return await video.evaluate((node) => {
        const media = node as HTMLVideoElement;
        return {
          currentTime: media.currentTime,
          paused: media.paused,
          readyState: media.readyState,
        };
      });
    })
    .toMatchObject({paused: false});

  const videoBox = await video.boundingBox();
  const cardBox = await card.boundingBox();

  expect(videoBox?.width ?? 0).toBeGreaterThan(180);
  expect(videoBox?.height ?? 0).toBeGreaterThan(100);
  expect(cardBox).not.toBeNull();
  expect(videoBox).not.toBeNull();
  expect((videoBox?.y ?? 0) + (videoBox?.height ?? 0)).toBeLessThanOrEqual((cardBox?.y ?? 0) + 1);
});

test("decks hover tooltip renders a visible video area", async ({page}) => {
  await page.addInitScript(() => {
    localStorage.setItem("windblown.likes.v1", JSON.stringify([
      "gifts:Abundance",
      "gifts:Balance",
      "gifts:Big Pockets",
      "gifts:Blaze",
      "gifts:Bombs Away",
      "gifts:Boomerang",
      "gifts:Break Time",
      "gifts:Critical Thinking",
      "gifts:Cupidon",
      "gifts:Death's Door",
      "gifts:Ebb and Flow",
      "gifts:Echoes",
      "gifts:Emergency Flask",
      "gifts:Exclusive",
      "gifts:Extra Fish",
      "gifts:Featherweight",
      "gifts:Final Gift",
      "gifts:Foundation",
      "gifts:Fresh Produce",
      "gifts:Fully Equipped",
    ]));
  });

  await page.goto("/decks");

  await expect(page.getByText("Favorites", {exact: false})).toBeVisible();

  const item = page.locator(".decks-grid-favorites .deck-row-item").last();
  await item.hover();

  const tooltip = item.locator(".deck-row-item-hover");
  const video = tooltip.locator("video");

  await expect(tooltip).toBeVisible();
  await expect(video).toBeVisible();

  const tooltipBox = await tooltip.boundingBox();
  const box = await video.boundingBox();

  expect(tooltipBox).not.toBeNull();
  expect(tooltipBox?.x ?? 0).toBeGreaterThanOrEqual(0);
  expect(tooltipBox?.y ?? 0).toBeGreaterThanOrEqual(0);
  expect((tooltipBox?.x ?? 0) + (tooltipBox?.width ?? 0)).toBeLessThanOrEqual(1280);
  expect((tooltipBox?.y ?? 0) + (tooltipBox?.height ?? 0)).toBeLessThanOrEqual(720);
  expect(box?.width ?? 0).toBeGreaterThan(300);
  expect(box?.height ?? 0).toBeGreaterThan(170);
});

test("deck category hover activates a filter and reset clears it", async ({page}) => {
  await page.addInitScript(() => {
    localStorage.setItem("windblown.deck.saved.v3", JSON.stringify([
      {
        name: "Category Test",
        createdAt: "2026-03-30T12:00:00.000Z",
        items: [
          {id: "gifts:Abundance", type: "gifts", name: "Abundance", image: "/images/gifts/Abundance_Icon.png"},
          {id: "gifts:Balance", type: "gifts", name: "Balance", image: "/images/gifts/Balance_Icon.png"},
          {id: "weapons:Anchor Boom", type: "weapons", name: "Anchor Boom", image: "/images/weapons/Anchor_Boom_Icon.png"},
        ],
      },
    ]));
  });

  await page.goto("/decks");

  const deckRow = page.locator(".deck-row", {has: page.getByRole("heading", {name: "Category Test"})});
  await expect(deckRow).toBeVisible();

  const firstChip = deckRow.locator(".deck-row-category-chip").first();
  await firstChip.hover();

  await expect(deckRow.getByRole("button", {name: "Reset"})).toBeVisible();
  await expect
    .poll(async () => await deckRow.locator(".deck-row-item.is-category-mismatch").count())
    .toBeGreaterThan(0);

  await deckRow.locator(".deck-row-actions").hover();
  await expect(deckRow.getByRole("button", {name: "Reset"})).toHaveCount(0);
  await expect(deckRow.locator(".deck-row-item.is-category-mismatch")).toHaveCount(0);

  await firstChip.hover();
  await expect(deckRow.getByRole("button", {name: "Reset"})).toBeVisible();

  await deckRow.getByRole("button", {name: "Reset"}).click();
  await expect(deckRow.getByRole("button", {name: "Reset"})).toHaveCount(0);
  await expect(deckRow.locator(".deck-row-item.is-category-mismatch")).toHaveCount(0);
});
