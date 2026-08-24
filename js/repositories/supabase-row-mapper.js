const NUMERIC_FIELDS = new Set([
  "amount",
  "assetValue",
  "balance",
  "closingCash",
  "currentAmount",
  "currentBalance",
  "currentValue",
  "difference",
  "interestRate",
  "investmentAssets",
  "liquidAssets",
  "monthlyPayment",
  "netWorth",
  "originalAmount",
  "plannedAmount",
  "purchaseValue",
  "targetAmount",
  "totalAssets",
  "totalLiabilities",
  "value",
]);

function toCamelCase(key) {
  return key.replace(/_([a-z])/g, (_, character) => character.toUpperCase());
}

function toSnakeCase(key) {
  return key.replace(/[A-Z]/g, (character) => `_${character.toLowerCase()}`);
}

export function fromSupabaseRow(row) {
  if (!row) return row;
  const record = Object.fromEntries(
    Object.entries(row)
      .filter(([key]) => key !== "user_id")
      .map(([key, value]) => {
        const mappedKey = toCamelCase(key);
        const mappedValue = value !== null && NUMERIC_FIELDS.has(mappedKey) ? Number(value) : value;
        return [mappedKey, mappedValue];
      }),
  );
  if ("reconciliationAssetId" in record) {
    const hasReconciliation = record.reconciliationAssetId !== null;
    record.reconciliation = hasReconciliation
      ? {
          assetId: record.reconciliationAssetId,
          closingCash: record.closingCash,
          assetValue: record.assetValue,
          difference: record.difference,
          reconciledAt: record.reconciledAt,
        }
      : undefined;
    for (const field of [
      "reconciliationAssetId",
      "closingCash",
      "assetValue",
      "difference",
      "reconciledAt",
    ]) {
      delete record[field];
    }
  }
  if (typeof record.month === "string") record.month = record.month.slice(0, 7);
  return record;
}

export function toSupabaseRow(record, { omit = [] } = {}) {
  const omitted = new Set(["id", "userId", "createdAt", "updatedAt", ...omit]);
  return Object.fromEntries(
    Object.entries(record)
      .filter(([key, value]) => !omitted.has(key) && value !== undefined)
      .map(([key, value]) => [toSnakeCase(key), value]),
  );
}
