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
