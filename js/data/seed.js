export const EMPTY_SEED = Object.freeze({
  assets: Object.freeze([]),
  liabilities: Object.freeze([]),
  goals: Object.freeze([]),
  goalContributions: Object.freeze([]),
  snapshots: Object.freeze([]),
  transactions: Object.freeze([]),
  monthlyRecords: Object.freeze([]),
  budgets: Object.freeze([]),
  recurringTransactions: Object.freeze([]),
});

const DEMO_MONTHS = Object.freeze([
  "2026-04", "2026-05", "2026-06", "2026-07", "2026-08",
  "2026-09", "2026-10", "2026-11", "2026-12",
]);

const BASE_EXPENSES = Object.freeze([
  ["ประกันสังคม", "insurance", 850],
  ["ห้องพัก", "housing", 2200],
  ["กิน", "food", 3000],
  ["อื่นๆ", "other", 4000],
  ["ค่าหวย", "lottery", 1000],
  ["ประกันชีวิตม้า", "insurance", 2200],
  ["ค่าเน็ต+หวย", "utilities", 1000],
]);

function demoTransferRows(monthIndex) {
  return [
    ["เงินไทยพาณิชย์", "provident-fund", monthIndex === 3 ? 8000 : 3000],
    ["Dime and ETF", "etf", monthIndex >= 2 ? 2000 : 0],
    ["กรุงเทพ สะสมทอง", "gold", 5000],
    ["คริปโต้", "crypto", 5000],
    ["UOB arty", "family-savings", 1000],
    ["ผู้ป้อนค่าทำฟัน", "dental-fund", 1000],
    ["เงินเที่ยว", "travel-fund", monthIndex === 0 ? 3000 : 1000],
  ].filter(([, , amount]) => amount > 0);
}

function createDemoTransactions() {
  let sequence = 0;
  const rows = [];
  for (const [monthIndex, month] of DEMO_MONTHS.entries()) {
    const entries = [
      ["income", "เงินเดือน", "salary", 25000],
      ...demoTransferRows(monthIndex).map(([name, category, amount]) => ["transfer", name, category, amount]),
      ...BASE_EXPENSES.map(([name, category, amount]) => ["expense", name, category, amount]),
      ...(monthIndex >= 3 ? [["expense", "ม้า", "family", 5500]] : []),
    ];
    for (const [type, name, category, amount] of entries) {
      sequence += 1;
      rows.push(Object.freeze({
        id: `70000000-0000-4000-8000-${String(sequence).padStart(12, "0")}`,
        type, name, category, amount, transactionDate: `${month}-01`, note: null,
        isActive: true, createdAt: `${month}-01T00:00:00.000Z`, updatedAt: `${month}-01T00:00:00.000Z`,
      }));
    }
  }
  return Object.freeze(rows);
}

function createDemoBudgets(transactions) {
  const grouped = new Map();
  for (const transaction of transactions) {
    const month = transaction.transactionDate.slice(0, 7);
    const key = `${month}:${transaction.type}:${transaction.category}`;
    const current = grouped.get(key) ?? { month, type: transaction.type, category: transaction.category, plannedAmount: 0 };
    current.plannedAmount += transaction.amount;
    grouped.set(key, current);
  }
  return Object.freeze([...grouped.values()].map((budget, index) => Object.freeze({
    id: `71000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    ...budget, createdAt: `${budget.month}-01T00:00:00.000Z`, updatedAt: `${budget.month}-01T00:00:00.000Z`,
  })));
}

const DEMO_TRANSACTIONS = createDemoTransactions();
const DEMO_BUDGETS = createDemoBudgets(DEMO_TRANSACTIONS);

export const DEMO_SEED = Object.freeze({
  goalContributions: Object.freeze([]),
  transactions: DEMO_TRANSACTIONS,
  monthlyRecords: Object.freeze([]),
  budgets: DEMO_BUDGETS,
  recurringTransactions: Object.freeze([]),
  assets: Object.freeze([
    Object.freeze({
      id: "10000000-0000-4000-8000-000000000001",
      name: "Emergency Savings",
      category: "cash",
      currentValue: 300000,
      currency: "THB",
      liquidityLevel: "high",
      isActive: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    }),
    Object.freeze({
      id: "10000000-0000-4000-8000-000000000002",
      name: "Investment Portfolio",
      category: "investment",
      currentValue: 800000,
      currency: "THB",
      liquidityLevel: "medium",
      isActive: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    }),
    Object.freeze({
      id: "10000000-0000-4000-8000-000000000003",
      name: "Home",
      category: "property",
      currentValue: 2000000,
      currency: "THB",
      liquidityLevel: "low",
      isActive: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    }),
  ]),
  liabilities: Object.freeze([
    Object.freeze({
      id: "20000000-0000-4000-8000-000000000001",
      name: "Home Loan",
      category: "home-loan",
      originalAmount: 2500000,
      currentBalance: 707500,
      isActive: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    }),
  ]),
  assetValueHistory: Object.freeze([
    Object.freeze({
      id: "50000000-0000-4000-8000-000000000001",
      entityId: "10000000-0000-4000-8000-000000000001",
      value: 300000,
      recordedAt: "2026-08-01T00:00:00.000Z",
    }),
    Object.freeze({
      id: "50000000-0000-4000-8000-000000000002",
      entityId: "10000000-0000-4000-8000-000000000002",
      value: 800000,
      recordedAt: "2026-08-01T00:00:00.000Z",
    }),
    Object.freeze({
      id: "50000000-0000-4000-8000-000000000003",
      entityId: "10000000-0000-4000-8000-000000000003",
      value: 2000000,
      recordedAt: "2026-08-01T00:00:00.000Z",
    }),
  ]),
  liabilityValueHistory: Object.freeze([
    Object.freeze({
      id: "60000000-0000-4000-8000-000000000001",
      entityId: "20000000-0000-4000-8000-000000000001",
      balance: 707500,
      recordedAt: "2026-08-01T00:00:00.000Z",
    }),
  ]),
  goals: Object.freeze([
    Object.freeze({
      id: "30000000-0000-4000-8000-000000000001",
      name: "Emergency Fund",
      targetAmount: 300000,
      currentAmount: 215000,
      targetDate: "2027-01-31",
    }),
  ]),
  snapshots: Object.freeze([
    Object.freeze({
      id: "40000000-0000-4000-8000-000000000001",
      snapshotDate: "2026-01-01",
      totalAssets: 2800000,
      totalLiabilities: 750000,
      netWorth: 2050000,
      liquidAssets: 240000,
      investmentAssets: 680000,
    }),
    Object.freeze({
      id: "40000000-0000-4000-8000-000000000002",
      snapshotDate: "2026-02-01",
      totalAssets: 2850000,
      totalLiabilities: 745000,
      netWorth: 2105000,
      liquidAssets: 250000,
      investmentAssets: 700000,
    }),
    Object.freeze({
      id: "40000000-0000-4000-8000-000000000003",
      snapshotDate: "2026-03-01",
      totalAssets: 2900000,
      totalLiabilities: 738000,
      netWorth: 2162000,
      liquidAssets: 260000,
      investmentAssets: 720000,
    }),
    Object.freeze({
      id: "40000000-0000-4000-8000-000000000004",
      snapshotDate: "2026-04-01",
      totalAssets: 2950000,
      totalLiabilities: 730000,
      netWorth: 2220000,
      liquidAssets: 270000,
      investmentAssets: 740000,
    }),
    Object.freeze({
      id: "40000000-0000-4000-8000-000000000005",
      snapshotDate: "2026-05-01",
      totalAssets: 3000000,
      totalLiabilities: 725000,
      netWorth: 2275000,
      liquidAssets: 280000,
      investmentAssets: 760000,
    }),
    Object.freeze({
      id: "40000000-0000-4000-8000-000000000006",
      snapshotDate: "2026-06-01",
      totalAssets: 3050000,
      totalLiabilities: 718000,
      netWorth: 2332000,
      liquidAssets: 285000,
      investmentAssets: 775000,
    }),
    Object.freeze({
      id: "40000000-0000-4000-8000-000000000007",
      snapshotDate: "2026-07-01",
      totalAssets: 3070000,
      totalLiabilities: 712000,
      netWorth: 2358000,
      liquidAssets: 290000,
      investmentAssets: 790000,
    }),
    Object.freeze({
      id: "40000000-0000-4000-8000-000000000008",
      snapshotDate: "2026-08-01",
      totalAssets: 3100000,
      totalLiabilities: 707500,
      netWorth: 2392500,
      liquidAssets: 300000,
      investmentAssets: 800000,
    }),
  ]),
  activities: Object.freeze([
    Object.freeze({
      id: "70000000-0000-4000-8000-000000000001",
      entityType: "asset",
      entityId: "10000000-0000-4000-8000-000000000001",
      action: "asset_value_updated",
      value: 300000,
      createdAt: "2026-08-24T02:00:00.000Z",
    }),
    Object.freeze({
      id: "70000000-0000-4000-8000-000000000002",
      entityType: "liability",
      entityId: "20000000-0000-4000-8000-000000000001",
      action: "liability_balance_updated",
      value: 707500,
      createdAt: "2026-08-23T02:00:00.000Z",
    }),
    Object.freeze({
      id: "70000000-0000-4000-8000-000000000003",
      entityType: "asset",
      entityId: "10000000-0000-4000-8000-000000000002",
      action: "asset_updated",
      value: 800000,
      createdAt: "2026-08-21T02:00:00.000Z",
    }),
  ]),
});
