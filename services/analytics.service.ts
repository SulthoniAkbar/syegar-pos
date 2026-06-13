import * as analyticsRepository from "@/repositories/analytics.repository";

const today = () => new Date().toISOString().slice(0, 10);
const currentYear = () => new Date().getFullYear();

type DashboardFilters = {
  chartMode?: string | null;
  year?: string | null;
};

export async function getDashboard(filters: DashboardFilters = {}) {
  const selectedYear = normalizeYear(filters.year);
  const todayRange = buildTodayRange();
  const yearRange = buildYearRange(selectedYear);
  const chartRange = buildChartRange(filters.chartMode ?? "monthly", selectedYear);
  const data = await analyticsRepository.getDashboardBase(todayRange.from, todayRange.to, yearRange.from, yearRange.to, chartRange.from, chartRange.to);
  return {
    omzetToday: Number(data.todaySummary.omzet ?? 0),
    transactionCount: Number(data.todaySummary.count ?? 0),
    lowStock: data.lowStock,
    menusWithoutRecipes: data.menusWithoutRecipes.map((menu: any) => ({ id: menu.id, name: menu.name, category: { name: menu.categoryName } })),
    notifications: data.notifications,
    topItems: data.topItems.map((item) => ({ menuName: item.menuName, _sum: { quantity: item.qty, lineTotal: item.total } })),
    payment: { cash: Number(data.todaySummary.cash ?? 0), qris: Number(data.todaySummary.qris ?? 0) },
    filters: {
      year: selectedYear,
      availableYears: ensureYear(data.availableYears.map(Number), selectedYear)
    },
    salesChart: buildSalesChart(data.chartRows, filters.chartMode ?? "monthly", selectedYear)
  };
}

export async function getReports(from: string, to: string) {
  const params = [`${from}T00:00:00.000Z`, `${to}T23:59:59.999Z`];
  return { ...(await analyticsRepository.listReportTransactions(params)), range: { from, to } };
}

function buildSalesChart(rows: any[], mode: string, year: number) {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

  if (mode === "yearly") {
    const years = Array.from({ length: 5 }, (_, i) => year - 4 + i);
    return {
      mode,
      title: "Omzet Tahunan",
      rows: years.map((itemYear) => summarizeBucket(String(itemYear), rows.filter((row) => row.year === String(itemYear))))
    };
  }

  if (mode === "quarterly") {
    return {
      mode,
      title: `Omzet Per Kuartal ${year}`,
      rows: [1, 2, 3, 4].map((quarter) => {
        return summarizeBucket(`Q${quarter}`, rows.filter((row) => row.year === String(year) && Number(row.quarter) === quarter));
      })
    };
  }

  return {
    mode: "monthly",
    title: `Omzet Bulanan ${year}`,
    rows: monthNames.map((label, index) => {
      const month = String(index + 1).padStart(2, "0");
      return summarizeBucket(label, rows.filter((row) => row.month === `${year}-${month}`));
    })
  };
}

function normalizeYear(value?: string | null) {
  const year = Number(value);
  return Number.isInteger(year) && year >= 2020 && year <= 2100 ? year : currentYear();
}

function buildTodayRange() {
  return {
    from: `${today()}T00:00:00.000Z`,
    to: `${today()}T23:59:59.999Z`
  };
}

function buildYearRange(year: number) {
  return { from: `${year}-01-01T00:00:00.000Z`, to: `${year}-12-31T23:59:59.999Z` };
}

function buildChartRange(mode: string, year: number) {
  if (mode === "yearly") {
    return { from: `${year - 4}-01-01T00:00:00.000Z`, to: `${year}-12-31T23:59:59.999Z` };
  }
  return { from: `${year}-01-01T00:00:00.000Z`, to: `${year}-12-31T23:59:59.999Z` };
}

function ensureYear(years: number[], selectedYear: number) {
  return Array.from(new Set([...years, selectedYear, currentYear()])).sort((a, b) => b - a);
}

function summarizeBucket(label: string, rows: any[]) {
  return {
    label,
    omzet: rows.reduce((sum, row) => sum + Number(row.omzet || 0), 0),
    transactions: rows.reduce((sum, row) => sum + Number(row.transactions || 0), 0),
    cash: rows.reduce((sum, row) => sum + Number(row.cash || 0), 0),
    qris: rows.reduce((sum, row) => sum + Number(row.qris || 0), 0)
  };
}
