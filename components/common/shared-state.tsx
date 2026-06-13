"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button, SecondaryButton, Select, Textarea } from "@/components/ui";

const dangerButtonClass = "inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#b83246] px-4 text-sm font-bold text-white ring-1 ring-[#8f2435]/30 hover:bg-[#98283a]";

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
};

export function useConfirmDialog() {
  const [options, setOptions] = useState<(ConfirmOptions & { resolve: (confirmed: boolean) => void }) | null>(null);

  const confirm = useCallback((nextOptions: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => setOptions({ ...nextOptions, resolve }));
  }, []);

  const close = (confirmed: boolean) => {
    options?.resolve(confirmed);
    setOptions(null);
  };

  const dialog = options ? (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-black/10 bg-white p-5 shadow-soft">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-black">{options.title}</h2>
            <p className="mt-2 text-sm leading-6 text-ink/65">{options.message}</p>
          </div>
          <button onClick={() => close(false)} className="grid size-9 place-items-center rounded-md bg-black/5 text-ink/60 hover:bg-black/10" aria-label="Tutup dialog">
            <X size={18} />
          </button>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <SecondaryButton onClick={() => close(false)}>{options.cancelLabel ?? "Batal"}</SecondaryButton>
          {options.tone === "danger" ? (
            <button onClick={() => close(true)} className={dangerButtonClass}>{options.confirmLabel ?? "Hapus"}</button>
          ) : (
            <Button onClick={() => close(true)}>{options.confirmLabel ?? "Lanjutkan"}</Button>
          )}
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, dialog };
}

export function useTextPromptDialog() {
  const [value, setValue] = useState("");
  const [options, setOptions] = useState<({ title: string; message: string; placeholder?: string; confirmLabel?: string; resolve: (value: string | null) => void }) | null>(null);

  const promptText = useCallback((nextOptions: { title: string; message: string; placeholder?: string; confirmLabel?: string }) => {
    setValue("");
    return new Promise<string | null>((resolve) => setOptions({ ...nextOptions, resolve }));
  }, []);

  const close = (nextValue: string | null) => {
    options?.resolve(nextValue);
    setOptions(null);
    setValue("");
  };

  const dialog = options ? (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-black/10 bg-white p-5 shadow-soft">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-black">{options.title}</h2>
            <p className="mt-2 text-sm leading-6 text-ink/65">{options.message}</p>
          </div>
          <button onClick={() => close(null)} className="grid size-9 place-items-center rounded-md bg-black/5 text-ink/60 hover:bg-black/10" aria-label="Tutup dialog">
            <X size={18} />
          </button>
        </div>
        <Textarea className="mt-4" value={value} onChange={(event) => setValue(event.target.value)} placeholder={options.placeholder} />
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <SecondaryButton onClick={() => close(null)}>Batal</SecondaryButton>
          <Button disabled={!value.trim()} onClick={() => close(value.trim())}>{options.confirmLabel ?? "Simpan"}</Button>
        </div>
      </div>
    </div>
  ) : null;

  return { promptText, dialog };
}

export function usePagination<T>(rows: T[], initialPageSize = 8) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const start = (page - 1) * pageSize;
  return {
    page,
    setPage,
    pageSize,
    setPageSize: (value: number) => {
      setPageSizeState(value);
      setPage(1);
    },
    totalPages,
    total: rows.length,
    from: rows.length ? start + 1 : 0,
    to: Math.min(start + pageSize, rows.length),
    rows: rows.slice(start, start + pageSize)
  };
}

export function PaginationControls({ page, setPage, pageSize, setPageSize, totalPages, total, from, to }: {
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (pageSize: number) => void;
  totalPages: number;
  total: number;
  from: number;
  to: number;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-3 text-sm text-ink/60">
      <div>{total ? `Menampilkan ${from}-${to} dari ${total} data` : "Tidak ada data"}</div>
      <div className="flex flex-wrap items-center gap-2">
        <Select className="w-28" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
          {[5, 8, 10, 20, 50].map((size) => <option key={size} value={size}>{size} / halaman</option>)}
        </Select>
        <SecondaryButton className="h-9 px-3" disabled={page <= 1} onClick={() => setPage(page - 1)}>Sebelum</SecondaryButton>
        <span className="px-2 font-bold text-ink">{page} / {totalPages}</span>
        <SecondaryButton className="h-9 px-3" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Berikut</SecondaryButton>
      </div>
    </div>
  );
}

export function ListFilters({ children }: { children: React.ReactNode }) {
  return <div className="mb-3 grid gap-3 md:grid-cols-3">{children}</div>;
}
