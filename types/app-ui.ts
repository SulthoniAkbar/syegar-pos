import type { UserRole } from "@/components/navigation";

export type User = { id: string; name: string; role: UserRole };
export type Category = { id: string; name: string; type: "MINUMAN" | "MAKANAN"; active: boolean; _count?: { menus: number } };
export type Ingredient = { id: string; name: string; unit: string; currentStock: number; minimumStock: number; active: boolean };
export type Recipe = { ingredient: Ingredient; quantity: number };
export type Menu = { id: string; name: string; price: number; active: boolean; categoryId: string; photoUrl?: string | null; category?: Category; recipes?: Recipe[] };
export type OptionGroup = { id: string; name: string; type: string; options: MenuOption[] };
export type MenuOption = { id: string; name: string; extraPrice: number; active: boolean; optionGroupId: string };
