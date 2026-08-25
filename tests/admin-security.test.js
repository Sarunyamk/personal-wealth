import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../supabase/migrations/202608250001_admin_access_control.sql", import.meta.url),
  "utf8",
);
const edgeFunction = readFileSync(
  new URL("../supabase/functions/admin-users/index.ts", import.meta.url),
  "utf8",
);

test("disabled accounts are restricted from every user-owned table", () => {
  for (const table of [
    "profiles",
    "categories",
    "assets",
    "liabilities",
    "asset_value_history",
    "liability_value_history",
    "recurring_transactions",
    "transactions",
    "budgets",
    "monthly_records",
    "goals",
    "goal_contributions",
    "snapshots",
    "activities",
  ]) {
    assert.match(
      migration,
      new RegExp(`create policy [^\\n]+ on public\\.${table}[\\s\\S]+?as restrictive`),
    );
  }
  assert.match(migration, /status = 'active'/);
});

test("users cannot promote or reactivate themselves through the browser", () => {
  assert.match(migration, /revoke update on table public\.profiles from authenticated/);
  assert.match(migration, /grant update \(display_name, base_currency, theme\)/);
});

test("admin operations stay server-side and protect critical accounts", () => {
  assert.match(edgeFunction, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(edgeFunction, /SUPABASE_SECRET_KEYS/);
  assert.match(edgeFunction, /SUPABASE_PUBLISHABLE_KEYS/);
  assert.match(edgeFunction, /const \{ data: actor, error: actorError \} = await userClient/);
  assert.match(edgeFunction, /auth\.admin\.deleteUser\(userId, false\)/);
  assert.match(edgeFunction, /cannot disable or delete their own account/);
  assert.match(edgeFunction, /last active admin is protected/i);
  assert.match(edgeFunction, /ban_duration: "876000h"/);
  assert.match(edgeFunction, /ban_duration: "none"/);
});
