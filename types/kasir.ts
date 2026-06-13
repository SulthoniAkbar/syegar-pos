export type KasirUser = {
  id: string;
  name?: string;
};

export type TransactionMenu = {
  id: string;
  name: string;
  price: number;
};

export type RecipeRow = {
  ingredientId: string;
  quantity: number;
};

export type IngredientStockRow = {
  id: string;
  name: string;
  currentStock: number;
};

export type ActiveShiftRow = {
  id: string;
};

export type TransactionRow = {
  id: string;
  receiptNumber: string;
  cashierName: string;
  status: string;
};

export type StockMovementRow = {
  ingredientId: string;
  quantity: number;
};
