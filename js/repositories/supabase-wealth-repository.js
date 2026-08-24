import { AppError, ERROR_CODES } from "../errors/app-error.js";
import { buildSupabaseImportPlan, summarizeSupabaseImport } from "../data/supabase-import.js";
import { fromSupabaseRow, toSupabaseRow } from "./supabase-row-mapper.js";

function databaseError(error, context) {
  if (!error) return null;
  const code =
    error.code === "PGRST116" || error.code === "P0002"
      ? ERROR_CODES.NOT_FOUND
      : error.code === "23505"
        ? ERROR_CODES.CONFLICT
        : /^(22|23)/.test(error.code ?? "")
          ? ERROR_CODES.VALIDATION
          : ERROR_CODES.STORAGE;
  return new AppError(code, `${context} failed.`, {
    cause: error,
    details: [error.message, error.details, error.hint].filter(Boolean),
  });
}

async function resultOf(query, context) {
  const { data, error } = await query;
  if (error) throw databaseError(error, context);
  return data;
}

function mapMany(rows) {
  return (rows ?? []).map(fromSupabaseRow);
}

function monthDate(month) {
  return /^\d{4}-\d{2}$/.test(month) ? `${month}-01` : month;
}

export function createSupabaseWealthRepository(client) {
  if (!client?.from || !client?.rpc) throw new TypeError("A Supabase client is required.");

  async function list(table, configure = (query) => query) {
    const query = configure(client.from(table).select("*"));
    return mapMany(await resultOf(query, `List ${table}`));
  }

  async function get(table, id) {
    const row = await resultOf(
      client.from(table).select("*").eq("id", id).single(),
      `Get ${table}`,
    );
    return fromSupabaseRow(row);
  }

  async function insert(table, input) {
    const row = await resultOf(
      client.from(table).insert(toSupabaseRow(input)).select("*").single(),
      `Create ${table}`,
    );
    return fromSupabaseRow(row);
  }

  async function update(table, id, changes) {
    const row = await resultOf(
      client.from(table).update(toSupabaseRow(changes)).eq("id", id).select("*").single(),
      `Update ${table}`,
    );
    return fromSupabaseRow(row);
  }

  async function deactivate(table, id) {
    return update(table, id, { isActive: false });
  }

  async function rpc(name, parameters) {
    return fromSupabaseRow(await resultOf(client.rpc(name, parameters), `RPC ${name}`));
  }

  return Object.freeze({
    listAssets: ({ includeInactive = false } = {}) =>
      list("assets", (query) =>
        (includeInactive ? query : query.eq("is_active", true)).order("created_at"),
      ),
    getAsset: (id) => get("assets", id),
    createAsset: (input) => insert("assets", input),
    updateAsset: (id, changes) => update("assets", id, changes),
    deactivateAsset: (id) => deactivate("assets", id),
    updateAssetValue: (id, value) =>
      rpc("record_asset_value", { p_asset_id: id, p_value: value }),
    listAssetValueHistory: (assetId) =>
      list("asset_value_history", (query) =>
        query.eq("asset_id", assetId).order("recorded_at", { ascending: false }),
      ),

    listLiabilities: ({ includeInactive = false } = {}) =>
      list("liabilities", (query) =>
        (includeInactive ? query : query.eq("is_active", true)).order("created_at"),
      ),
    getLiability: (id) => get("liabilities", id),
    createLiability: (input) => insert("liabilities", input),
    updateLiability: (id, changes) => update("liabilities", id, changes),
    deactivateLiability: (id) => deactivate("liabilities", id),
    updateLiabilityBalance: (id, balance) =>
      rpc("record_liability_balance", { p_liability_id: id, p_balance: balance }),
    listLiabilityValueHistory: (liabilityId) =>
      list("liability_value_history", (query) =>
        query.eq("liability_id", liabilityId).order("recorded_at", { ascending: false }),
      ),

    listActivities: ({ limit = 20 } = {}) =>
      list("activities", (query) =>
        query.order("created_at", { ascending: false }).limit(limit),
      ),
    listTransactions: ({ includeInactive = false } = {}) =>
      list("transactions", (query) =>
        (includeInactive ? query : query.eq("is_active", true)).order("transaction_date", {
          ascending: false,
        }),
      ),
    createTransaction: (input) => insert("transactions", input),
    deactivateTransaction: (id) => deactivate("transactions", id),

    listBudgets: ({ month } = {}) =>
      list("budgets", (query) =>
        (month ? query.eq("month", monthDate(month)) : query).order("category"),
      ),
    async upsertBudget(input) {
      const payload = toSupabaseRow({ ...input, month: monthDate(input.month) });
      const row = await resultOf(
        client
          .from("budgets")
          .upsert(payload, { onConflict: "user_id,month,type,category" })
          .select("*")
          .single(),
        "Upsert budget",
      );
      return fromSupabaseRow(row);
    },

    listRecurringTransactions: ({ includeInactive = false } = {}) =>
      list("recurring_transactions", (query) =>
        (includeInactive ? query : query.eq("is_active", true)).order("created_at"),
      ),
    createRecurringTransaction: (input) =>
      insert("recurring_transactions", {
        ...input,
        startMonth: monthDate(input.startMonth),
        endMonth: input.endMonth ? monthDate(input.endMonth) : null,
      }),
    deactivateRecurringTransaction: (id) => deactivate("recurring_transactions", id),
    async materializeRecurringTransactions(month) {
      const data = await resultOf(
        client.rpc("materialize_recurring_transactions", { p_month: monthDate(month) }),
        "Materialize recurring transactions",
      );
      return mapMany(data);
    },

    async getMonthlyRecord(month) {
      const { data, error } = await client
        .from("monthly_records")
        .select("*")
        .eq("month", monthDate(month))
        .maybeSingle();
      if (error) throw databaseError(error, "Get monthly record");
      return data ? fromSupabaseRow(data) : { month, status: "draft", closedAt: null };
    },
    async setMonthStatus(month, status) {
      const payload = {
        month: monthDate(month),
        status,
        closed_at: status === "closed" ? new Date().toISOString() : null,
      };
      const row = await resultOf(
        client
          .from("monthly_records")
          .upsert(payload, { onConflict: "user_id,month" })
          .select("*")
          .single(),
        "Set month status",
      );
      return fromSupabaseRow(row);
    },
    async setMonthReconciliation(month, input) {
      const asset = await get("assets", input.assetId);
      const closingCash = Number(input.closingCash);
      const payload = {
        month: monthDate(month),
        reconciliation_asset_id: asset.id,
        closing_cash: closingCash,
        asset_value: asset.currentValue,
        difference: closingCash - asset.currentValue,
        reconciled_at: new Date().toISOString(),
      };
      const row = await resultOf(
        client
          .from("monthly_records")
          .upsert(payload, { onConflict: "user_id,month" })
          .select("*")
          .single(),
        "Set month reconciliation",
      );
      return fromSupabaseRow(row);
    },

    listGoals: () => list("goals", (query) => query.order("created_at")),
    getGoal: (id) => get("goals", id),
    createGoal: (input) => insert("goals", input),
    updateGoal: (id, changes) => update("goals", id, changes),
    async completeGoal(id) {
      const goal = await get("goals", id);
      return update("goals", id, { currentAmount: goal.targetAmount, isCompleted: true });
    },
    async contributeToGoal(id, input) {
      const goal = await rpc("contribute_to_goal", {
        p_goal_id: id,
        p_amount: input.amount,
        p_contribution_date: input.contributionDate,
        p_note: input.note ?? null,
      });
      return { goal, contribution: null };
    },
    listGoalContributions: (goalId) =>
      list("goal_contributions", (query) =>
        query.eq("goal_id", goalId).order("contribution_date", { ascending: false }),
      ),

    listSnapshots: () =>
      list("snapshots", (query) => query.order("snapshot_date", { ascending: true })),
    async upsertSnapshot(input) {
      const existing = await list("snapshots", (query) =>
        query.eq("snapshot_date", monthDate(input.snapshotDate)).limit(1),
      );
      const snapshot = await rpc("upsert_wealth_snapshot", {
        p_snapshot_date: input.snapshotDate,
        p_total_assets: input.totalAssets,
        p_total_liabilities: input.totalLiabilities,
        p_liquid_assets: input.liquidAssets,
        p_investment_assets: input.investmentAssets,
      });
      const previous = existing[0];
      const changed =
        !previous ||
        ["totalAssets", "totalLiabilities", "netWorth", "liquidAssets", "investmentAssets"].some(
          (field) => previous[field] !== snapshot[field],
        );
      return { snapshot, created: !previous, changed };
    },
    async importLocalData(database) {
      const plan = buildSupabaseImportPlan(database);
      for (const { table, rows } of plan) {
        for (let offset = 0; offset < rows.length; offset += 100) {
          await resultOf(
            client.from(table).upsert(rows.slice(offset, offset + 100), { onConflict: "id" }),
            `Import ${table}`,
          );
        }
      }
      return summarizeSupabaseImport(plan);
    },
  });
}

export { databaseError };
