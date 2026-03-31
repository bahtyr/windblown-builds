import path from "node:path";
import {expect, test} from "@playwright/test";

test("homepage redirects to the builds library", async ({page}) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/decks$/);
  await expect(page.getByRole("heading", {name: "Your library"})).toBeVisible();
  await expect(page.getByRole("button", {name: "Create new build"})).toBeVisible();
  await expect(page.getByRole("button", {name: "New run"})).toBeVisible();
  await expect(page.getByRole("link", {name: "My Builds"})).toHaveClass(/is-active/);
});

test("builds page tabs switch between favorites, saved builds, and recent runs", async ({page}) => {
  await page.addInitScript(() => {
    localStorage.setItem("windblown.likes.v1", JSON.stringify([
      "gifts:Abundance",
      "gifts:Balance",
    ]));
    localStorage.setItem("windblown.deck.saved.v3", JSON.stringify([
      {
        name: "Category Test",
        createdAt: "2026-03-30T12:00:00.000Z",
        items: [
          {id: "gifts:Abundance", type: "gifts", name: "Abundance", image: "/images/gifts/Abundance_Icon.png"},
          {id: "weapons:Anchor Boom", type: "weapons", name: "Anchor Boom", image: "/images/weapons/Anchor_Boom_Icon.png"},
        ],
      },
    ]));
  });

  await page.goto("/decks");

  await expect(page.getByRole("tab", {name: "Recent Runs"})).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", {name: "Category Test"})).toBeVisible();

  await page.getByRole("tab", {name: "Favorites"}).click();
  await expect(page.getByRole("tab", {name: "Favorites"})).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", {name: /Favorites/})).toBeVisible();
  await expect(page.getByRole("heading", {name: "Category Test"})).toHaveCount(0);

  await page.getByRole("tab", {name: "Saved Builds"}).click();
  await expect(page.getByText("No saved builds yet.")).toBeVisible();
  await expect(page.getByRole("heading", {name: "Category Test"})).toHaveCount(0);
});

test("new run dialog can parse a screenshot and save a run", async ({page}) => {
  await page.goto("/decks");

  await page.getByRole("button", {name: "New run"}).click();
  await expect(page.getByRole("dialog", {name: "New run"})).toBeVisible();

  const fileInput = page.locator(".run-build-hidden-input");
  await fileInput.setInputFiles(path.join(process.cwd(), "public", "source-cropped-2.png"));

  const saveButton = page.getByRole("button", {name: "Save run"});
  await expect(saveButton).toBeEnabled({timeout: 30000});

  await saveButton.click();

  await expect(page.getByRole("dialog", {name: "New run"})).not.toBeVisible();
  await expect(page.getByRole("heading", {name: /^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday) \d{2}:\d{2}$/})).toBeVisible({timeout: 10000});
});

test("closing an edited build drawer keeps edit mode visible until unmount", async ({page}) => {
  await page.addInitScript(() => {
    const savedDeck = {
      name: "Edit Me",
      createdAt: "2026-03-30T12:00:00.000Z",
      items: [
        {id: "gifts:Abundance", type: "gifts", name: "Abundance", image: "/images/gifts/Abundance_Icon.png"},
      ],
    };

    localStorage.setItem("windblown.deck.saved.v3", JSON.stringify([savedDeck]));
    localStorage.setItem("windblown.deck.v3", JSON.stringify({
      name: savedDeck.name,
      items: savedDeck.items,
      editingDeckName: savedDeck.name,
    }));
  });

  await page.goto("/decks");

  const deckRow = page.locator(".deck-row", {has: page.getByRole("heading", {name: "Edit Me"})});
  await expect(deckRow).toBeVisible();
  await deckRow.hover();
  await deckRow.getByRole("button", {name: "Edit"}).click();
  await expect(page.getByRole("heading", {name: "Edit build"})).toBeVisible();

  await page.getByRole("button", {name: "Cancel", exact: true}).click();

  await expect(page.getByRole("dialog", {name: "Build editor"})).toBeVisible();
  await expect(page.getByRole("heading", {name: "Edit build"})).toBeVisible();
  await expect(page.getByRole("heading", {name: "Create new build"})).toHaveCount(0);

  await expect(page.getByRole("dialog", {name: "Build editor"})).not.toBeVisible();
});

test("creating a new build drawer renders an opening phase before settling open", async ({page}) => {
  await page.goto("/decks");

  await page.getByRole("button", {name: "Create new build"}).click();

  const surface = page.locator(".deck-builder-surface");
  await expect(surface).toHaveClass(/is-opening/);

  const openingTransform = await surface.evaluate((node) => window.getComputedStyle(node).transform);
  expect(openingTransform).not.toBe("none");

  await expect(surface).toHaveClass(/is-open/);
});

test("adding and removing items does not retrigger drawer opening phases", async ({page}) => {
  await page.goto("/decks");

  await page.getByRole("button", {name: "Create new build"}).click();

  const surface = page.locator(".deck-builder-surface");
  await expect(surface).toHaveClass(/is-open/);

  await page.evaluate(() => {
    const surfaceElement = document.querySelector(".deck-builder-surface");
    const observedClasses: string[] = [];

    if (!surfaceElement) {
      throw new Error("Drawer surface not found");
    }

    observedClasses.push(surfaceElement.className);

    const observer = new MutationObserver(() => {
      observedClasses.push(surfaceElement.className);
    });

    observer.observe(surfaceElement, {attributes: true, attributeFilter: ["class"]});
    (window as Window & { __drawerClassObserver?: MutationObserver; __drawerObservedClasses?: string[] }).__drawerClassObserver = observer;
    (window as Window & { __drawerObservedClasses?: string[] }).__drawerObservedClasses = observedClasses;
  });

  const firstCard = page.locator(".card").first();
  await expect(firstCard).toBeVisible({timeout: 30000});
  await firstCard.hover();

  const addButton = firstCard.getByRole("button", {name: "Add to deck"});
  await expect(addButton).toBeVisible();
  await addButton.click();

  const deckItems = page.locator(".deck-item");
  await expect(deckItems).toHaveCount(1);

  await firstCard.hover();
  const removeButton = firstCard.getByRole("button", {name: "Remove from deck"});
  await expect(removeButton).toBeVisible();
  await removeButton.click();
  await expect(deckItems).toHaveCount(0);

  const observedClasses = await page.evaluate(() => {
    const scopedWindow = window as Window & {
      __drawerClassObserver?: MutationObserver;
      __drawerObservedClasses?: string[];
    };

    scopedWindow.__drawerClassObserver?.disconnect();
    return scopedWindow.__drawerObservedClasses ?? [];
  });

  expect(observedClasses.some((className) => /is-opening|is-closing/.test(className))).toBe(false);
  await expect(surface).toHaveClass(/is-open/);
});
