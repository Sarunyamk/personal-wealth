import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:http";
import AxeBuilder from "@axe-core/playwright";
import { chromium } from "playwright-core";

const chromePath = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].find((path) => path && existsSync(path));
if (!chromePath) throw new Error("Chrome was not found. Set CHROME_PATH before running E2E tests.");
const routes = ["dashboard", "assets", "liabilities", "transactions", "goals", "reports", "settings"];

async function availablePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

async function waitForServer(url) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // The child server may still be binding its port.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function verifyViewport(browser, baseUrl, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });

  for (const route of routes) {
    await page.goto(`${baseUrl}#${route}`, { waitUntil: "networkidle" });
    const pageContent = page.locator("[data-page]");
    await pageContent.waitFor();
    await pageContent.evaluate((element) =>
      Promise.all(element.getAnimations().map((animation) => animation.finished)),
    );
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    assert.ok(overflow <= 1, `${route} overflows viewport ${viewport.width}px by ${overflow}px`);

    const accessibility = await new AxeBuilder({ page }).analyze();
    const blockingViolations = accessibility.violations.filter(
      ({ impact }) => impact === "critical" || impact === "serious",
    );
    assert.deepEqual(
      blockingViolations.map(({ id, impact, nodes }) => ({
        id,
        impact,
        nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })),
      })),
      [],
      `${route} has blocking accessibility violations at ${viewport.width}px`,
    );
  }

  if (viewport.width >= 1024) {
    for (const route of ["dashboard", "reports", "dashboard", "reports"]) {
      await page.goto(`${baseUrl}#${route}`, { waitUntil: "networkidle" });
      await page.locator("[data-page]").waitFor();
      const chartCounts = await page.evaluate(() => ({
        canvases: document.querySelectorAll("canvas").length,
        instances: globalThis.Chart ? Object.keys(globalThis.Chart.instances).length : 0,
      }));
      assert.equal(
        chartCounts.instances,
        chartCounts.canvases,
        `${route} leaked Chart.js instances`,
      );
    }
    await page.goto(`${baseUrl}#assets`, { waitUntil: "networkidle" });
    assert.equal(
      await page.evaluate(() => Object.keys(globalThis.Chart?.instances ?? {}).length),
      0,
      "Charts were not destroyed after leaving a chart route",
    );
  }

  await page.goto(`${baseUrl}#dashboard`, { waitUntil: "networkidle" });
  await page.locator("[data-privacy-toggle]").click();
  const sensitiveValues = await page.locator("[data-sensitive]").allTextContents();
  assert.ok(sensitiveValues.length > 0, "Dashboard has no sensitive values to verify");
  assert.ok(sensitiveValues.every((value) => value.includes("•")), "Privacy Mode leaked a visible amount");

  if (viewport.width < 1024) {
    const quickAddButton = page.locator("[data-quick-add-open]");
    await quickAddButton.focus();
    assert.equal(await quickAddButton.evaluate((element) => element === document.activeElement), true);
    await page.keyboard.press("Enter");
    await page.locator("[data-quick-add-dialog][open]").waitFor();
    assert.equal(await page.locator("[data-quick-add]").count(), 4);
    await page.keyboard.press("Escape");
    await page.locator("[data-quick-add-dialog][open]").waitFor({ state: "detached" });
    assert.equal(await quickAddButton.evaluate((element) => element === document.activeElement), true);
  }

  assert.deepEqual(errors, []);
  await context.close();
}

async function verifyAuthGuard(browser, baseUrl) {
  const context = await browser.newContext({ viewport: { width: 360, height: 800 } });
  const page = await context.newPage();
  await page.route("**/config.js", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `globalThis.__APP_CONFIG__ = Object.freeze({
        supabaseUrl: "https://example.supabase.co",
        supabasePublishableKey: "test-publishable-key"
      });`,
    }),
  );
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.locator("[data-auth-form][data-mode=\"login\"]").waitFor();
  assert.equal(await page.locator(".app-shell:visible").count(), 0, "Anonymous session exposed app shell");
  const accessibility = await new AxeBuilder({ page }).analyze();
  assert.deepEqual(
    accessibility.violations
      .filter(({ impact }) => impact === "critical" || impact === "serious")
      .map(({ id }) => id),
    [],
    "Auth guard has blocking accessibility violations",
  );
  await context.close();
}

const port = await availablePort();
const baseUrl = `http://127.0.0.1:${port}/`;
const server = spawn(process.execPath, ["scripts/serve.mjs"], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe"],
});
let browser;
try {
  await waitForServer(baseUrl);
  browser = await chromium.launch({ executablePath: chromePath, headless: true });
  await verifyViewport(browser, baseUrl, { width: 1440, height: 900 });
  await verifyViewport(browser, baseUrl, { width: 360, height: 800 });
  await verifyAuthGuard(browser, baseUrl);
  console.log("E2E smoke passed at 1440x900 and 360x800.");
} finally {
  await browser?.close();
  server.kill();
}
