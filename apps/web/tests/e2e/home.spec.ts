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

test("new run dialog can parse a screenshot and save a build", async ({page}) => {
  await page.goto("/decks");

  await page.getByRole("button", {name: "New run"}).click();
  await expect(page.getByRole("dialog", {name: "New run"})).toBeVisible();

  const fileInput = page.locator(".run-build-hidden-input");
  await fileInput.setInputFiles(path.join(process.cwd(), "public", "source-cropped-2.png"));

  const saveButton = page.getByRole("button", {name: "Save build"});
  await expect(saveButton).toBeEnabled({timeout: 30000});

  await saveButton.click();

  await expect(page.getByRole("dialog", {name: "New run"})).not.toBeVisible();
  await expect(page.getByRole("heading", {name: /^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday) \d{2}:\d{2}$/})).toBeVisible({timeout: 10000});
});
