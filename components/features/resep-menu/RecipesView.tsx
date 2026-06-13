"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Save, Trash2 } from "lucide-react";
import { api } from "@/components/api";
import { useData } from "@/hooks/useData";
import { ListFilters, PaginationControls, useConfirmDialog, usePagination } from "@/components/shared-state";
import { SimpleTable } from "@/components/tables";
import { Button, Card, Field, Input, SecondaryButton, Select } from "@/components/ui";
import { HelpNote, Title, dangerButtonSmallClass } from "@/components/common/page-primitives";
import { numberId } from "@/utils/format";
import type { Ingredient, Menu } from "@/types/app-ui";

export function RecipesView() {
  const { data: menus, reload } = useData<Menu[]>("/api/recipes", []);
  const { data: ingredients } = useData<Ingredient[]>("/api/ingredients", []);
  const [menuId, setMenuId] = useState("");
  const [items, setItems] = useState<{ ingredientId: string; quantity: number }[]>([]);
  const [message, setMessage] = useState("");
  const { confirm, dialog } = useConfirmDialog();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const selectedMenu = menus.find((menu) => menu.id === menuId);
  const activeIngredients = ingredients.filter((ingredient) => ingredient.active);
  const recipeRows = useMemo(() => menus.filter((menu) => {
    const keyword = search.trim().toLowerCase();
    const recipeText = (menu.recipes ?? []).map((recipe) => recipe.ingredient.name).join(" ").toLowerCase();
    const matchesSearch = !keyword || menu.name.toLowerCase().includes(keyword) || recipeText.includes(keyword);
    const matchesCategory = categoryFilter === "ALL" || menu.category?.name === categoryFilter;
    return matchesSearch && matchesCategory;
  }), [menus, search, categoryFilter]);
  const recipePages = usePagination(recipeRows);
  const recipeCategories = Array.from(new Set(menus.map((menu) => menu.category?.name).filter(Boolean))) as string[];

  useEffect(() => {
    if (!menuId && menus[0]) setMenuId(menus[0].id);
  }, [menuId, menus]);

  useEffect(() => {
    if (!selectedMenu) return;
    setItems((selectedMenu.recipes ?? []).map((recipe) => ({ ingredientId: recipe.ingredient.id, quantity: recipe.quantity })));
    setMessage("");
  }, [selectedMenu]);

  function addItem() {
    const used = new Set(items.map((item) => item.ingredientId));
    const nextIngredient = activeIngredients.find((ingredient) => !used.has(ingredient.id)) ?? activeIngredients[0];
    if (!nextIngredient) return;
    setItems([...items, { ingredientId: nextIngredient.id, quantity: 1 }]);
  }

  function updateItem(index: number, patch: Partial<{ ingredientId: string; quantity: number }>) {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }

  function removeItem(index: number) {
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function resetFromSaved() {
    if (!selectedMenu) return;
    setItems((selectedMenu.recipes ?? []).map((recipe) => ({ ingredientId: recipe.ingredient.id, quantity: recipe.quantity })));
    setMessage("Perubahan draft dibatalkan.");
  }

  function editRecipe(menu: Menu) {
    setMenuId(menu.id);
    setItems((menu.recipes ?? []).map((recipe) => ({ ingredientId: recipe.ingredient.id, quantity: recipe.quantity })));
    setMessage(`Mengedit resep ${menu.name}.`);
  }

  async function save() {
    setMessage("");
    const targetMenuId = menuId || menus[0]?.id;
    if (!targetMenuId) return setMessage("Pilih menu terlebih dahulu.");
    if (!items.length) return setMessage("Tambahkan minimal satu bahan resep.");
    if (items.some((item) => !item.ingredientId || item.quantity <= 0)) return setMessage("Semua bahan harus dipilih dan jumlah harus lebih dari 0.");
    if (new Set(items.map((item) => item.ingredientId)).size !== items.length) return setMessage("Bahan tidak boleh dobel dalam satu resep.");
    await api("/api/recipes", { method: "POST", body: JSON.stringify({ menuId: targetMenuId, items }) });
    setMessage("Resep menu berhasil disimpan.");
    reload();
  }

  async function deleteRecipe(menu: Menu) {
    const confirmed = await confirm({
      title: "Hapus Resep Stok",
      message: `Hapus semua komposisi resep untuk ${menu.name}? Menu tidak akan ikut terhapus.`,
      confirmLabel: "Hapus Resep",
      tone: "danger"
    });
    if (!confirmed) return;
    setMessage("");
    await api("/api/recipes", { method: "POST", body: JSON.stringify({ menuId: menu.id, items: [] }) });
    if (menuId === menu.id) setItems([]);
    setMessage(`Resep ${menu.name} dihapus.`);
    reload();
  }

  return (
    <>
      {dialog}
      <Title title="Resep Stok" subtitle="Atur bahan yang berkurang otomatis saat menu terjual." />
      <HelpNote items={["Pilih menu, masukkan bahan dan jumlah per porsi, lalu simpan.", "Contoh: Jus Mangga memakai Mangga, Gula, Susu, dan Cup. Saat terjual, stok bahan itu otomatis berkurang."]} />
      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <Card className="grid gap-4">
          <Field label="Menu">
            <Select value={menuId} onChange={(event) => setMenuId(event.target.value)}>
              {menus.map((menu) => <option key={menu.id} value={menu.id}>{menu.name}</option>)}
            </Select>
          </Field>
          <div className="rounded-md bg-skysoft px-3 py-2 text-sm text-ink/70">
            Resep menentukan bahan yang otomatis berkurang setiap menu terjual. Contoh: Jus Mangga bisa memakai Mangga, Gula, Susu, dan Cup.
          </div>

          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-bold">Komposisi Bahan</h2>
              <SecondaryButton disabled={!activeIngredients.length} onClick={addItem}><Plus size={16} /> Tambah Bahan</SecondaryButton>
            </div>
            {items.map((item, index) => {
              const ingredient = ingredients.find((row) => row.id === item.ingredientId);
              return (
                <div key={`${item.ingredientId}-${index}`} className="grid gap-2 rounded-md border border-black/10 bg-white p-3">
                  <Field label="Bahan">
                    <Select value={item.ingredientId} onChange={(event) => updateItem(index, { ingredientId: event.target.value })}>
                      {activeIngredients.map((ingredientOption) => <option key={ingredientOption.id} value={ingredientOption.id}>{ingredientOption.name} ({ingredientOption.unit})</option>)}
                    </Select>
                  </Field>
                  <div className="grid gap-2 sm:grid-cols-[1fr_80px]">
                    <Field label="Jumlah per porsi">
                      <Input type="number" min={0.01} step={0.01} value={item.quantity} onChange={(event) => updateItem(index, { quantity: Number(event.target.value) })} />
                    </Field>
                    <div className="grid content-end pb-2 text-sm font-bold text-ink/60">{ingredient?.unit ?? "-"}</div>
                  </div>
                  <button onClick={() => removeItem(index)} className={dangerButtonSmallClass}><Trash2 size={16} /> Hapus Baris</button>
                </div>
              );
            })}
            {!items.length && <div className="rounded-md border border-dashed border-black/15 p-4 text-center text-sm text-ink/50">Belum ada bahan resep untuk menu ini.</div>}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <SecondaryButton onClick={resetFromSaved}>Batalkan Draft</SecondaryButton>
            <Button disabled={!items.length || !menuId} onClick={save}><Save size={16} /> Simpan Resep</Button>
          </div>
          {message && <div className="rounded-md bg-lime/30 px-3 py-2 text-sm font-semibold">{message}</div>}
        </Card>

        <Card>
          <h2 className="mb-3 font-bold">Daftar Resep Tersimpan</h2>
          <ListFilters>
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari menu atau bahan..." />
            <Select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="ALL">Semua kategori</option>
              {recipeCategories.map((category) => <option key={category} value={category}>{category}</option>)}
            </Select>
            <div />
          </ListFilters>
          <SimpleTable
            headers={["Menu", "Kategori", "Komposisi", "Aksi"]}
            rows={recipePages.rows.map((menu) => [
              menu.name,
              menu.category?.name ?? "-",
              menu.recipes?.map((recipe) => `${recipe.ingredient.name} ${numberId(recipe.quantity)} ${recipe.ingredient.unit}`).join(", ") || "Belum ada resep",
              <div key={menu.id} className="flex flex-wrap gap-2">
                <SecondaryButton onClick={() => editRecipe(menu)}><Pencil size={16} /> Edit</SecondaryButton>
                <button disabled={!menu.recipes?.length} onClick={() => deleteRecipe(menu)} className={dangerButtonSmallClass}><Trash2 size={16} /> Hapus</button>
              </div>
            ])}
            empty="Belum ada menu."
          />
          <PaginationControls {...recipePages} />
        </Card>
      </div>
    </>
  );
}