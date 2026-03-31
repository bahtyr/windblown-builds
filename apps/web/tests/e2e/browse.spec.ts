import {expect, test} from "@playwright/test";

test("browse search flow can narrow and reset visible results", async ({page}) => {
  await page.goto("/browse");

  await expect(page.getByRole("heading", {name: "Browse items"})).toBeVisible();

  const sidebarSubtitles = page.locator(".browse-sidebar .browse-sidebar-subtitle");
  await expect(sidebarSubtitles).toContainText(["View", "Category", "Entities"]);

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

test("browse page ignores deck membership state", async ({page}) => {
  await page.addInitScript(() => {
    localStorage.setItem("windblown.deck.v3", JSON.stringify({
      name: "Current Build",
      createdAt: "2026-03-31T12:00:00.000Z",
      items: [
        {id: "gifts:Abundance", type: "gifts", name: "Abundance", image: "/images/gifts/Abundance_Icon.png"},
      ],
    }));
  });

  await page.goto("/browse");

  await page.getByPlaceholder("Search text...").fill("Abundance");

  const card = page.locator(".card", {has: page.getByText("Abundance", {exact: true})}).first();
  await expect(card).toBeVisible();
  await expect(card).not.toHaveClass(/is-in-deck/);
  await expect(card.getByRole("button", {name: "Add to deck"})).toHaveCount(0);
  await expect(card.getByRole("button", {name: "Remove from deck"})).toHaveCount(0);
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

test("browse thumbs view shows larger art and hover details with video", async ({page}) => {
  await page.goto("/browse");

  await page.getByRole("button", {name: "Thumbs"}).click();
  await page.getByPlaceholder("Search text...").fill("Abundance");
  await page.getByRole("button", {name: "Hide unmatching results"}).click();

  const card = page.locator(".card-thumbs").first();
  await expect(card).toBeVisible();

  const image = card.locator(".card-thumbs-image");
  const hover = card.locator(".card-thumbs-hover");
  const video = hover.locator("video");

  await expect(image).toBeVisible();
  await card.hover({force: true});

  await expect(hover).toBeVisible();
  await expect(hover.getByText("Abundance", {exact: true})).toBeVisible();
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

  const imageBox = await image.boundingBox();
  const hoverBox = await hover.boundingBox();
  const videoBox = await video.boundingBox();
  const filtersBox = await page.locator(".filters-body").boundingBox();

  expect(imageBox?.width ?? 0).toBeGreaterThan(60);
  expect(imageBox?.height ?? 0).toBeGreaterThan(60);
  expect(hoverBox).not.toBeNull();
  expect(videoBox?.width ?? 0).toBeGreaterThan(240);
  expect(videoBox?.height ?? 0).toBeGreaterThan(130);
  expect(hoverBox?.y ?? 0).toBeGreaterThanOrEqual((filtersBox?.y ?? 0) + (filtersBox?.height ?? 0));
  expect((hoverBox?.y ?? 0) + (hoverBox?.height ?? 0)).toBeLessThanOrEqual(720);
  expect(hoverBox).not.toBeNull();
  expect(imageBox).not.toBeNull();
  const isSidePlaced =
    (hoverBox?.x ?? 0) >= ((imageBox?.x ?? 0) + (imageBox?.width ?? 0)) ||
    ((hoverBox?.x ?? 0) + (hoverBox?.width ?? 0)) <= (imageBox?.x ?? 0);
  const isVerticallyStacked =
    (hoverBox?.y ?? 0) >= ((imageBox?.y ?? 0) + (imageBox?.height ?? 0)) ||
    ((hoverBox?.y ?? 0) + (hoverBox?.height ?? 0)) <= (imageBox?.y ?? 0);
  const isEdgeAligned =
    Math.abs((hoverBox?.x ?? 0) - (imageBox?.x ?? 0)) <= 2 ||
    Math.abs(((hoverBox?.x ?? 0) + (hoverBox?.width ?? 0)) - ((imageBox?.x ?? 0) + (imageBox?.width ?? 0))) <= 2;
  expect(isSidePlaced || (isVerticallyStacked && isEdgeAligned)).toBeTruthy();
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

  await page.getByRole("tab", {name: "Favorites"}).click();
  await expect(page.getByRole("heading", {name: /Favorites/})).toBeVisible();

  const item = page.locator(".decks-grid-favorites .deck-row-item").last();
  await item.hover();

  const tooltip = item.locator(".deck-row-item-hover");
  const video = tooltip.locator("video");
  const pageHeader = page.locator(".decks-page-top");

  await expect(tooltip).toBeVisible();
  await expect(video).toBeVisible();

  const itemBox = await item.boundingBox();
  const pageHeaderBox = await pageHeader.boundingBox();
  const tooltipBox = await tooltip.boundingBox();
  const box = await video.boundingBox();

  expect(tooltipBox).not.toBeNull();
  expect(tooltipBox?.x ?? 0).toBeGreaterThanOrEqual(0);
  expect(tooltipBox?.y ?? 0).toBeGreaterThanOrEqual(0);
  expect(tooltipBox?.y ?? 0).toBeGreaterThanOrEqual((pageHeaderBox?.y ?? 0) + (pageHeaderBox?.height ?? 0));
  expect((tooltipBox?.x ?? 0) + (tooltipBox?.width ?? 0)).toBeLessThanOrEqual(1280);
  expect((tooltipBox?.y ?? 0) + (tooltipBox?.height ?? 0)).toBeLessThanOrEqual(720);
  expect((tooltipBox?.x ?? 0)).toBeGreaterThanOrEqual(0);
  expect(box?.width ?? 0).toBeGreaterThan(240);
  expect(box?.height ?? 0).toBeGreaterThan(130);
  expect(itemBox).not.toBeNull();
  expect(
    (tooltipBox?.x ?? 0) >= ((itemBox?.x ?? 0) + (itemBox?.width ?? 0)) ||
    ((tooltipBox?.x ?? 0) + (tooltipBox?.width ?? 0)) <= (itemBox?.x ?? 0) ||
    Math.abs((tooltipBox?.x ?? 0) - (itemBox?.x ?? 0)) <= 2 ||
    Math.abs(((tooltipBox?.x ?? 0) + (tooltipBox?.width ?? 0)) - ((itemBox?.x ?? 0) + (itemBox?.width ?? 0))) <= 2
  ).toBeTruthy();
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

test("embedded deck browser supports thumbs view", async ({page}) => {
  await page.goto("/decks");

  await page.getByRole("button", {name: "Create new build"}).click();
  await expect(page.getByRole("dialog", {name: "Build editor"})).toBeVisible();

  const deckBrowser = page.locator(".deck-builder-browser");
  await deckBrowser.getByRole("button", {name: "Thumbs"}).click();
  await deckBrowser.getByPlaceholder("Search text...").fill("Abundance");
  await deckBrowser.getByRole("button", {name: "Hide unmatching results"}).click();

  const card = deckBrowser.locator(".card-thumbs").first();
  await expect(card).toBeVisible();
  await expect(card.locator(".card-thumbs-image")).toBeVisible();
});

test("dropping an image from browse opens the new run dialog on my builds", async ({page}) => {
  await page.goto("/browse");

  const dataTransfer = await page.evaluateHandle(async () => {
    const transfer = new DataTransfer();
    const response = await fetch("/source-cropped-2.png");
    const blob = await response.blob();
    transfer.items.add(new File([blob], "source-cropped-2.png", {type: blob.type}));
    return transfer;
  });

  await page.locator("body").dispatchEvent("dragenter", {dataTransfer});
  await expect(page.getByText("Drop image to create build")).toBeVisible();

  await page.locator("body").dispatchEvent("drop", {dataTransfer});
  await expect(page).toHaveURL(/\/decks$/);
  await expect(page.getByRole("link", {name: "My Builds"})).toHaveClass(/is-active/);
  await expect(page.getByRole("dialog", {name: "New run"})).toBeVisible();
});
