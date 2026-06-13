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
    omzetToday: data.omzetToday,
    transactionCount: data.transactionCount,
    lowStock: data.lowStock,
    notifications: data.notifications,
    topItems: data.topItems.map((item) => ({ menuName: item.menuName, _sum: { quantity: item.qty, lineTotal: item.total } })),
    payment: { cash: data.cashPayment, qris: data.qrisPayment },
    filters: {
      year: selectedYear,
      availableYears: ensureYear(data.availableYears.map(Number), selectedYear)
    },
    salesChart: buildSalesChart(data.paidTransactions, filters.chartMode ?? "monthly", selectedYear)
  };
}

export async function getReports(from: string, to: string) {
  const params = [`${from}T00:00:00.000Z`, `${to}T23:59:59.999Z`];
  return { ...(await analyticsRepository.listReportTransactions(params)), range: { from, to } };
}

function buildSalesChart(paid: any[], mode: string, year: number) {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

  if (mode === "yearly") {
    const years = Array.from({ length: 5 }, (_, i) => year - 4 + i);
    return {
      mode,
      title: "Omzet Tahunan",
      rows: years.map((itemYear) => summarizeBucket(String(itemYear), paid.filter((trx) => trx.paidAt.slice(0, 4) === String(itemYear))))
    };
  }

  if (mode === "quarterly") {
    return {
      mode,
      title: `Omzet Per Kuartal ${year}`,
      rows: [1, 2, 3, 4].map((quarter) => {
        const txs = paid.filter((trx) => {
          const trxYear = Number(trx.paidAt.slice(0, 4));
          const month = Number(trx.paidAt.slice(5, 7));
          return trxYear === year && Math.ceil(month / 3) === quarter;
        });
        return summarizeBucket(`Q${quarter}`, txs);
      })
    };
  }

  return {
    mode: "monthly",
    title: `Omzet Bulanan ${year}`,
    rows: monthNames.map((label, index) => {
      const month = String(index + 1).padStart(2, "0");
      return summarizeBucket(label, paid.filter((trx) => trx.paidAt.startsWith(`${year}-${month}`)));
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

function summarizeBucket(label: string, txs: any[]) {
  return {
    label,
    omzet: txs.reduce((sum, trx) => sum + Number(trx.total || 0), 0),
    transactions: txs.length,
    cash: txs.filter((trx) => trx.paymentMethod === "TUNAI").reduce((sum, trx) => sum + Number(trx.total || 0), 0),
    qris: txs.filter((trx) => trx.paymentMethod === "QRIS").reduce((sum, trx) => sum + Number(trx.total || 0), 0)
  };
}
