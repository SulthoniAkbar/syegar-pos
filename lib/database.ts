import type { Pool, PoolClient } from "pg";
import { createHash, pbkdf2Sync, randomBytes, randomUUID } from "node:crypto";
import { pool } from "@/lib/db";

export type Database = { pool: Pool; transaction: PoolClient | null };
export type SqlValue = string | number | boolean | null | string[];

let readyPromise: Promise<void> | null = null;

const camelIdentifiers = [
  "passwordHash", "createdAt", "updatedAt", "photoUrl", "categoryId", "extraPrice", "optionGroupId",
  "currentStock", "minimumStock", "menuId", "ingredientId", "receiptNumber", "cashierId", "shiftId",
  "paymentMethod", "cashReceived", "changeAmount", "paidAt", "transactionId", "menuName", "unitPrice",
  "lineTotal", "transactionItemId", "optionId", "optionName", "stockOpnameId", "soNumber", "periodMonth",
  "periodYear", "opnameDate", "officerId", "officerName", "generalNotes", "totalItems",
  "totalMinusDifference", "totalPlusDifference", "finalizedAt", "ingredientName", "systemStock",
  "physicalStock", "differenceType", "adjustmentType", "stockBefore", "stockAfter", "createdBy",
  "totalSales", "totalTransactions", "totalItemsSold", "totalCashPayment", "totalQrisPayment",
  "totalDiscount", "totalVoided", "openedAt", "closedAt", "openingCash", "closingCashActual",
  "expectedCash", "cashDifference", "quantitySold", "quantityUsed", "remainingStock",
  "userId", "userName", "entityId", "entryDate", "partyName", "paidAmount", "dueDate", "debtId",
  "paymentDate", "supplierName", "itemName", "quantityReceived", "quantitySold", "sellPrice",
  "supplierPrice", "referenceId", "purchaseAmount"
];

export const id = () => randomUUID();
export const legacyHashPassword = (password: string) => createHash("sha256").update(password).digest("hex");
export const hashPassword = (password: string) => {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
  return `pbkdf2$120000$${salt}$${hash}`;
};
export function verifyPassword(password: string, stored: string) {
  if (stored.startsWith("pbkdf2$")) {
    const [, rounds, salt, hash] = stored.split("$");
    const candidate = pbkdf2Sync(password, salt, Number(rounds), 32, "sha256").toString("hex");
    return candidate === hash;
  }
  return legacyHashPassword(password) === stored;
}
export const now = () => new Date().toISOString();
export const databasePath = () => process.env.DATABASE_URL ?? "postgresql://DATABASE_URL-not-set";

export function menuImage(name: string) {
  const slug = name.toLowerCase().replaceAll(" ", "-");
  const known: Record<string, string> = {
    "jus-mangga": "/menu-images/jus-mangga.svg",
    "jus-alpukat": "/menu-images/jus-alpukat.svg",
    "es-jeruk": "/menu-images/es-jeruk.svg",
    "pisang-keju": "/menu-images/pisang-keju.svg",
    "cireng-crispy": "/menu-images/cireng-crispy.svg"
  };
  return known[slug] ?? null;
}

export async function db() {
  if (!readyPromise) readyPromise = open();
  await readyPromise;
  return { pool, transaction: null };
}

export function resetDbConnection() {
  readyPromise = null;
}

async function open() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL belum diatur. Isi dengan URL PostgreSQL online, contoh: postgresql://user:password@host:5432/db?sslmode=require");
  }
  const database = { pool, transaction: null };
  await migrate(database);
  await seed(database);
}

async function migrate(database: Database) {
  await execute(database, `
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, username TEXT UNIQUE NOT NULL, passwordHash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'KASIR', active INTEGER NOT NULL DEFAULT 1, createdAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, type TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, createdAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS menus (id TEXT PRIMARY KEY, name TEXT NOT NULL, price INTEGER NOT NULL, active INTEGER NOT NULL DEFAULT 1, photoUrl TEXT, categoryId TEXT NOT NULL, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS option_groups (id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, type TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, createdAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS menu_options (id TEXT PRIMARY KEY, name TEXT NOT NULL, extraPrice INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, optionGroupId TEXT NOT NULL, createdAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS ingredients (id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, unit TEXT NOT NULL, currentStock DOUBLE PRECISION NOT NULL DEFAULT 0, minimumStock DOUBLE PRECISION NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS recipe_items (id TEXT PRIMARY KEY, menuId TEXT NOT NULL, ingredientId TEXT NOT NULL, quantity DOUBLE PRECISION NOT NULL, UNIQUE(menuId, ingredientId));
    CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, receiptNumber TEXT UNIQUE NOT NULL, cashierId TEXT NOT NULL, shiftId TEXT, paymentMethod TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'PAID', subtotal INTEGER NOT NULL, total INTEGER NOT NULL, cashReceived INTEGER, changeAmount INTEGER, paidAt TEXT NOT NULL, createdAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS transaction_items (id TEXT PRIMARY KEY, transactionId TEXT NOT NULL, menuId TEXT NOT NULL, menuName TEXT NOT NULL, unitPrice INTEGER NOT NULL, quantity INTEGER NOT NULL, lineTotal INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS transaction_item_options (id TEXT PRIMARY KEY, transactionItemId TEXT NOT NULL, optionId TEXT, optionName TEXT NOT NULL, extraPrice INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS stock_movements (id TEXT PRIMARY KEY, ingredientId TEXT NOT NULL, type TEXT NOT NULL, quantity DOUBLE PRECISION NOT NULL, note TEXT, transactionId TEXT, createdAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS shifts (id TEXT PRIMARY KEY, cashierId TEXT NOT NULL, openedAt TEXT NOT NULL, closedAt TEXT, openingCash INTEGER NOT NULL DEFAULT 0, closingCashActual INTEGER, expectedCash INTEGER, cashDifference INTEGER, totalSales INTEGER NOT NULL DEFAULT 0, totalTransactions INTEGER NOT NULL DEFAULT 0, totalItemsSold INTEGER NOT NULL DEFAULT 0, totalCashPayment INTEGER NOT NULL DEFAULT 0, totalQrisPayment INTEGER NOT NULL DEFAULT 0, totalDiscount INTEGER NOT NULL DEFAULT 0, totalVoided INTEGER NOT NULL DEFAULT 0, notes TEXT, status TEXT NOT NULL DEFAULT 'ACTIVE', createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS shift_items_summary (id TEXT PRIMARY KEY, shiftId TEXT NOT NULL, menuId TEXT, menuName TEXT NOT NULL, quantitySold INTEGER NOT NULL, totalSales INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS shift_ingredients_summary (id TEXT PRIMARY KEY, shiftId TEXT NOT NULL, ingredientId TEXT, ingredientName TEXT NOT NULL, quantityUsed DOUBLE PRECISION NOT NULL, unit TEXT NOT NULL, remainingStock DOUBLE PRECISION NOT NULL);
    CREATE TABLE IF NOT EXISTS stock_opnames (id TEXT PRIMARY KEY, soNumber TEXT UNIQUE NOT NULL, periodMonth INTEGER NOT NULL, periodYear INTEGER NOT NULL, opnameDate TEXT NOT NULL, officerId TEXT, officerName TEXT NOT NULL, generalNotes TEXT, totalItems INTEGER NOT NULL DEFAULT 0, totalMinusDifference DOUBLE PRECISION NOT NULL DEFAULT 0, totalPlusDifference DOUBLE PRECISION NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'DRAFT', finalizedAt TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS stock_opname_items (id TEXT PRIMARY KEY, stockOpnameId TEXT NOT NULL, ingredientId TEXT NOT NULL, ingredientName TEXT NOT NULL, unit TEXT NOT NULL, systemStock DOUBLE PRECISION NOT NULL, physicalStock DOUBLE PRECISION, difference DOUBLE PRECISION, differenceType TEXT NOT NULL DEFAULT 'BELUM', notes TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS stock_adjustments (id TEXT PRIMARY KEY, ingredientId TEXT NOT NULL, stockOpnameId TEXT, adjustmentType TEXT NOT NULL, stockBefore DOUBLE PRECISION NOT NULL, stockAfter DOUBLE PRECISION NOT NULL, difference DOUBLE PRECISION NOT NULL, reason TEXT, createdBy TEXT, createdAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS stock_purchases (id TEXT PRIMARY KEY, ingredientId TEXT NOT NULL, ingredientName TEXT NOT NULL, unit TEXT NOT NULL, quantity DOUBLE PRECISION NOT NULL, stockBefore DOUBLE PRECISION NOT NULL, stockAfter DOUBLE PRECISION NOT NULL, supplier TEXT, note TEXT, createdBy TEXT, createdAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, userId TEXT, userName TEXT, action TEXT NOT NULL, entity TEXT NOT NULL, entityId TEXT, details TEXT, createdAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS cash_ledger (id TEXT PRIMARY KEY, type TEXT NOT NULL, source TEXT NOT NULL DEFAULT 'MANUAL', referenceId TEXT, category TEXT NOT NULL, amount INTEGER NOT NULL, note TEXT, entryDate TEXT NOT NULL, createdBy TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS expenses (id TEXT PRIMARY KEY, expenseDate TEXT NOT NULL, category TEXT NOT NULL, vendor TEXT, amount INTEGER NOT NULL, paymentMethod TEXT NOT NULL DEFAULT 'TUNAI', note TEXT, createdBy TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS debts (id TEXT PRIMARY KEY, type TEXT NOT NULL, partyName TEXT NOT NULL, amount INTEGER NOT NULL, paidAmount INTEGER NOT NULL DEFAULT 0, dueDate TEXT, status TEXT NOT NULL DEFAULT 'OPEN', note TEXT, createdBy TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS debt_payments (id TEXT PRIMARY KEY, debtId TEXT NOT NULL, amount INTEGER NOT NULL, paymentDate TEXT NOT NULL, note TEXT, createdBy TEXT, createdAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS consignment_items (id TEXT PRIMARY KEY, supplierName TEXT NOT NULL, itemName TEXT NOT NULL, quantityReceived INTEGER NOT NULL, quantitySold INTEGER NOT NULL DEFAULT 0, sellPrice INTEGER NOT NULL, supplierPrice INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'ACTIVE', note TEXT, createdBy TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_users_username_active ON users(username, active);
    CREATE INDEX IF NOT EXISTS idx_menus_category ON menus(categoryId);
    CREATE INDEX IF NOT EXISTS idx_menus_active_name ON menus(active, name);
    CREATE INDEX IF NOT EXISTS idx_menu_options_group ON menu_options(optionGroupId);
    CREATE INDEX IF NOT EXISTS idx_ingredients_active_name ON ingredients(active, name);
    CREATE INDEX IF NOT EXISTS idx_ingredients_low_stock ON ingredients(active, currentStock, minimumStock);
    CREATE INDEX IF NOT EXISTS idx_recipe_items_menu ON recipe_items(menuId);
    CREATE INDEX IF NOT EXISTS idx_recipe_items_ingredient ON recipe_items(ingredientId);
    CREATE INDEX IF NOT EXISTS idx_transactions_paid_status ON transactions(paidAt, status);
    CREATE INDEX IF NOT EXISTS idx_transactions_shift_status ON transactions(shiftId, status);
    CREATE INDEX IF NOT EXISTS idx_transactions_cashier_status ON transactions(cashierId, status);
    CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction ON transaction_items(transactionId);
    CREATE INDEX IF NOT EXISTS idx_transaction_items_menu ON transaction_items(menuId);
    CREATE INDEX IF NOT EXISTS idx_transaction_item_options_item ON transaction_item_options(transactionItemId);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_transaction_type ON stock_movements(transactionId, type);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_ingredient_created ON stock_movements(ingredientId, createdAt);
    CREATE INDEX IF NOT EXISTS idx_shifts_status_cashier_opened ON shifts(status, cashierId, openedAt);
    CREATE INDEX IF NOT EXISTS idx_stock_opnames_period_status ON stock_opnames(periodYear, periodMonth, status);
    CREATE INDEX IF NOT EXISTS idx_stock_opnames_created ON stock_opnames(createdAt);
    CREATE INDEX IF NOT EXISTS idx_stock_opname_items_opname ON stock_opname_items(stockOpnameId);
    CREATE INDEX IF NOT EXISTS idx_stock_adjustments_opname_created ON stock_adjustments(stockOpnameId, createdAt);
    CREATE INDEX IF NOT EXISTS idx_stock_purchases_created ON stock_purchases(createdAt);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(createdAt);
    CREATE INDEX IF NOT EXISTS idx_cash_ledger_date_type ON cash_ledger(entryDate, type);
    CREATE INDEX IF NOT EXISTS idx_cash_ledger_source_reference ON cash_ledger(source, referenceId);
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expenseDate);
    CREATE INDEX IF NOT EXISTS idx_debts_type_status ON debts(type, status);
    CREATE INDEX IF NOT EXISTS idx_debt_payments_debt ON debt_payments(debtId);
    CREATE INDEX IF NOT EXISTS idx_consignment_status_created ON consignment_items(status, createdAt);
  `);
  await execute(database, `
    ALTER TABLE stock_purchases ADD COLUMN IF NOT EXISTS purchaseAmount INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE stock_purchases ADD COLUMN IF NOT EXISTS paymentMethod TEXT NOT NULL DEFAULT 'TUNAI';
  `);
  await addForeignKeys(database);
}

async function addForeignKeys(database: Database) {
  const constraints = [
    ["menus", "fk_menus_category", "FOREIGN KEY (categoryId) REFERENCES categories(id)"],
    ["menu_options", "fk_menu_options_group", "FOREIGN KEY (optionGroupId) REFERENCES option_groups(id)"],
    ["recipe_items", "fk_recipe_items_menu", "FOREIGN KEY (menuId) REFERENCES menus(id) ON DELETE CASCADE"],
    ["recipe_items", "fk_recipe_items_ingredient", "FOREIGN KEY (ingredientId) REFERENCES ingredients(id)"],
    ["transactions", "fk_transactions_cashier", "FOREIGN KEY (cashierId) REFERENCES users(id)"],
    ["transactions", "fk_transactions_shift", "FOREIGN KEY (shiftId) REFERENCES shifts(id) ON DELETE SET NULL"],
    ["transaction_items", "fk_transaction_items_transaction", "FOREIGN KEY (transactionId) REFERENCES transactions(id) ON DELETE CASCADE"],
    ["transaction_items", "fk_transaction_items_menu", "FOREIGN KEY (menuId) REFERENCES menus(id)"],
    ["transaction_item_options", "fk_transaction_item_options_item", "FOREIGN KEY (transactionItemId) REFERENCES transaction_items(id) ON DELETE CASCADE"],
    ["transaction_item_options", "fk_transaction_item_options_option", "FOREIGN KEY (optionId) REFERENCES menu_options(id) ON DELETE SET NULL"],
    ["stock_movements", "fk_stock_movements_ingredient", "FOREIGN KEY (ingredientId) REFERENCES ingredients(id)"],
    ["stock_movements", "fk_stock_movements_transaction", "FOREIGN KEY (transactionId) REFERENCES transactions(id) ON DELETE SET NULL"],
    ["shifts", "fk_shifts_cashier", "FOREIGN KEY (cashierId) REFERENCES users(id)"],
    ["shift_items_summary", "fk_shift_items_summary_shift", "FOREIGN KEY (shiftId) REFERENCES shifts(id) ON DELETE CASCADE"],
    ["shift_items_summary", "fk_shift_items_summary_menu", "FOREIGN KEY (menuId) REFERENCES menus(id) ON DELETE SET NULL"],
    ["shift_ingredients_summary", "fk_shift_ingredients_summary_shift", "FOREIGN KEY (shiftId) REFERENCES shifts(id) ON DELETE CASCADE"],
    ["shift_ingredients_summary", "fk_shift_ingredients_summary_ingredient", "FOREIGN KEY (ingredientId) REFERENCES ingredients(id) ON DELETE SET NULL"],
    ["stock_opname_items", "fk_stock_opname_items_opname", "FOREIGN KEY (stockOpnameId) REFERENCES stock_opnames(id) ON DELETE CASCADE"],
    ["stock_opname_items", "fk_stock_opname_items_ingredient", "FOREIGN KEY (ingredientId) REFERENCES ingredients(id)"],
    ["stock_adjustments", "fk_stock_adjustments_ingredient", "FOREIGN KEY (ingredientId) REFERENCES ingredients(id)"],
    ["stock_adjustments", "fk_stock_adjustments_opname", "FOREIGN KEY (stockOpnameId) REFERENCES stock_opnames(id) ON DELETE SET NULL"],
    ["stock_purchases", "fk_stock_purchases_ingredient", "FOREIGN KEY (ingredientId) REFERENCES ingredients(id)"],
    ["audit_logs", "fk_audit_logs_user", "FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL"],
    ["debt_payments", "fk_debt_payments_debt", "FOREIGN KEY (debtId) REFERENCES debts(id) ON DELETE CASCADE"]
  ] as const;

  for (const [table, name, definition] of constraints) {
    try {
      await exec(database, `ALTER TABLE ${table} ADD CONSTRAINT ${name} ${definition} NOT VALID`);
    } catch (error) {
      if (!isDuplicateConstraint(error)) throw error;
    }
  }
}

function isDuplicateConstraint(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "42710";
}

async function seed(database: Database) {
  const userCount = await scalar<number>(database, "SELECT COUNT(*) FROM users");
  await ensureSuperAdmin(database);
  if ((userCount ?? 0) > 0) return;
  const t = now();
  await exec(database, "INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?)", [id(), "Owner SYEGAR", "owner", hashPassword("owner123"), "OWNER", 1, t]);
  await exec(database, "INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?)", [id(), "Kasir SYEGAR", "kasir", hashPassword("kasir123"), "KASIR", 1, t]);
  const minuman = id(), makanan = id();
  await exec(database, "INSERT INTO categories VALUES (?, ?, ?, ?, ?)", [minuman, "Minuman", "MINUMAN", 1, t]);
  await exec(database, "INSERT INTO categories VALUES (?, ?, ?, ?, ?)", [makanan, "Makanan", "MAKANAN", 1, t]);
  const ing: Record<string, string> = {};
  for (const item of [["Mangga", "gram", 8000, 1000], ["Alpukat", "gram", 5000, 800], ["Jeruk", "gram", 6000, 1000], ["Gula", "gram", 10000, 1500], ["Susu", "ml", 8000, 1000], ["Cup", "pcs", 300, 50], ["Tepung", "gram", 7000, 1000], ["Pisang", "pcs", 120, 20], ["Keju", "gram", 2500, 300], ["Coklat", "gram", 3000, 400]] as const) {
    ing[item[0]] = id();
    await exec(database, "INSERT INTO ingredients VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [ing[item[0]], item[0], item[1], item[2], item[3], 1, t, t]);
  }
  const menus = [
    ["Jus Mangga", 15000, minuman, [["Mangga", 150], ["Gula", 15], ["Susu", 20], ["Cup", 1]]],
    ["Jus Alpukat", 17000, minuman, [["Alpukat", 150], ["Gula", 15], ["Susu", 30], ["Cup", 1]]],
    ["Es Jeruk", 12000, minuman, [["Jeruk", 180], ["Gula", 20], ["Cup", 1]]],
    ["Pisang Keju", 14000, makanan, [["Pisang", 2], ["Keju", 25], ["Coklat", 10]]],
    ["Cireng Crispy", 10000, makanan, [["Tepung", 120]]]
  ] as const;
  for (const [name, price, categoryId, recipe] of menus) {
    const menuId = id();
    await exec(database, "INSERT INTO menus VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [menuId, name, price, 1, menuImage(name), categoryId, t, t]);
    for (const [ingredientName, quantity] of recipe) await exec(database, "INSERT INTO recipe_items VALUES (?, ?, ?, ?)", [id(), menuId, ing[ingredientName], quantity]);
  }
  const variant = id(), topping = id();
  await exec(database, "INSERT INTO option_groups VALUES (?, ?, ?, ?, ?)", [variant, "Varian", "VARIANT", 1, t]);
  await exec(database, "INSERT INTO option_groups VALUES (?, ?, ?, ?, ?)", [topping, "Topping", "TOPPING", 1, t]);
  for (const item of [["Reguler", 0, variant], ["Large", 4000, variant], ["Less Sugar", 0, variant], ["Normal Sugar", 0, variant], ["Jelly", 3000, topping], ["Susu", 3000, topping], ["Keju", 4000, topping], ["Coklat", 3000, topping]] as const) {
    await exec(database, "INSERT INTO menu_options VALUES (?, ?, ?, ?, ?, ?)", [id(), item[0], item[1], 1, item[2], t]);
  }
}

async function ensureSuperAdmin(database: Database) {
  const exists = await scalar<number>(database, "SELECT COUNT(*) FROM users WHERE username='superadmin'");
  if ((exists ?? 0) > 0) return;
  await exec(database, "INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?)", [id(), "Super Admin SYEGAR", "superadmin", hashPassword("superadmin123"), "SUPER_ADMIN", 1, now()]);
}

export async function persist(_database?: Database) {
  return;
}

export async function rows<T = any>(database: Database, sql: string, params: SqlValue[] = []): Promise<T[]> {
  const result = await query(database, prepareSql(sql), params);
  return result.rows as T[];
}

export async function row<T = any>(database: Database, sql: string, params: SqlValue[] = []) {
  return (await rows<T>(database, sql, params))[0] ?? null;
}

export async function scalar<T = any>(database: Database, sql: string, params: SqlValue[] = []) {
  const first = await row<Record<string, T>>(database, sql, params);
  return first ? Object.values(first)[0] : null;
}

export async function exec(database: Database, sql: string, params: SqlValue[] = []) {
  const normalized = sql.trim().toUpperCase();
  if (normalized === "BEGIN") {
    if (database.transaction) return;
    database.transaction = await database.pool.connect();
    await database.transaction.query("BEGIN");
    return;
  }
  if (normalized === "COMMIT" || normalized === "ROLLBACK") {
    const client = database.transaction;
    if (!client) return;
    try {
      await client.query(normalized);
    } finally {
      client.release();
      database.transaction = null;
    }
    return;
  }
  await query(database, prepareSql(sql), params);
}

function query(database: Database, sql: string, params: SqlValue[] = []) {
  return database.transaction ? database.transaction.query(sql, params) : database.pool.query(sql, params);
}

async function execute(database: Database, sql: string) {
  for (const statement of sql.split(";").map((part) => part.trim()).filter(Boolean)) {
    await exec(database, statement);
  }
}

function prepareSql(sql: string) {
  let prepared = sql;
  for (const identifier of camelIdentifiers) {
    prepared = prepared.replace(new RegExp(`(?<!")\\b${identifier}\\b(?!")`, "g"), `"${identifier}"`);
  }
  let index = 0;
  return prepared.replace(/\?/g, () => `$${++index}`);
}
