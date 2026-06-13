import { create } from "zustand";

type CartMenu = {
  id: string;
  name: string;
  price: number;
};

type CartOption = {
  id: string;
  name: string;
  extraPrice: number;
};

export type CartItem = {
  menu: CartMenu;
  quantity: number;
  options: CartOption[];
};

type CartState = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  updateQuantity: (index: number, quantity: number) => void;
  removeItem: (index: number) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>((set) => ({
  items: [],
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  updateQuantity: (index, quantity) => set((state) => ({ items: state.items.map((item, itemIndex) => itemIndex === index ? { ...item, quantity } : item) })),
  removeItem: (index) => set((state) => ({ items: state.items.filter((_, itemIndex) => itemIndex !== index) })),
  clear: () => set({ items: [] })
}));
