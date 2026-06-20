import { expect, test } from "@playwright/test";

test("public app smoke", async ({ page, request }) => {
  const health = await request.get("/api/health");
  expect(health.ok()).toBe(true);
  await expect(await health.json()).toEqual(expect.objectContaining({ ok: true, service: "soltip" }));

  await page.goto("/");
  await expect(page.getByRole("link", { name: "SolTip home" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Developers" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Profile" }).first()).toBeVisible();

  await page.goto("/profile");
  await expect(page.getByText("Not signed in")).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
});
