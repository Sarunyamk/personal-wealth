export const EMPTY_SEED = Object.freeze({
  assets: Object.freeze([]),
  liabilities: Object.freeze([]),
  goals: Object.freeze([]),
  snapshots: Object.freeze([]),
});

export const DEMO_SEED = Object.freeze({
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
      snapshotDate: "2026-08-01",
      totalAssets: 3100000,
      totalLiabilities: 707500,
      netWorth: 2392500,
      liquidAssets: 300000,
      investmentAssets: 800000,
    }),
  ]),
});
