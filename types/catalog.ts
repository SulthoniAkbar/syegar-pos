export type CategoryInput = {
  name: string;
  type: "MINUMAN" | "MAKANAN";
  active: boolean;
};

export type IngredientInput = {
  name: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  active: boolean;
};

export type MenuInput = {
  name: string;
  price: number;
  categoryId: string;
  active: boolean;
  photoUrl?: string | null;
};

export type OptionInput = {
  name: string;
  extraPrice: number;
  optionGroupId: string;
  active: boolean;
};

export type RecipeInput = {
  menuId: string;
  items: Array<{ ingredientId: string; quantity: number }>;
};
