"use client";

import { Pencil, Trash2 } from "lucide-react";
import { SecondaryButton } from "@/components/ui";

const dangerButtonSmallClass = "inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[#b83246] px-3 text-sm font-bold text-white ring-1 ring-[#8f2435]/30 hover:bg-[#98283a]";

export function SimpleTable({ headers, rows, empty }: { headers: string[]; rows: React.ReactNode[][]; empty: string }) {
  if (!rows.length) return <div className="text-sm text-ink/50">{empty}</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-black/10 text-left text-ink/55">
            {headers.map((header) => <th key={header} className="px-2 py-2 font-bold">{header}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, i) => (
            <tr key={i} className="border-b border-black/5">
              {cells.map((cell, j) => <td key={j} className={`px-2 py-2 ${j === 0 ? "font-semibold" : "text-ink/70"}`}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <SecondaryButton className="h-9 px-3" onClick={onEdit}><Pencil size={16} /> Edit</SecondaryButton>
      <button className={dangerButtonSmallClass} onClick={onDelete}><Trash2 size={16} /> Hapus</button>
    </div>
  );
}
