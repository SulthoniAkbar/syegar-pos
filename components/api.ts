"use client";

import { showToast } from "@/components/ToastCenter";

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body instanceof FormData ? init?.headers : { "Content-Type": "application/json", ...(init?.headers || {}) }
  });
  const json = await res.json();
  const method = (init?.method ?? "GET").toUpperCase();
  if (!res.ok || !json.ok) {
    const message = json.message || "Request gagal";
    if (method !== "GET") showToast("error", message);
    throw new Error(message);
  }
  const message = json.message || successMessage(url, method, init?.body);
  if (message) showToast("success", message);
  return json.data as T;
}

function successMessage(url: string, method: string, body?: BodyInit | null) {
  if (method === "GET") return "";

  const path = new URL(url, window.location.origin).pathname;
  const payload = parseBody(body);
  const action = typeof payload?.action === "string" ? payload.action : "";

  if (path === "/api/auth/login") return "Berhasil masuk.";
  if (path === "/api/auth/logout") return "Berhasil keluar.";
  if (path === "/api/uploads") return "Foto menu berhasil diunggah.";
  if (path === "/api/transactions" && method === "POST") return "Transaksi tersimpan dan stok sudah dikurangi.";
  if (path === "/api/transactions" && method === "PUT") return "Transaksi dibatalkan dan stok dikembalikan.";
  if (path === "/api/recipes") return "Resep menu berhasil disimpan.";
  if (path === "/api/stock-purchases") return "Stok masuk tersimpan dan stok bahan diperbarui.";

  if (path === "/api/menus") return entityMessage(method, "Menu");
  if (path === "/api/categories") return entityMessage(method, "Kategori");
  if (path === "/api/options") return entityMessage(method, "Varian/topping");
  if (path === "/api/ingredients") return entityMessage(method, "Bahan baku");
  if (path === "/api/users") return method === "DELETE" ? "User berhasil dinonaktifkan." : entityMessage(method, "User");

  if (path === "/api/shifts") {
    if (action === "open") return "Shift aktif dibuka.";
    if (action === "close") return "Shift berhasil ditutup.";
  }

  if (path === "/api/stock-opnames") {
    if (method === "DELETE") return "Draft cek stok berhasil dihapus.";
    if (action === "create") return "Draft cek stok berhasil dibuat.";
    if (action === "saveDraft") return "Draft cek stok tersimpan.";
    if (action === "finalize") return "Cek stok berhasil difinalisasi.";
  }

  if (path === "/api/admin-finance") {
    return financeMessage(action);
  }

  return method === "DELETE" ? "Data berhasil dihapus." : method === "PUT" ? "Perubahan berhasil disimpan." : "Data berhasil disimpan.";
}

function entityMessage(method: string, label: string) {
  if (method === "DELETE") return `${label} berhasil dihapus.`;
  if (method === "PUT") return `${label} berhasil diperbarui.`;
  return `${label} berhasil ditambahkan.`;
}

function financeMessage(action: string) {
  const messages: Record<string, string> = {
    createCash: "Data kas berhasil ditambahkan.",
    updateCash: "Data kas berhasil diperbarui.",
    deleteCash: "Data kas berhasil dihapus.",
    createExpense: "Pengeluaran berhasil dicatat.",
    updateExpense: "Pengeluaran berhasil diperbarui.",
    deleteExpense: "Pengeluaran berhasil dihapus.",
    createDebt: "Utang/piutang berhasil dicatat.",
    updateDebt: "Utang/piutang berhasil diperbarui.",
    deleteDebt: "Utang/piutang berhasil dihapus.",
    payDebt: "Pembayaran utang/piutang berhasil dicatat.",
    createConsignment: "Barang titip jual berhasil dicatat.",
    updateConsignment: "Barang titip jual berhasil diperbarui.",
    deleteConsignment: "Barang titip jual berhasil dihapus.",
    sellConsignment: "Penjualan barang titip jual berhasil dicatat."
  };
  return messages[action] ?? "Data keuangan berhasil disimpan.";
}

function parseBody(body?: BodyInit | null) {
  if (typeof body !== "string") return null;
  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    return null;
  }
}
