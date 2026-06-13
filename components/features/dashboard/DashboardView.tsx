"use client";

import { useState } from "react";
import { useData } from "@/hooks/useData";
import { Card, Select } from "@/components/ui";
import { SimpleTable } from "@/components/tables";
import { HelpNote, Metric, Rows, SalesBarChart, Title } from "@/components/common/page-primitives";
import { numberId, rupiah } from "@/utils/format";
import type { Ingredient, Menu } from "@/types/app-ui";

export function DashboardView() {
  const [chartMode, setChartMode] = useState("monthly");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const query = new URLSearchParams({ chart: chartMode, year });
  const { data, error } = useData<any>(`/api/dashboard?${query.toString()}`, null);
  const { data: menus } = useData<Menu[]>("/api/menus", []);
  if (!data) return <Title title="Dashboard" subtitle={error || "Memuat ringkasan hari ini..."} />;
  const availableYears = data.filters?.availableYears?.length ? data.filters.availableYears : [Number(year)];
  const menusWithoutRecipes = menus.filter((menu) => menu.active && !menu.recipes?.length);
  return (
    <>
      <Title title="Dashboard" subtitle="Ringkasan omzet, grafik penjualan, transaksi, stok, dan pembayaran." />
      <HelpNote items={["Ringkasan utama selalu menunjukkan kondisi hari ini.", "Gunakan filter tahun dan tampilan grafik untuk membaca tren omzet tanpa mengubah ringkasan harian."]} />
      {!!menusWithoutRecipes.length && (
        <Card className="mb-4 border-mango/40 bg-mango/10">
          <h2 className="mb-2 font-bold">Menu Aktif Belum Punya Resep Stok</h2>
          <p className="mb-3 text-sm text-ink/65">Menu ini tetap bisa dijual, tetapi stok bahan tidak akan berkurang otomatis sampai resepnya diisi.</p>
          <Rows rows={menusWithoutRecipes.slice(0, 5).map((menu) => [menu.name, menu.category?.name ?? "-", "Lengkapi di Resep Stok"])} empty="Semua menu aktif sudah punya resep." />
        </Card>
      )}
      <Card className="mb-4">
        <h2 className="mb-3 font-bold">Alur Harian Paling Mudah</h2>
        <div className="grid gap-2 text-sm text-ink/70 md:grid-cols-4">
          {["1. Mulai Kasir", "2. Jual dari Kasir", "3. Cek Stok", "4. Tutup Kasir"].map((step) => (
            <div key={step} className="rounded-md bg-skysoft px-3 py-2 font-semibold">{step}</div>
          ))}
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Omzet Hari Ini" value={rupiah(data.omzetToday)} />
        <Metric label="Transaksi Hari Ini" value={data.transactionCount} />
        <Metric label="Tunai" value={rupiah(data.payment.cash)} />
        <Metric label="QRIS" value={rupiah(data.payment.qris)} />
      </div>
      <Card className="mt-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold">{data.salesChart.title}</h2>
            <p className="text-sm text-ink/55">Omzet, jumlah transaksi, Tunai, dan QRIS berdasarkan periode.</p>
          </div>
          <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-2">
            <Select value={year} onChange={(event) => setYear(event.target.value)}>
              {availableYears.map((item: number) => <option key={item} value={item}>{item}</option>)}
            </Select>
            <Select value={chartMode} onChange={(event) => setChartMode(event.target.value)}>
              <option value="monthly">Per Bulan</option>
              <option value="quarterly">Per Kuartal</option>
              <option value="yearly">Per Tahun</option>
            </Select>
          </div>
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
          <SalesBarChart rows={data.salesChart.rows} />
          <SimpleTable
            headers={["Periode", "Omzet", "Trx", "Tunai", "QRIS"]}
            rows={data.salesChart.rows.map((x: any) => [x.label, rupiah(x.omzet), x.transactions, rupiah(x.cash), rupiah(x.qris)])}
            empty="Belum ada data omzet."
          />
        </div>
      </Card>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-bold">Menu Terlaris {data.filters.year}</h2>
          <Rows rows={data.topItems.map((x: any) => [x.menuName, `${x._sum.quantity || 0} terjual`, rupiah(x._sum.lineTotal || 0)])} empty="Belum ada transaksi." />
        </Card>
        <Card>
          <h2 className="mb-3 font-bold">Stok Hampir Habis</h2>
          <Rows rows={data.lowStock.map((x: Ingredient) => [x.name, `${numberId(x.currentStock)} ${x.unit}`, `Min ${numberId(x.minimumStock)}`])} empty="Semua stok aman." />
        </Card>
      </div>
    </>
  );
}
