import { test, expect } from "@playwright/test"

test.describe("Channel selector", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?e2e=channel-selector")
  })

  test("shows current channel and opens menu", async ({ page }) => {
    const trigger = page.getByRole("button", { name: "Red" })
    await expect(trigger).toBeVisible()

    await trigger.click()
    await expect(page.getByRole("menu")).toBeVisible()
    await expect(page.getByRole("menuitem", { name: "No channel" })).toBeVisible()
    await expect(page.getByRole("menuitem", { name: "Red" })).toBeVisible()
    await expect(page.getByRole("menuitem", { name: "Green" })).toBeVisible()
    await expect(page.getByRole("menuitem", { name: "Blue" })).toBeVisible()
  })

  test("updates the selected channel", async ({ page }) => {
    await page.getByRole("button", { name: "Red" }).click()
    await page.getByRole("menuitem", { name: "Blue" }).click()
    await expect(page.getByRole("button", { name: "Blue" })).toBeVisible()
  })

  test("clears the channel selection", async ({ page }) => {
    await page.getByRole("button", { name: "Red" }).click()
    await page.getByRole("menuitem", { name: "No channel" }).click()
    await expect(page.getByRole("button", { name: "No channel" })).toBeVisible()
  })

  test("closes the menu on outside click", async ({ page }) => {
    await page.getByRole("button", { name: "Red" }).click()
    await expect(page.getByRole("menu")).toBeVisible()

    await page.locator("div.fixed.inset-0").click()
    await expect(page.getByRole("menu")).toBeHidden()
  })
})
