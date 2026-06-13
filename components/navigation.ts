import { BarChart3, Boxes, ChefHat, ClipboardCheck, ClipboardList, Home, Layers3, Package, Plus, ReceiptText, Tags, UserCog, Utensils, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type View = "dashboard" | "kasir" | "menu" | "kategori" | "varian-topping" | "bahan-baku" | "stok-masuk" | "resep-menu" | "stok" | "stock-opname" | "tutup-shift" | "laporan" | "admin-keuangan" | "users";
export type UserRole = "SUPER_ADMIN" | "OWNER" | "KASIR";
export type NavItem = readonly [View, string, LucideIcon];

export const ownerNavGroups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Operasional",
    items: [
      ["dashboard", "Dashboard", Home],
      ["kasir", "Kasir", ReceiptText],
      ["stok", "Stok", Boxes],
      ["stok-masuk", "Tambah Stok", Plus],
      ["tutup-shift", "Tutup Kasir", ClipboardList]
    ]
  },
  {
    label: "Manajemen",
    items: [
      ["menu", "Menu Jualan", Utensils],
      ["kategori", "Kategori", Tags],
      ["varian-topping", "Pilihan Tambahan", Layers3],
      ["bahan-baku", "Bahan", Package],
      ["resep-menu", "Resep Stok", ChefHat],
      ["stock-opname", "Cek Stok Fisik", ClipboardCheck],
      ["admin-keuangan", "Keuangan", Wallet]
    ]
  },
  {
    label: "Laporan & Sistem",
    items: [
      ["laporan", "Laporan", BarChart3],
      ["users", "Pengguna", UserCog]
    ]
  }
];

export const cashierNavGroups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Operasional Kasir",
    items: [
      ["dashboard", "Dashboard", Home],
      ["kasir", "Kasir", ReceiptText],
      ["stok", "Stok", Boxes],
      ["tutup-shift", "Tutup Kasir", ClipboardList]
    ]
  }
];
