import { Card } from "@/components/ui";
import { rupiah } from "@/utils/format";

export const actionLinkClass = "inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#eef6f5] px-4 text-sm font-bold text-ink ring-1 ring-ink/25 hover:bg-[#d9ece9]";
export const actionLinkSmallClass = "inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[#eef6f5] px-3 text-sm font-bold text-ink ring-1 ring-ink/25 hover:bg-[#d9ece9]";
export const dangerButtonClass = "inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#b83246] px-4 text-sm font-bold text-white ring-1 ring-[#8f2435]/30 hover:bg-[#98283a]";
export const dangerButtonSmallClass = "inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[#b83246] px-3 text-sm font-bold text-white ring-1 ring-[#8f2435]/30 hover:bg-[#98283a]";

export function Title({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-5">
      <h1 className="text-2xl font-black tracking-tight">{title}</h1>
      <p className="text-sm text-ink/60">{subtitle}</p>
    </div>
  );
}

export function LoadingScreen({ label = "Memuat SYEGAR POS..." }: { label?: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="relative size-14">
          <div className="absolute inset-0 rounded-full border-4 border-leaf/15" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-leaf" />
          <div className="absolute inset-3 rounded-full bg-leaf/10" />
        </div>
        <div>
          <div className="text-lg font-black text-leaf">SYEGAR POS</div>
          <div className="mt-1 text-sm font-medium text-ink/60">{label}</div>
        </div>
      </div>
    </main>
  );
}

export function HelpNote({ items }: { items: string[] }) {
  return (
    <Card className="mb-4 bg-skysoft/70">
      <div className="grid gap-2 text-sm text-ink/70">
        {items.map((item) => (
          <div key={item} className="flex gap-2">
            <span className="mt-1 size-1.5 rounded-full bg-leaf" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return <Card><div className="text-sm text-ink/55">{label}</div><div className="mt-2 text-2xl font-black">{value}</div></Card>;
}

export function SalesBarChart({ rows }: { rows: Array<{ label: string; omzet: number; transactions: number }> }) {
  const max = Math.max(1, ...rows.map((row) => row.omzet));
  return (
    <div className="h-72 rounded-lg border border-black/10 bg-white p-4">
      <div className="flex h-56 items-end gap-2">
        {rows.map((row) => {
          const height = Math.max(4, (row.omzet / max) * 100);
          return (
            <div key={row.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div className="flex h-44 w-full items-end rounded-md bg-skysoft/70 px-1">
                <div className="w-full rounded-t-md bg-leaf transition-all" style={{ height: `${height}%` }} title={`${row.label}: ${rupiah(row.omzet)} (${row.transactions} trx)`} />
              </div>
              <div className="w-full truncate text-center text-xs font-bold text-ink/70">{row.label}</div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-ink/55">
        <span>0</span>
        <span>Puncak: {rupiah(max)}</span>
      </div>
    </div>
  );
}

export function Rows({ rows, empty }: { rows: React.ReactNode[][]; empty: string }) {
  if (!rows.length) return <div className="text-sm text-ink/50">{empty}</div>;
  return <div className="divide-y divide-black/10">{rows.map((row, i) => <div key={i} className="grid grid-cols-3 gap-3 py-2 text-sm">{row.map((cell, j) => <div key={j} className={j === 0 ? "font-semibold" : "text-ink/60"}>{cell}</div>)}</div>)}</div>;
}

export function StatusBadge({ label, tone }: { label: string; tone: "ok" | "warn" }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${tone === "ok" ? "bg-lime/30 text-leaf" : "bg-mango/20 text-ink"}`}>{label}</span>;
}

export function DiffBadge({ type }: { type: string }) {
  const tone = type === "SESUAI" ? "bg-lime/30 text-leaf" : type === "LEBIH" ? "bg-skysoft text-leaf" : type === "KURANG" ? "bg-guava/10 text-guava" : "bg-black/5 text-ink/60";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}>{labelDiff(type)}</span>;
}

export function AdminSection({ form, table }: { form: React.ReactNode; table: React.ReactNode }) {
  return (
    <div className="mt-4 grid gap-4 xl:grid-cols-[360px_1fr]">
      <Card className="grid h-fit gap-3">{form}</Card>
      <Card>{table}</Card>
    </div>
  );
}

export function CrudShell({ title, subtitle, form, rows }: { title: string; subtitle: string; form?: React.ReactNode; rows: React.ReactNode[][] }) {
  return (
    <>
      <Title title={title} subtitle={subtitle} />
      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        {form && <Card className="grid h-fit gap-3">{form}</Card>}
        <Card className={form ? "" : "xl:col-span-2"}>
          <Rows rows={rows} empty="Belum ada data." />
        </Card>
      </div>
    </>
  );
}

export function labelDiff(type: string) {
  return type === "SESUAI" ? "Sesuai" : type === "LEBIH" ? "Lebih" : type === "KURANG" ? "Kurang" : "Belum";
}
