import { db, exec, rows } from "@/lib/database";
import type { CategoryInput, IngredientInput, MenuInput, OptionInput, RecipeInput } from "@/types/catalog";

export async function listCategories() {
  return await rows(await db(), "SELECT c.*, (SELECT COUNT(*) FROM menus m WHERE m.categoryId = c.id) AS menuCount FROM categories c ORDER BY name ASC");
}

export async function createCategory(data: CategoryInput & { id: string; createdAt: string }) {
  await exec(await db(), "INSERT INTO categories VALUES (?, ?, ?, ?, ?)", [data.id, data.name, data.type, data.active ? 1 : 0, data.createdAt]);
}

export async function updateCategory(id: string, data: CategoryInput) {
  await exec(await db(), "UPDATE categories SET name=?, type=?, active=? WHERE id=?", [data.name, data.type, data.active ? 1 : 0, id]);
}

export async function deleteCategory(id: string) {
  await exec(await db(), "DELETE FROM categories WHERE id=?", [id]);
}

export async function listIngredients() {
  return await rows(await db(), "SELECT * FROM ingredients ORDER BY name ASC");
}

export async function createIngredient(data: IngredientInput & { id: string; createdAt: string; updatedAt: string }) {
  await exec(await db(), "INSERT INTO ingredients VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [data.id, data.name, data.unit, data.currentStock, data.minimumStock, data.active ? 1 : 0, data.createdAt, data.updatedAt]);
}

export async function updateIngredient(id: string, data: IngredientInput & { updatedAt: string }) {
  await exec(await db(), "UPDATE ingredients SET name=?, unit=?, currentStock=?, minimumStock=?, active=?, updatedAt=? WHERE id=?", [data.name, data.unit, data.currentStock, data.minimumStock, data.active ? 1 : 0, data.updatedAt, id]);
}

export async function deleteIngredient(id: string) {
  await exec(await db(), "DELETE FROM ingredients WHERE id=?", [id]);
}

export async function listMenus() {
  return await rows<any>(await db(), "SELECT m.*, c.id AS c_id, c.name AS c_name, c.type AS c_type FROM menus m JOIN categories c ON c.id=m.categoryId ORDER BY m.name ASC");
}

export async function listMenuRecipes(menuId: string) {
  return await rows<any>(await db(), "SELECT r.*, i.name, i.unit FROM recipe_items r JOIN ingredients i ON i.id=r.ingredientId WHERE r.menuId=?", [menuId]);
}

export async function createMenu(data: MenuInput & { id: string; createdAt: string; updatedAt: string }) {
  await exec(await db(), "INSERT INTO menus VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [data.id, data.name, data.price, data.active ? 1 : 0, data.photoUrl ?? null, data.categoryId, data.createdAt, data.updatedAt]);
}

export async function updateMenu(id: string, data: MenuInput & { updatedAt: string }) {
  await exec(await db(), "UPDATE menus SET name=?, price=?, categoryId=?, active=?, photoUrl=?, updatedAt=? WHERE id=?", [data.name, data.price, data.categoryId, data.active ? 1 : 0, data.photoUrl ?? null, data.updatedAt, id]);
}

export async function deleteMenu(id: string) {
  await exec(await db(), "DELETE FROM menus WHERE id=?", [id]);
}

export async function listOptionGroups() {
  return await rows<any>(await db(), "SELECT * FROM option_groups ORDER BY name ASC");
}

export async function listOptionsByGroup(optionGroupId: string) {
  return await rows<any>(await db(), "SELECT * FROM menu_options WHERE optionGroupId=? ORDER BY name ASC", [optionGroupId]);
}

export async function createOption(data: OptionInput & { id: string; createdAt: string }) {
  await exec(await db(), "INSERT INTO menu_options VALUES (?, ?, ?, ?, ?, ?)", [data.id, data.name, data.extraPrice, data.active ? 1 : 0, data.optionGroupId, data.createdAt]);
}

export async function updateOption(id: string, data: OptionInput) {
  await exec(await db(), "UPDATE menu_options SET name=?, extraPrice=?, active=?, optionGroupId=? WHERE id=?", [data.name, data.extraPrice, data.active ? 1 : 0, data.optionGroupId, id]);
}

export async function deleteOption(id: string) {
  await exec(await db(), "DELETE FROM menu_options WHERE id=?", [id]);
}

export async function listRecipeMenus() {
  return await rows<any>(await db(), "SELECT m.*, c.name AS categoryName FROM menus m JOIN categories c ON c.id=m.categoryId ORDER BY m.name ASC");
}

export async function replaceRecipe(data: RecipeInput & { recipeIds: string[] }) {
  const database = await db();
  await exec(database, "BEGIN");
  try {
    await exec(database, "DELETE FROM recipe_items WHERE menuId=?", [data.menuId]);
    for (const [index, item] of data.items.entries()) await exec(database, "INSERT INTO recipe_items VALUES (?, ?, ?, ?)", [data.recipeIds[index], data.menuId, item.ingredientId, item.quantity]);
    await exec(database, "COMMIT");
  } catch (error) {
    await exec(database, "ROLLBACK");
    throw error;
  }
}
