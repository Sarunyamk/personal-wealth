import assert from "node:assert/strict";
import { execFileSync, execSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright-core";

function localStatus() {
  const output = execSync("pnpm dlx supabase status -o json", { encoding: "utf8" });
  return JSON.parse(output.slice(output.indexOf("{")));
}

async function waitForServer(url) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try { if ((await fetch(url)).ok) return; } catch { /* Server is still starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

const chromePath = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].find((candidate) => candidate && existsSync(candidate));
if (!chromePath) throw new Error("Chrome was not found. Set CHROME_PATH before running this test.");

const root = process.cwd();
const status = localStatus();
const service = createClient(status.API_URL, status.SERVICE_ROLE_KEY || status.SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const account = {
  email: `settings-ui-${Date.now()}@example.test`,
  password: "Settings-ui-password-1",
};
let userId;
let server;
let browser;

try {
  const created = await service.auth.admin.createUser({
    email: account.email,
    password: account.password,
    email_confirm: true,
    user_metadata: { display_name: "Before Settings" },
  });
  if (created.error) throw created.error;
  userId = created.data.user.id;

  execFileSync(process.execPath, ["scripts/build-site.mjs"], {
    cwd: root,
    env: {
      ...process.env,
      GITHUB_SHA: "settings-ui-smoke",
      VITE_SUPABASE_URL: status.API_URL,
      VITE_SUPABASE_PUBLISHABLE_KEY: status.PUBLISHABLE_KEY || status.ANON_KEY,
    },
    stdio: "inherit",
  });
  server = spawn(process.execPath, [path.join(root, "scripts", "serve.mjs")], {
    cwd: path.join(root, "dist"),
    env: { ...process.env, PORT: "4192" },
    stdio: "ignore",
  });
  const baseUrl = "http://127.0.0.1:4192/";
  await waitForServer(baseUrl);

  browser = await chromium.launch({ executablePath: chromePath, headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.setItem("personal-wealth:onboarding", JSON.stringify({ completed: true })));
  await page.locator('[name="email"]').fill(account.email);
  await page.locator('[name="password"]').fill(account.password);
  await page.locator('[data-auth-form] [type="submit"]').click();
  await page.locator('[data-nav-view="settings"]').waitFor();
  await page.locator("[data-global-loading]").waitFor({ state: "hidden" });
  await page.locator('[data-nav-view="settings"]').click();
  const form = page.locator("[data-profile-settings-form]");
  try {
  await form.waitFor({ timeout: 10_000 });
  } catch (error) {
    const diagnostics = {
      url: page.url(),
      pageText: (await page.locator("main").textContent()).replace(/\s+/g, " ").trim(),
      errors,
    };
    throw new Error(`Settings view did not render: ${JSON.stringify(diagnostics)}`, { cause: error });
  }
  await page.locator("[data-global-loading]").waitFor({ state: "hidden" });
  await form.locator('[name="displayName"]').fill("After Settings");
  await form.locator('[name="baseCurrency"]').selectOption("USD");
  assert.equal(await form.locator('[name="displayName"]').inputValue(), "After Settings");

  const startedAt = Date.now();
  let requestBody;
  const responsePromise = page.waitForResponse((response) =>
    response.request().method() === "PATCH" && response.url().includes("/rest/v1/profiles")
      ? (requestBody = response.request().postData(), true)
      : false,
    { timeout: 10_000 },
  ).catch(() => null);
  await form.locator('[type="submit"]').click();
  const response = await responsePromise;
  if (!response) {
    const diagnostics = await form.evaluate((element) => ({
      valid: element.checkValidity(),
      submitting: element.dataset.submitting ?? null,
      buttonDisabled: element.querySelector('[type="submit"]')?.disabled,
      error: element.querySelector('[role="alert"]')?.textContent,
      errorHidden: element.querySelector('[role="alert"]')?.hidden,
    }));
    throw new Error(`Settings form did not send PATCH: ${JSON.stringify({ diagnostics, errors })}`);
  }
  assert.equal(response.ok(), true, `Settings PATCH returned ${response.status()}: ${await response.text()}`);
  await page.waitForFunction(() => !document.querySelector("[data-profile-settings-form]")?.dataset.submitting);
  await page.locator("[data-global-loading]").waitFor({ state: "hidden" });
  const elapsedMs = Date.now() - startedAt;
  assert.ok(elapsedMs < 5_000, `Settings save took ${elapsedMs}ms locally`);
  const readback = await service.from("profiles").select("display_name,base_currency").eq("id", userId).single();
  if (readback.error) throw readback.error;
  const uiState = await page.evaluate(() => ({
    name: document.querySelector("[data-profile-name]")?.textContent,
    currency: document.querySelector(".sidebar__profile-meta")?.textContent,
    profile: globalThis.__CURRENT_PROFILE__,
    formError: document.querySelector("[data-profile-settings-form] [role='alert']")?.textContent,
  }));
  assert.equal(uiState.name, "After Settings", JSON.stringify({ requestBody, uiState, readback: readback.data, errors }));
  assert.match(uiState.currency, /^USD/, JSON.stringify({ uiState, readback: readback.data, errors }));
  assert.deepEqual(readback.data, { display_name: "After Settings", base_currency: "USD" });
  assert.deepEqual(errors, []);
  console.log(`Settings UI smoke passed in ${elapsedMs}ms with database readback.`);
} finally {
  await browser?.close();
  server?.kill();
  if (userId) await service.auth.admin.deleteUser(userId);
}
