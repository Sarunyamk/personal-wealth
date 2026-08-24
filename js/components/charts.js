import { formatCompactCurrency, formatCurrency } from "../utils/formatters.js";

let activeCharts = [];

function destroyCharts() {
  activeCharts.forEach((chart) => chart.destroy());
  activeCharts = [];
}

function color(token, fallback) {
  return getComputedStyle(document.documentElement).getPropertyValue(token).trim() || fallback;
}

function moneyLabel(value, isPrivate, compact = false) {
  if (isPrivate) return "฿••••••";
  return compact ? formatCompactCurrency(value) : formatCurrency(value);
}

export function mountDashboardCharts({ snapshots, allocation, isPrivate }) {
  destroyCharts();
  const Chart = globalThis.Chart;
  if (!Chart) return false;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const trendCanvas = document.querySelector("[data-net-worth-chart]");
  const allocationCanvas = document.querySelector("[data-allocation-chart]");

  if (trendCanvas && snapshots.length > 0) {
    activeCharts.push(
      new Chart(trendCanvas, {
        type: "line",
        data: {
          labels: snapshots.map((snapshot) =>
            new Intl.DateTimeFormat("th-TH", { month: "short", year: "2-digit" }).format(
              new Date(`${snapshot.snapshotDate}T00:00:00Z`),
            ),
          ),
          datasets: [
            {
              data: snapshots.map((snapshot) => snapshot.netWorth),
              borderColor: color("--color-primary", "#4b47a8"),
              backgroundColor: color("--color-surface-accent", "#ebe8fb"),
              borderWidth: 2.5,
              pointRadius: snapshots.length === 1 ? 4 : 2,
              pointHoverRadius: 5,
              tension: 0.32,
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: reducedMotion ? false : { duration: 350 },
          interaction: { intersect: false, mode: "index" },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: { label: (context) => moneyLabel(context.parsed.y, isPrivate) },
            },
          },
          scales: {
            x: { grid: { display: false } },
            y: {
              border: { display: false },
              grid: { color: color("--color-border", "#dfdce5") },
              ticks: { callback: (value) => moneyLabel(value, isPrivate, true) },
            },
          },
        },
      }),
    );
  }

  if (allocationCanvas && allocation.length > 0) {
    const palette = ["#16856b", "#6d57c7", "#bd6a2a", "#2676bb", "#c94c5c", "#817b89"];
    activeCharts.push(
      new Chart(allocationCanvas, {
        type: "doughnut",
        data: {
          labels: allocation.map((item) => item.category),
          datasets: [
            {
              data: allocation.map((item) => item.value),
              backgroundColor: allocation.map((_, index) => palette[index % palette.length]),
              borderColor: color("--color-surface", "#ffffff"),
              borderWidth: 3,
              hoverOffset: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "68%",
          animation: reducedMotion ? false : { duration: 350 },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const item = allocation[context.dataIndex];
                  return `${context.label}: ${moneyLabel(item.value, isPrivate)} (${item.percentage.toFixed(1)}%)`;
                },
              },
            },
          },
        },
      }),
    );
  }

  return activeCharts.length > 0;
}

export function unmountDashboardCharts() {
  destroyCharts();
}

export function mountAnnualReportCharts({ months, snapshots, expenseCategories, isPrivate }) {
  destroyCharts();
  const Chart = globalThis.Chart;
  if (!Chart) return false;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sharedOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: reducedMotion ? false : { duration: 350 },
    interaction: { intersect: false, mode: "index" },
    plugins: { tooltip: { callbacks: { label: (context) => `${context.dataset.label}: ${moneyLabel(context.parsed.y, isPrivate)}` } } },
    scales: { x: { grid: { display: false } }, y: { border: { display: false }, ticks: { callback: (value) => moneyLabel(value, isPrivate, true) } } },
  };
  const cashflowCanvas = document.querySelector("[data-annual-cashflow-chart]");
  if (cashflowCanvas) activeCharts.push(new Chart(cashflowCanvas, {
    type: "bar",
    data: {
      labels: months.map((item) => item.month.slice(5)),
      datasets: [
        { label: "รายรับ", data: months.map((item) => item.income), backgroundColor: color("--color-positive", "#08765e") },
        { label: "รายจ่าย", data: months.map((item) => item.expense), backgroundColor: color("--color-danger", "#b93e4f") },
      ],
    }, options: sharedOptions,
  }));
  const networthCanvas = document.querySelector("[data-annual-networth-chart]");
  if (networthCanvas && snapshots.length) activeCharts.push(new Chart(networthCanvas, {
    type: "line",
    data: { labels: snapshots.map((item) => item.snapshotDate.slice(5, 7)), datasets: [{ label: "Net Worth", data: snapshots.map((item) => item.netWorth), borderColor: color("--color-primary", "#4b47a8"), backgroundColor: color("--color-surface-accent", "#ebe8fb"), fill: true, tension: 0.3 }] },
    options: sharedOptions,
  }));
  const expenseCanvas = document.querySelector("[data-annual-expense-chart]");
  if (expenseCanvas && expenseCategories.length) {
    const palette = ["#c94c5c", "#bd6a2a", "#2676bb", "#6d57c7", "#16856b", "#817b89"];
    activeCharts.push(new Chart(expenseCanvas, {
      type: "doughnut",
      data: {
        labels: expenseCategories.map((item) => item.category),
        datasets: [{ data: expenseCategories.map((item) => item.amount), backgroundColor: expenseCategories.map((_, index) => palette[index % palette.length]), borderColor: color("--color-surface", "#ffffff"), borderWidth: 2 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "62%",
        animation: reducedMotion ? false : { duration: 350 },
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => `${context.label}: ${moneyLabel(context.parsed, isPrivate)}` } } },
      },
    }));
  }
  return activeCharts.length > 0;
}
