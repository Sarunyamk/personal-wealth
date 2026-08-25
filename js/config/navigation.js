export const NAVIGATION = Object.freeze([
  { id: "dashboard", label: "Dashboard", shortLabel: "Home", icon: "layout-dashboard" },
  { id: "assets", label: "Assets", shortLabel: "Assets", icon: "wallet-cards" },
  { id: "liabilities", label: "Liabilities", icon: "landmark" },
  { id: "transactions", label: "Transactions", icon: "receipt-text" },
  { id: "goals", label: "Goals", shortLabel: "Goals", icon: "goal" },
  { id: "reports", label: "Reports", icon: "chart-no-axes-combined" },
  { id: "settings", label: "Settings", icon: "settings" },
]);

export const PRIMARY_MOBILE_VIEWS = Object.freeze(["dashboard", "assets", "goals"]);
export const ADMIN_NAVIGATION = Object.freeze({
  id: "admin",
  label: "Admin",
  icon: "key",
});

export function getNavigationItem(viewId, navigation = NAVIGATION) {
  return navigation.find((item) => item.id === viewId) ?? navigation[0];
}

export function getViewIdFromHash(hash, navigation = NAVIGATION) {
  const requestedView = hash.replace(/^#\/?/, "");
  return navigation.some((item) => item.id === requestedView) ? requestedView : "dashboard";
}
