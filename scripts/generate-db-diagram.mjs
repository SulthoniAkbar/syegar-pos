import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const outDir = join(process.cwd(), "docs");

const tables = [
  {
    name: "users",
    group: "Auth",
    x: 40,
    y: 40,
    columns: ["id PK", "name", "username UNIQUE", "passwordHash", "role", "active", "createdAt"]
  },
  {
    name: "categories",
    group: "Catalog",
    x: 400,
    y: 40,
    columns: ["id PK", "name UNIQUE", "type", "active", "createdAt"]
  },
  {
    name: "menus",
    group: "Catalog",
    x: 400,
    y: 260,
    columns: ["id PK", "name", "price", "active", "photoUrl", "categoryId FK", "createdAt", "updatedAt"]
  },
  {
    name: "option_groups",
    group: "Catalog",
    x: 760,
    y: 40,
    columns: ["id PK", "name UNIQUE", "type", "active", "createdAt"]
  },
  {
    name: "menu_options",
    group: "Catalog",
    x: 760,
    y: 260,
    columns: ["id PK", "name", "extraPrice", "active", "optionGroupId FK", "createdAt"]
  },
  {
    name: "ingredients",
    group: "Inventory",
    x: 40,
    y: 520,
    columns: ["id PK", "name UNIQUE", "unit", "currentStock", "minimumStock", "active", "createdAt", "updatedAt"]
  },
  {
    name: "recipe_items",
    group: "Inventory",
    x: 400,
    y: 520,
    columns: ["id PK", "menuId FK", "ingredientId FK", "quantity", "UNIQUE(menuId, ingredientId)"]
  },
  {
    name: "transactions",
    group: "Sales",
    x: 1120,
    y: 40,
    columns: ["id PK", "receiptNumber UNIQUE", "cashierId FK", "shiftId FK NULL", "paymentMethod", "status", "subtotal", "total", "cashReceived", "changeAmount", "paidAt", "createdAt"]
  },
  {
    name: "transaction_items",
    group: "Sales",
    x: 1120,
    y: 380,
    columns: ["id PK", "transactionId FK", "menuId FK", "menuName", "unitPrice", "quantity", "lineTotal"]
  },
  {
    name: "transaction_item_options",
    group: "Sales",
    x: 1120,
    y: 640,
    columns: ["id PK", "transactionItemId FK", "optionId FK NULL", "optionName", "extraPrice"]
  },
  {
    name: "stock_movements",
    group: "Inventory",
    x: 40,
    y: 820,
    columns: ["id PK", "ingredientId FK", "type", "quantity", "note", "transactionId", "createdAt"]
  },
  {
    name: "shifts",
    group: "Shift",
    x: 1480,
    y: 40,
    columns: ["id PK", "cashierId FK", "openedAt", "closedAt", "openingCash", "closingCashActual", "expectedCash", "cashDifference", "totalSales", "totalTransactions", "totalItemsSold", "totalCashPayment", "totalQrisPayment", "totalDiscount", "totalVoided", "notes", "status", "createdAt", "updatedAt"]
  },
  {
    name: "shift_items_summary",
    group: "Shift",
    x: 1480,
    y: 520,
    columns: ["id PK", "shiftId FK", "menuId", "menuName", "quantitySold", "totalSales"]
  },
  {
    name: "shift_ingredients_summary",
    group: "Shift",
    x: 1480,
    y: 760,
    columns: ["id PK", "shiftId FK", "ingredientId", "ingredientName", "quantityUsed", "unit", "remainingStock"]
  },
  {
    name: "stock_opnames",
    group: "Stock Opname",
    x: 400,
    y: 820,
    columns: ["id PK", "soNumber UNIQUE", "periodMonth", "periodYear", "opnameDate", "officerId", "officerName", "generalNotes", "totalItems", "totalMinusDifference", "totalPlusDifference", "status", "finalizedAt", "createdAt", "updatedAt"]
  },
  {
    name: "stock_opname_items",
    group: "Stock Opname",
    x: 760,
    y: 820,
    columns: ["id PK", "stockOpnameId FK", "ingredientId FK", "ingredientName", "unit", "systemStock", "physicalStock", "difference", "differenceType", "notes", "createdAt", "updatedAt"]
  },
  {
    name: "stock_adjustments",
    group: "Stock Opname",
    x: 760,
    y: 1180,
    columns: ["id PK", "ingredientId FK", "stockOpnameId FK NULL", "adjustmentType", "stockBefore", "stockAfter", "difference", "reason", "createdBy", "createdAt"]
  },
  {
    name: "stock_purchases",
    group: "Inventory",
    x: 40,
    y: 1120,
    columns: ["id PK", "ingredientId FK", "ingredientName", "unit", "quantity", "stockBefore", "stockAfter", "supplier", "note", "createdBy", "createdAt"]
  },
  {
    name: "audit_logs",
    group: "Audit",
    x: 1120,
    y: 900,
    columns: ["id PK", "userId", "userName", "action", "entity", "entityId", "details", "createdAt"]
  },
  {
    name: "cash_ledger",
    group: "Finance",
    x: 1480,
    y: 1060,
    columns: ["id PK", "type", "source", "referenceId", "category", "amount", "note", "entryDate", "createdBy", "createdAt", "updatedAt"]
  },
  {
    name: "expenses",
    group: "Finance",
    x: 1480,
    y: 1340,
    columns: ["id PK", "expenseDate", "category", "vendor", "amount", "paymentMethod", "note", "createdBy", "createdAt", "updatedAt"]
  },
  {
    name: "debts",
    group: "Finance",
    x: 1120,
    y: 1180,
    columns: ["id PK", "type", "partyName", "amount", "paidAmount", "dueDate", "status", "note", "createdBy", "createdAt", "updatedAt"]
  },
  {
    name: "debt_payments",
    group: "Finance",
    x: 1120,
    y: 1500,
    columns: ["id PK", "debtId FK", "amount", "paymentDate", "note", "createdBy", "createdAt"]
  },
  {
    name: "consignment_items",
    group: "Finance",
    x: 760,
    y: 1500,
    columns: ["id PK", "supplierName", "itemName", "quantityReceived", "quantitySold", "sellPrice", "supplierPrice", "status", "note", "createdBy", "createdAt", "updatedAt"]
  }
];

const relations = [
  ["users", "transactions", "id", "cashierId"],
  ["users", "shifts", "id", "cashierId"],
  ["categories", "menus", "id", "categoryId"],
  ["menus", "recipe_items", "id", "menuId"],
  ["ingredients", "recipe_items", "id", "ingredientId"],
  ["option_groups", "menu_options", "id", "optionGroupId"],
  ["transactions", "transaction_items", "id", "transactionId"],
  ["menus", "transaction_items", "id", "menuId"],
  ["transaction_items", "transaction_item_options", "id", "transactionItemId"],
  ["menu_options", "transaction_item_options", "id", "optionId"],
  ["ingredients", "stock_movements", "id", "ingredientId"],
  ["shifts", "transactions", "id", "shiftId"],
  ["shifts", "shift_items_summary", "id", "shiftId"],
  ["shifts", "shift_ingredients_summary", "id", "shiftId"],
  ["stock_opnames", "stock_opname_items", "id", "stockOpnameId"],
  ["ingredients", "stock_opname_items", "id", "ingredientId"],
  ["stock_opnames", "stock_adjustments", "id", "stockOpnameId"],
  ["ingredients", "stock_adjustments", "id", "ingredientId"],
  ["ingredients", "stock_purchases", "id", "ingredientId"],
  ["debts", "debt_payments", "id", "debtId"]
];

const tableByName = new Map(tables.map((table) => [table.name, table]));
const width = 1840;
const height = 1720;
const tableWidth = 290;
const rowHeight = 24;
const headerHeight = 34;

function tableHeight(table) {
  return headerHeight + table.columns.length * rowHeight + 12;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function anchor(table, side) {
  const x = side === "right" ? table.x + tableWidth : table.x;
  const y = table.y + tableHeight(table) / 2;
  return { x, y };
}

function relationPath(from, to) {
  const horizontal = from.x < to.x;
  const start = anchor(from, horizontal ? "right" : "left");
  const end = anchor(to, horizontal ? "left" : "right");
  const midX = (start.x + end.x) / 2;
  return `M ${start.x} ${start.y} C ${midX} ${start.y}, ${midX} ${end.y}, ${end.x} ${end.y}`;
}

const colors = {
  Auth: "#e8f4ff",
  Catalog: "#eef8e7",
  Inventory: "#fff6da",
  Sales: "#ffecec",
  Shift: "#f0ecff",
  "Stock Opname": "#eaf7f5",
  Finance: "#fff0e4",
  Audit: "#f3f3f3"
};

const groups = [...new Set(tables.map((table) => table.group))];
const legend = groups.map((group, index) => `
  <g transform="translate(${40 + index * 210} 16)">
    <rect width="16" height="16" rx="3" fill="${colors[group]}" stroke="#8a968f"/>
    <text x="24" y="13" font-size="13" font-weight="700" fill="#34413a">${escapeXml(group)}</text>
  </g>
`).join("");

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
      <path d="M 1 1 L 10 6 L 1 11 z" fill="#65706a"/>
    </marker>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.12"/>
    </filter>
  </defs>
  <rect width="100%" height="100%" fill="#fbfcf7"/>
  <text x="40" y="56" font-size="28" font-weight="900" fill="#18201c">SYEGAR POS - Database Diagram</text>
  <text x="40" y="82" font-size="14" fill="#65706a">Logical ERD from runtime PostgreSQL tables. Solid arrows show application-level FK relationships.</text>
  <g transform="translate(0 82)">${legend}</g>
  <g fill="none" stroke="#65706a" stroke-width="1.4" stroke-opacity="0.62" marker-end="url(#arrow)">
    ${relations.map(([source, target]) => `<path d="${relationPath(tableByName.get(source), tableByName.get(target))}"/>`).join("\n    ")}
  </g>
  ${tables.map((table) => {
    const h = tableHeight(table);
    return `
  <g transform="translate(${table.x} ${table.y + 110})" filter="url(#shadow)">
    <rect width="${tableWidth}" height="${h}" rx="8" fill="white" stroke="#c9d1cc"/>
    <rect width="${tableWidth}" height="${headerHeight}" rx="8" fill="${colors[table.group]}" stroke="#c9d1cc"/>
    <path d="M 0 ${headerHeight - 6} H ${tableWidth}" stroke="${colors[table.group]}"/>
    <text x="14" y="23" font-size="15" font-weight="900" fill="#18201c">${escapeXml(table.name)}</text>
    <text x="${tableWidth - 14}" y="23" text-anchor="end" font-size="11" font-weight="700" fill="#65706a">${escapeXml(table.group)}</text>
    ${table.columns.map((column, index) => {
      const y = headerHeight + 22 + index * rowHeight;
      const isKey = column.includes("PK") || column.includes("FK") || column.includes("UNIQUE");
      return `<text x="14" y="${y}" font-size="12.5" font-family="Inter, Arial, sans-serif" fill="${isKey ? "#1c5b3b" : "#34413a"}">${escapeXml(column)}</text>`;
    }).join("\n    ")}
  </g>`;
  }).join("\n")}
</svg>`;

const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>SYEGAR POS Database Diagram</title>
    <style>
      html, body { margin: 0; background: #fbfcf7; }
      svg { display: block; width: ${width}px; height: ${height}px; }
    </style>
  </head>
  <body>${svg}</body>
</html>`;

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "syegar-pos-db-diagram.svg"), svg);
writeFileSync(join(outDir, "syegar-pos-db-diagram.html"), html);

console.log(`Generated ${join(outDir, "syegar-pos-db-diagram.svg")}`);
console.log(`Generated ${join(outDir, "syegar-pos-db-diagram.html")}`);
