export type AdminFinanceUser = {
  id?: string;
  name: string;
  role?: string;
};

export type CashLedgerRow = {
  id: string;
  type: "CASH_IN" | "CASH_OUT";
  source: string;
  referenceId: string | null;
  category: string;
  amount: number;
  note: string | null;
  entryDate: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ExpenseRow = {
  id: string;
  expenseDate: string;
  category: string;
  vendor: string | null;
  amount: number;
  paymentMethod: string;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DebtRow = {
  id: string;
  type: "UTANG" | "PIUTANG";
  partyName: string;
  amount: number;
  paidAmount: number;
  dueDate: string | null;
  status: "OPEN" | "PARTIAL" | "PAID";
  note: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ConsignmentRow = {
  id: string;
  supplierName: string;
  itemName: string;
  quantityReceived: number;
  quantitySold: number;
  sellPrice: number;
  supplierPrice: number;
  status: "ACTIVE" | "FINISHED";
  note: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminFinanceRows = {
  cashRows: CashLedgerRow[];
  expenseRows: ExpenseRow[];
  debtRows: DebtRow[];
  consignmentRows: ConsignmentRow[];
};
