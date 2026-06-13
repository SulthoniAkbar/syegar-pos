"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useData } from "@/hooks/useData";
import { PaginationControls, usePagination } from "@/components/shared-state";
import { Card, Input, Select } from "@/components/ui";
import { HelpNote, Metric, Title } from "@/components/common/page-primitives";
import { numberId } from "@/utils/format";
import type { Ingredient } from "@/types/app-ui";

export function StockView() {
  const { data } = useData<Ingredient[]>("/api/ingredients", []);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const activeIngredients = data.filter((item) => item.active);
  const restockCount = activeIngredients.filter((item) => item.currentStock <= item.minimumStock).length;
  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return activeIngredients.filter((item) => {
      const isLow = item.currentStock <= item.minimumStock;
      return (!keyword || item.name.toLowerCase().includes(keyword) || item.unit.toLowerCase().includes(keyword)) &&
        (status === "ALL" || (status === "LOW" && isLow) || (status === "SAFE" && !isLow));
    });
  }, [activeIngredients, search, status]);
  const stockPages = usePagination(filtered, 10);

  return (
    <>
      <Title title="Stok" subtitle="Pantau stok bahan baku yang tersedia saat ini menurut sistem." />
      <HelpNote items={["Stok tersedia berubah dari transaksi, tambah stok, cek stok fisik, dan transaksi batal.", "Status Perlu restock berarti stok sudah sama dengan atau di bawah batas minimum."]} />
      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Total Bahan Aktif" value={activeIngredients.length} />
        <Metric label="Perlu Restock" value={restockCount} />
        <Metric label="Stok Aman" value={Math.max(activeIngredients.length - restockCount, 0)} />
      </div>
      <Card className="mt-4 grid gap-3">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" size={18} />
            <Input className="pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari bahan atau satuan..." />
          </label>
          <Select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="ALL">Semua status</option>
            <option value="LOW">Perlu restock</option>
            <option value="SAFE">Aman</option>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left text-ink/55">
                {["Bahan", "Stok Tersedia", "Batas Minimum", "Selisih", "Status"].map((header) => <th key={header} className="px-3 py-3 font-bold">{header}</th>)}
              </tr>
            </thead>
            <tbody>
              {stockPages.rows.map((item) => {
                const difference = item.currentStock - item.minimumStock;
                const low = difference <= 0;
                return (
                  <tr key={item.id} className="border-b border-black/5">
                    <td className="px-3 py-3 font-bold">{item.name}</td>
                    <td className="px-3 py-3 text-ink/70">{numberId(item.currentStock)} {item.unit}</td>
                    <td className="px-3 py-3 text-ink/70">{numberId(item.minimumStock)} {item.unit}</td>
                    <td className={`px-3 py-3 font-semibold ${low ? "text-guava" : "text-leaf"}`}>{low ? "" : "+"}{numberId(difference)} {item.unit}</td>
                    <td className="px-3 py-3"><StockStatusBadge low={low} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!stockPages.rows.length && <div className="py-8 text-center text-sm text-ink/50">Tidak ada stok yang cocok.</div>}
        </div>
        <PaginationControls {...stockPages} />
      </Card>
    </>
  );
}

function StockStatusBadge({ low }: { low: boolean }) {
  const className = low ? "bg-guava/10 text-guava ring-guava/20" : "bg-lime/30 text-leaf ring-leaf/15";
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${className}`}>{low ? "Perlu restock" : "Aman"}</span>;
}
