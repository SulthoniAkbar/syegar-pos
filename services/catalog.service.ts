import { z } from "zod";
import { id, menuImage, now, persist, db } from "@/lib/database";
import * as catalogRepository from "@/repositories/catalog.repository";

const categorySchema = z.object({ name: z.string().min(2), type: z.enum(["MINUMAN", "MAKANAN"]), active: z.boolean().default(true) });
const ingredientSchema = z.object({
  name: z.string().min(2),
  unit: z.string().min(1),
  currentStock: z.coerce.number().min(0),
  minimumStock: z.coerce.number().min(0),
  active: z.boolean().default(true)
});
const menuSchema = z.object({
  name: z.string().min(2),
  price: z.coerce.number().int().min(0),
  categoryId: z.string().min(1),
  active: z.boolean().default(true),
  photoUrl: z.string().optional().nullable()
});
const optionSchema = z.object({ name: z.string().min(2), extraPrice: z.coerce.number().int().min(0), optionGroupId: z.string(), active: z.boolean().default(true) });
const recipeSchema = z.object({
  menuId: z.string(),
  items: z.array(z.object({ ingredientId: z.string(), quantity: z.coerce.number().positive() }))
});
const idSchema = z.object({ id: z.string() });

export async function listCategories() {
  const categories = await catalogRepository.listCategories();
  return categories.map((category: any) => ({ ...category, active: !!category.active, _count: { menus: category.menuCount } }));
}

export async function createCategory(rawBody: unknown) {
  const data = categorySchema.parse(rawBody);
  const item = { id: id(), ...data, createdAt: now() };
  await catalogRepository.createCategory(item);
  await persist(await db());
  return item;
}

export async function updateCategory(rawBody: unknown) {
  const { id, ...data } = categorySchema.extend({ id: z.string() }).parse(rawBody);
  await catalogRepository.updateCategory(id, data);
  await persist(await db());
  return true;
}

export async function deleteCategory(rawBody: unknown) {
  const { id } = idSchema.parse(rawBody);
  await catalogRepository.deleteCategory(id);
  await persist(await db());
  return true;
}

export async function listIngredients() {
  return (await catalogRepository.listIngredients()).map((ingredient: any) => ({ ...ingredient, active: !!ingredient.active }));
}

export async function createIngredient(rawBody: unknown) {
  const data = ingredientSchema.parse(rawBody);
  const t = now();
  const item = { id: id(), ...data, createdAt: t, updatedAt: t };
  await catalogRepository.createIngredient(item);
  await persist(await db());
  return item;
}

export async function updateIngredient(rawBody: unknown) {
  const { id, ...data } = ingredientSchema.extend({ id: z.string() }).parse(rawBody);
  await catalogRepository.updateIngredient(id, { ...data, updatedAt: now() });
  await persist(await db());
  return true;
}

export async function deleteIngredient(rawBody: unknown) {
  const { id } = idSchema.parse(rawBody);
  await catalogRepository.deleteIngredient(id);
  await persist(await db());
  return true;
}

export async function listMenus() {
  const menus = await catalogRepository.listMenus();
  return await Promise.all(menus.map(async (menu) => decorateMenu(menu, true)));
}

export async function createMenu(rawBody: unknown) {
  const data = menuSchema.parse(rawBody);
  const t = now();
  const item = { id: id(), ...data, photoUrl: data.photoUrl || menuImage(data.name), createdAt: t, updatedAt: t };
  await catalogRepository.createMenu(item);
  await persist(await db());
  return item;
}

export async function updateMenu(rawBody: unknown) {
  const { id, ...data } = menuSchema.extend({ id: z.string() }).parse(rawBody);
  await catalogRepository.updateMenu(id, { ...data, updatedAt: now() });
  await persist(await db());
  return true;
}

export async function deleteMenu(rawBody: unknown) {
  const { id } = idSchema.parse(rawBody);
  await catalogRepository.deleteMenu(id);
  await persist(await db());
  return true;
}

export async function listOptionGroups() {
  const groups = await catalogRepository.listOptionGroups();
  return await Promise.all(groups.map(async (group) => ({
    ...group,
    active: !!group.active,
    options: (await catalogRepository.listOptionsByGroup(group.id)).map((option) => ({ ...option, active: !!option.active }))
  })));
}

export async function createOption(rawBody: unknown) {
  const data = optionSchema.parse(rawBody);
  const item = { id: id(), ...data, createdAt: now() };
  await catalogRepository.createOption(item);
  await persist(await db());
  return item;
}

export async function updateOption(rawBody: unknown) {
  const { id, ...data } = optionSchema.extend({ id: z.string() }).parse(rawBody);
  await catalogRepository.updateOption(id, data);
  await persist(await db());
  return true;
}

export async function deleteOption(rawBody: unknown) {
  const { id } = idSchema.parse(rawBody);
  await catalogRepository.deleteOption(id);
  await persist(await db());
  return true;
}

export async function listRecipes() {
  const menus = await catalogRepository.listRecipeMenus();
  return await Promise.all(menus.map(async (menu) => decorateMenu({ ...menu, c_name: menu.categoryName }, false)));
}

export async function replaceRecipe(rawBody: unknown) {
  const data = recipeSchema.parse(rawBody);
  await catalogRepository.replaceRecipe({ ...data, recipeIds: data.items.map(() => id()) });
  await persist(await db());
  return true;
}

async function decorateMenu(menu: any, includeCategoryId: boolean) {
  const recipes = (await catalogRepository.listMenuRecipes(menu.id)).map((recipe) => ({
    quantity: recipe.quantity,
    ingredient: { id: recipe.ingredientId, name: recipe.name, unit: recipe.unit }
  }));
  return {
    ...menu,
    active: !!menu.active,
    photoUrl: menu.photoUrl || menuImage(menu.name),
    category: includeCategoryId ? { id: menu.c_id, name: menu.c_name, type: menu.c_type } : { name: menu.categoryName ?? menu.c_name },
    recipes
  };
}
