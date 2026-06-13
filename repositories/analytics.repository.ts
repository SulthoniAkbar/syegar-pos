import { db, rows, scalar } from "@/lib/database";

export async function getDashboardBase(todayFrom: string, todayTo: string, topFrom: string, topTo: string, chartFrom: string, chartTo: string) {
  const database = await db();
  const [todaySummary, lowStock, notificationCounts, topItems, chartRows, menusWithoutRecipes, availableYears] = await Promise.all([
    rows<any>(database, "SELECT COALESCE(SUM(total),0) AS omzet, COUNT(*) AS count, COALESCE(SUM(CASE WHEN paymentMethod='TUNAI' THEN total ELSE 0 END),0) AS cash, COALESCE(SUM(CASE WHEN paymentMethod='QRIS' THEN total ELSE 0 END),0) AS qris FROM transactions WHERE paidAt BETWEEN ? AND ? AND status='PAID'", [todayFrom, todayTo]).then((items) => items[0] ?? { omzet: 0, count: 0, cash: 0, qris: 0 }),
    rows<any>(database, "SELECT id, name, unit, currentStock, minimumStock, COUNT(*) OVER() AS totalCount FROM ingredients WHERE active=1 AND currentStock <= minimumStock ORDER BY currentStock ASC LIMIT 25"),
    rows<any>(database, "SELECT (SELECT COUNT(*) FROM debts WHERE status != 'PAID') AS unpaidDebtCount, (SELECT COUNT(*) FROM consignment_items WHERE status='ACTIVE') AS activeConsignmentCount").then((items) => items[0] ?? { unpaidDebtCount: 0, activeConsignmentCount: 0 }),
    rows<any>(database, "SELECT menuName, SUM(quantity) AS qty, SUM(lineTotal) AS total FROM transaction_items ti JOIN transactions t ON t.id=ti.transactionId WHERE t.paidAt BETWEEN ? AND ? AND t.status='PAID' GROUP BY menuName ORDER BY qty DESC LIMIT 5", [topFrom, topTo]),
    rows<any>(database, "SELECT SUBSTRING(paidAt FROM 1 FOR 7) AS month, SUBSTRING(paidAt FROM 1 FOR 4) AS year, CEIL(EXTRACT(MONTH FROM paidAt::timestamp) / 3.0)::int AS quarter, COALESCE(SUM(total),0) AS omzet, COUNT(*) AS transactions, COALESCE(SUM(CASE WHEN paymentMethod='TUNAI' THEN total ELSE 0 END),0) AS cash, COALESCE(SUM(CASE WHEN paymentMethod='QRIS' THEN total ELSE 0 END),0) AS qris FROM transactions WHERE status='PAID' AND paidAt BETWEEN ? AND ? GROUP BY month, year, quarter ORDER BY month ASC", [chartFrom, chartTo]),
    rows<any>(database, "SELECT m.id, m.name, c.name AS categoryName FROM menus m JOIN categories c ON c.id=m.categoryId WHERE m.active=1 AND NOT EXISTS (SELECT 1 FROM recipe_items r WHERE r.menuId=m.id) ORDER BY m.name ASC LIMIT 5"),
    rows<{ year: string }>(database, "SELECT DISTINCT SUBSTRING(paidAt FROM 1 FOR 4) AS year FROM transactions WHERE status='PAID' ORDER BY year DESC").then((items) => items.map((item) => item.year))
  ]);
  const lowStockCount = Number(lowStock[0]?.totalCount ?? 0);
  return {
    todaySummary,
    lowStock: lowStock.map(({ totalCount, ...item }) => item),
    notifications: {
      lowStock: lowStock.slice(0, 10).map(({ totalCount, ...item }) => item),
      lowStockCount,
      unpaidDebtCount: Number(notificationCounts.unpaidDebtCount ?? 0),
      activeConsignmentCount: Number(notificationCounts.activeConsignmentCount ?? 0)
    },
    topItems,
    chartRows,
    menusWithoutRecipes,
    availableYears
  };
}

export async function listReportTransactions(params: string[]) {
  const database = await db();
  const transactionRows = await rows<any>(database, "SELECT t.*, u.name AS cashierName FROM transactions t JOIN users u ON u.id=t.cashierId WHERE t.paidAt BETWEEN ? AND ? ORDER BY paidAt DESC LIMIT 1000", params);
  const transactionIds = transactionRows.map((transaction) => transaction.id);
  const items = transactionIds.length ? await rows<any>(database, "SELECT * FROM transaction_items WHERE transactionId = ANY(?)", [transactionIds]) : [];
  const itemsByTransaction = new Map<string, any[]>();
  for (const item of items) itemsByTransaction.set(item.transactionId, [...(itemsByTransaction.get(item.transactionId) ?? []), item]);
  const transactions = transactionRows.map((transaction) => ({ ...transaction, cashier: { name: transaction.cashierName }, items: itemsByTransaction.get(transaction.id) ?? [] }));
  const topItems = await rows(database, "SELECT menuName, SUM(quantity) AS qty, SUM(lineTotal) AS total FROM transaction_items ti JOIN transactions t ON t.id=ti.transactionId WHERE t.status='PAID' AND t.paidAt BETWEEN ? AND ? GROUP BY menuName ORDER BY qty DESC LIMIT 20", params);
  const payment = await rows(database, "SELECT paymentMethod, COUNT(*) AS count, SUM(total) AS total FROM transactions WHERE status='PAID' AND paidAt BETWEEN ? AND ? GROUP BY paymentMethod", params);
  return { transactions, topItems, payment };
}
