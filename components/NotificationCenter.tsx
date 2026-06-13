"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { api } from "@/components/api";
import { numberId } from "@/utils/format";

export function NotificationCenter({ initialNotifications = null }: { initialNotifications?: any }) {
  const [data, setData] = useState<any>(initialNotifications ? { notifications: initialNotifications } : null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (initialNotifications) return;
    api<any>("/api/dashboard?chart=monthly").then(setData).catch(() => setData(null));
  }, [initialNotifications]);

  const notifications = data?.notifications;
  const lowStock = notifications?.lowStock ?? [];
  const total = (notifications?.lowStockCount ?? 0) + (notifications?.unpaidDebtCount ?? 0);

  return (
    <div className="mb-4 flex justify-end">
      <div className="relative">
        <button onClick={() => setOpen(!open)} className="inline-flex h-10 items-center gap-2 rounded-md bg-white px-3 text-sm font-bold text-ink ring-1 ring-black/10 hover:bg-skysoft">
          <Bell size={18} />
          Notifikasi
          {total > 0 && <span className="rounded-full bg-guava px-2 py-0.5 text-xs text-white">{total}</span>}
        </button>
        {open && (
          <div className="absolute right-0 z-30 mt-2 w-[min(360px,calc(100vw-2rem))] rounded-lg border border-black/10 bg-white p-4 shadow-soft">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-black">Notifikasi Sistem</h2>
              <button onClick={() => setOpen(false)} className="text-ink/50 hover:text-ink"><X size={16} /></button>
            </div>
            <div className="grid gap-2">
              {lowStock.map((item: any) => (
                <Link key={item.id} href="/stok" onClick={() => setOpen(false)} className="rounded-md bg-guava/10 p-3 text-sm text-guava ring-1 ring-guava/15">
                  <div className="font-bold">Stok {item.name} hampir habis</div>
                  <div>{numberId(item.currentStock)} {item.unit} tersisa, minimum {numberId(item.minimumStock)} {item.unit}</div>
                </Link>
              ))}
              {(notifications?.unpaidDebtCount ?? 0) > 0 && (
                <Link href="/admin-keuangan" onClick={() => setOpen(false)} className="rounded-md bg-skysoft p-3 text-sm text-ink/70 ring-1 ring-black/5">
                  <div className="font-bold">{notifications.unpaidDebtCount} utang/piutang belum lunas</div>
                  <div>Cek Keuangan untuk tindak lanjut.</div>
                </Link>
              )}
              {(notifications?.activeConsignmentCount ?? 0) > 0 && (
                <Link href="/admin-keuangan" onClick={() => setOpen(false)} className="rounded-md bg-skysoft p-3 text-sm text-ink/70 ring-1 ring-black/5">
                  <div className="font-bold">{notifications.activeConsignmentCount} barang titip jual aktif</div>
                  <div>Pantau sisa barang dan setoran supplier.</div>
                </Link>
              )}
              {!total && !notifications?.activeConsignmentCount && <div className="rounded-md bg-lime/30 p-3 text-sm font-semibold text-leaf">Tidak ada notifikasi penting.</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
