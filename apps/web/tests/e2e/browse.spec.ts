import {expect, test} from "@playwright/test";

test("browse search flow can narrow and reset visible results", async ({page}) => {
  await page.goto("/browse");

  await expect(page.getByRole("heading", {name: "Browse items"})).toBeVisible();

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
    localStorage.setItem("windblown.likes.v1", JSON.stringify(["gifts:Abundance"]));
  });

  await page.goto("/decks");

  await expect(page.getByText("Favorites", {exact: false})).toBeVisible();

  const item = page.locator(".decks-grid-favorites .deck-row-item").first();
  await item.hover();

  const tooltip = item.locator(".deck-row-item-hover");
  const video = tooltip.locator("video");

  await expect(tooltip).toBeVisible();
  await expect(video).toBeVisible();

  const box = await video.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThan(300);
  expect(box?.height ?? 0).toBeGreaterThan(170);
});
