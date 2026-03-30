import {expect, test} from "@playwright/test";

test("homepage redirects to the builds library", async ({page}) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/decks$/);
  await expect(page.getByRole("heading", {name: "Your library"})).toBeVisible();
  await expect(page.getByRole("button", {name: "Create new build"})).toBeVisible();
  await expect(page.getByRole("link", {name: "My Builds"})).toHaveClass(/is-active/);
});
