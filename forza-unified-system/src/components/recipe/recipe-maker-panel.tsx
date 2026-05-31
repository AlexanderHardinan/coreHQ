"use client";

import { useMemo, useState } from "react";
import {
  Calculator,
  ChefHat,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { UserRole } from "@/lib/auth/permissions";

export type OpsArea = "kitchen" | "bar" | "global";

export type RecipeUnit = {
  id: string;
  brand_id: string | null;
  name: string;
  code: string;
  is_active: boolean;
};

export type RecipeProduct = {
  id: string;
  brand_id: string | null;
  brand_unit_id: string;
  ops_area: OpsArea;
  product_name: string;
  sku: string;
  unit: string;
  unit_cost: number;
  current_stock: number;
  is_active: boolean;
};

export type RecipeRecord = {
  id: string;
  brand_id: string | null;
  brand_unit_id: string;
  ops_area: OpsArea;
  recipe_name: string;
  recipe_category: string | null;
  batch_yield: number;
  portion_yield: number;
  selling_price: number;
  food_cost_percent: number;
  total_recipe_cost: number;
  cost_per_portion: number;
  is_active: boolean;
};

export type RecipeItemRecord = {
  id: string;
  recipe_id: string;
  product_id: string;
  quantity: number;
  unit: string;
  unit_cost_snapshot: number;
  total_cost: number;
};

type RecipeMakerPanelProps = {
  userId: string;
  role: UserRole;
  selectedBrand: {
    id: string;
    name: string;
    code: string;
  } | null;
  units: RecipeUnit[];
  products: RecipeProduct[];
  recipes: RecipeRecord[];
  recipeItems: RecipeItemRecord[];
};

type EditMode = "create" | "edit";

const opsAreaLabels: Record<OpsArea, string> = {
  kitchen: "Kitchen",
  bar: "Bar",
  global: "Global",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("mk-MK", {
    style: "currency",
    currency: "EUR",
    currencyDisplay: "symbol",
  }).format(value || 0);
}

function getAllowedOpsAreas(role: UserRole): OpsArea[] {
  if (role === "boh_staff") {
    return ["kitchen"];
  }

  if (role === "foh_staff") {
    return ["bar"];
  }

  return ["kitchen", "bar", "global"];
}

function calculateRecipeTotals(
  items: RecipeItemRecord[],
  recipeId: string,
  portionYield: number,
  sellingPrice: number,
) {
  const totalRecipeCost = items
    .filter((item) => item.recipe_id === recipeId)
    .reduce((total, item) => total + Number(item.total_cost || 0), 0);

  const costPerPortion =
    Number(portionYield || 0) > 0 ? totalRecipeCost / Number(portionYield) : 0;

  const foodCostPercent =
    Number(sellingPrice || 0) > 0 ? (costPerPortion / Number(sellingPrice)) * 100 : 0;

  return {
    total_recipe_cost: totalRecipeCost,
    cost_per_portion: costPerPortion,
    food_cost_percent: foodCostPercent,
  };
}

export function RecipeMakerPanel({
  userId,
  role,
  selectedBrand,
  units,
  products,
  recipes,
  recipeItems,
}: RecipeMakerPanelProps) {
  const supabase = createSupabaseBrowserClient();
  const allowedOpsAreas = getAllowedOpsAreas(role);

  const [recipeList, setRecipeList] = useState(recipes);
  const [itemList, setItemList] = useState(recipeItems);

  const [mode, setMode] = useState<EditMode>("create");
  const [editId, setEditId] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState(units[0]?.id || "");
  const [selectedOpsArea, setSelectedOpsArea] = useState<OpsArea>(
    allowedOpsAreas[0] || "kitchen",
  );

  const [recipeName, setRecipeName] = useState("");
  const [recipeCategory, setRecipeCategory] = useState("");
  const [batchYield, setBatchYield] = useState("1");
  const [portionYield, setPortionYield] = useState("1");
  const [sellingPrice, setSellingPrice] = useState("0");
  const [isSaving, setIsSaving] = useState(false);

  const [activeRecipeId, setActiveRecipeId] = useState(recipeList[0]?.id || "");
  const [ingredientProductId, setIngredientProductId] = useState("");
  const [ingredientQty, setIngredientQty] = useState("0");
  const [isIngredientSaving, setIsIngredientSaving] = useState(false);

  const visibleProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          product.brand_unit_id === selectedUnitId &&
          product.ops_area === selectedOpsArea &&
          product.is_active,
      ),
    [products, selectedOpsArea, selectedUnitId],
  );

  const visibleRecipes = useMemo(
    () =>
      recipeList.filter(
        (recipe) =>
          recipe.brand_unit_id === selectedUnitId &&
          recipe.ops_area === selectedOpsArea &&
          recipe.is_active,
      ),
    [recipeList, selectedOpsArea, selectedUnitId],
  );

  const activeRecipe = useMemo(
    () => recipeList.find((recipe) => recipe.id === activeRecipeId) || null,
    [activeRecipeId, recipeList],
  );

  const activeRecipeItems = useMemo(
    () => itemList.filter((item) => item.recipe_id === activeRecipeId),
    [activeRecipeId, itemList],
  );

  function resetRecipeForm() {
    setMode("create");
    setEditId("");
    setRecipeName("");
    setRecipeCategory("");
    setBatchYield("1");
    setPortionYield("1");
    setSellingPrice("0");
  }

  function editRecipe(recipe: RecipeRecord) {
    setMode("edit");
    setEditId(recipe.id);
    setSelectedUnitId(recipe.brand_unit_id);
    setSelectedOpsArea(recipe.ops_area);
    setRecipeName(recipe.recipe_name);
    setRecipeCategory(recipe.recipe_category || "");
    setBatchYield(String(recipe.batch_yield || 1));
    setPortionYield(String(recipe.portion_yield || 1));
    setSellingPrice(String(recipe.selling_price || 0));
    setActiveRecipeId(recipe.id);
  }

  async function updateRecipeTotals(recipeId: string, nextItems = itemList) {
    const recipe = recipeList.find((item) => item.id === recipeId);

    if (!recipe) {
      return;
    }

    const totals = calculateRecipeTotals(
      nextItems,
      recipeId,
      Number(recipe.portion_yield || 0),
      Number(recipe.selling_price || 0),
    );

    const { error } = await supabase
      .from("recipes")
      .update(totals)
      .eq("id", recipeId);

    if (error) {
      toast.error(error.message);
      return;
    }

    setRecipeList((current) =>
      current.map((item) =>
        item.id === recipeId
          ? {
              ...item,
              ...totals,
            }
          : item,
      ),
    );
  }

  async function saveRecipe(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedBrand?.id) {
      toast.error("Selected brand is required.");
      return;
    }

    if (!selectedUnitId) {
      toast.error("Select a branch unit.");
      return;
    }

    if (!recipeName.trim()) {
      toast.error("Recipe name is required.");
      return;
    }

    setIsSaving(true);

    const payload = {
      brand_id: selectedBrand.id,
      brand_unit_id: selectedUnitId,
      ops_area: selectedOpsArea,
      recipe_name: recipeName.trim(),
      recipe_category: recipeCategory.trim() || null,
      batch_yield: Number(batchYield || 1),
      portion_yield: Number(portionYield || 1),
      selling_price: Number(sellingPrice || 0),
      food_cost_percent: 0,
      total_recipe_cost: 0,
      cost_per_portion: 0,
      is_active: true,
      updated_by: userId,
    };

    if (mode === "edit") {
      const totals = calculateRecipeTotals(
        itemList,
        editId,
        Number(portionYield || 1),
        Number(sellingPrice || 0),
      );

      const { error } = await supabase
        .from("recipes")
        .update({
          ...payload,
          ...totals,
        })
        .eq("id", editId);

      setIsSaving(false);

      if (error) {
        toast.error(error.message);
        return;
      }

      setRecipeList((current) =>
        current.map((recipe) =>
          recipe.id === editId
            ? {
                ...recipe,
                ...payload,
                ...totals,
              }
            : recipe,
        ),
      );

      toast.success("Recipe updated successfully.");
      resetRecipeForm();
      return;
    }

    const { data, error } = await supabase
      .from("recipes")
      .insert({
        ...payload,
        created_by: userId,
      })
      .select(
        "id, brand_id, brand_unit_id, ops_area, recipe_name, recipe_category, batch_yield, portion_yield, selling_price, food_cost_percent, total_recipe_cost, cost_per_portion, is_active",
      )
      .single();

    setIsSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    const createdRecipe = data as RecipeRecord;

    setRecipeList((current) => [createdRecipe, ...current]);
    setActiveRecipeId(createdRecipe.id);
    toast.success("Recipe created successfully.");
    resetRecipeForm();
  }

  async function deleteRecipe(recipeId: string) {
    const confirmed = window.confirm(
      "Delete this recipe and its ingredients? This cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    const { error: itemError } = await supabase
      .from("recipe_items")
      .delete()
      .eq("recipe_id", recipeId);

    if (itemError) {
      toast.error(itemError.message);
      return;
    }

    const { error } = await supabase.from("recipes").delete().eq("id", recipeId);

    if (error) {
      toast.error(error.message);
      return;
    }

    setItemList((current) => current.filter((item) => item.recipe_id !== recipeId));
    setRecipeList((current) => current.filter((recipe) => recipe.id !== recipeId));
    setActiveRecipeId("");
    toast.success("Recipe deleted successfully.");
  }

  async function saveIngredient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeRecipeId) {
      toast.error("Select a recipe first.");
      return;
    }

    const product = products.find((item) => item.id === ingredientProductId);

    if (!product) {
      toast.error("Select an inventory product.");
      return;
    }

    const qty = Number(ingredientQty || 0);

    if (qty <= 0) {
      toast.error("Ingredient quantity must be greater than zero.");
      return;
    }

    setIsIngredientSaving(true);

    const payload = {
      recipe_id: activeRecipeId,
      product_id: product.id,
      quantity: qty,
      unit: product.unit,
      unit_cost_snapshot: Number(product.unit_cost || 0),
    };

    const { data, error } = await supabase
      .from("recipe_items")
      .insert(payload)
      .select(
        "id, recipe_id, product_id, quantity, unit, unit_cost_snapshot, total_cost",
      )
      .single();

    setIsIngredientSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    const nextItems = [...itemList, data as RecipeItemRecord];

    setItemList(nextItems);
    await updateRecipeTotals(activeRecipeId, nextItems);
    setIngredientProductId("");
    setIngredientQty("0");
    toast.success("Ingredient added successfully.");
  }

  async function deleteIngredient(itemId: string) {
    const targetItem = itemList.find((item) => item.id === itemId);

    if (!targetItem) {
      return;
    }

    const { error } = await supabase.from("recipe_items").delete().eq("id", itemId);

    if (error) {
      toast.error(error.message);
      return;
    }

    const nextItems = itemList.filter((item) => item.id !== itemId);

    setItemList(nextItems);
    await updateRecipeTotals(targetItem.recipe_id, nextItems);
    toast.success("Ingredient removed successfully.");
  }

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-[2rem] p-6">
        <div className="grid gap-6 xl:grid-cols-[1fr_360px] xl:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-slate-400">
              Recipe Maker
            </p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">
              {selectedBrand?.name || "Selected Brand"} Recipe Costing
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Build recipes from inventory products. When the recipe is sold,
              the ingredient quantity is deducted automatically from inventory
              through the sold consumption ledger.
            </p>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white/80 p-5 shadow-sm">
            <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">
              Branch Unit
            </label>
            <select
              value={selectedUnitId}
              onChange={(event) => {
                setSelectedUnitId(event.target.value);
                setActiveRecipeId("");
              }}
              className="forza-input"
            >
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Recipes"
          value={String(visibleRecipes.length)}
          icon={<ChefHat size={22} />}
        />
        <MetricCard
          label="Ingredients"
          value={String(activeRecipeItems.length)}
          icon={<Calculator size={22} />}
        />
        <MetricCard
          label="Recipe Cost"
          value={formatCurrency(activeRecipe?.total_recipe_cost || 0)}
          icon={<Calculator size={22} />}
        />
        <MetricCard
          label="Cost Per Portion"
          value={formatCurrency(activeRecipe?.cost_per_portion || 0)}
          icon={<Calculator size={22} />}
        />
      </section>

      <section className="glass-panel rounded-[2rem] p-6">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-slate-400">
              Recipe Master
            </p>
            <h2 className="text-2xl font-black text-slate-950">
              Create / Edit Recipe
            </h2>
          </div>

          <select
            value={selectedOpsArea}
            onChange={(event) => {
              setSelectedOpsArea(event.target.value as OpsArea);
              setActiveRecipeId("");
            }}
            className="forza-input xl:max-w-[220px]"
          >
            {allowedOpsAreas.map((area) => (
              <option key={area} value={area}>
                {opsAreaLabels[area]}
              </option>
            ))}
          </select>
        </div>

        <form
          onSubmit={saveRecipe}
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <Field label="Recipe / Dish Name">
            <input
              required
              value={recipeName}
              onChange={(event) => setRecipeName(event.target.value)}
              className="forza-input"
              placeholder="Example: Signature Burger"
            />
          </Field>

          <Field label="Category">
            <input
              value={recipeCategory}
              onChange={(event) => setRecipeCategory(event.target.value)}
              className="forza-input"
              placeholder="Example: Main Course"
            />
          </Field>

          <Field label="Batch Yield">
            <input
              type="number"
              step="0.001"
              value={batchYield}
              onChange={(event) => setBatchYield(event.target.value)}
              className="forza-input"
            />
          </Field>

          <Field label="Portion Yield">
            <input
              type="number"
              step="0.001"
              value={portionYield}
              onChange={(event) => setPortionYield(event.target.value)}
              className="forza-input"
            />
          </Field>

          <Field label="Selling Price (€)">
            <input
              type="number"
              step="0.0001"
              value={sellingPrice}
              onChange={(event) => setSellingPrice(event.target.value)}
              className="forza-input"
            />
          </Field>

          <div className="flex flex-col gap-2 md:col-span-2 xl:col-span-4 sm:flex-row">
            <button
              type="submit"
              disabled={isSaving}
              className="forza-button-hover flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
            >
              {mode === "edit" ? <Save size={18} /> : <Plus size={18} />}
              {isSaving
                ? "Saving..."
                : mode === "edit"
                  ? "Update Recipe"
                  : "Create Recipe"}
            </button>

            {mode === "edit" ? (
              <button
                type="button"
                onClick={resetRecipeForm}
                className="forza-button-hover flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-700"
              >
                <X size={18} />
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
        <section className="glass-panel rounded-[2rem] p-6">
          <div className="mb-5">
            <p className="text-sm font-black uppercase tracking-wide text-slate-400">
              Recipe List
            </p>
            <h2 className="text-2xl font-black text-slate-950">
              {opsAreaLabels[selectedOpsArea]} Recipes
            </h2>
          </div>

          <div className="space-y-3">
            {visibleRecipes.map((recipe) => (
              <div
                key={recipe.id}
                className={`rounded-3xl border p-4 shadow-sm ${
                  recipe.id === activeRecipeId
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 bg-white/80"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveRecipeId(recipe.id)}
                  className="w-full text-left"
                >
                  <h3
                    className={`font-black ${
                      recipe.id === activeRecipeId
                        ? "text-white"
                        : "text-slate-950"
                    }`}
                  >
                    {recipe.recipe_name}
                  </h3>
                  <p
                    className={`mt-1 text-sm font-bold ${
                      recipe.id === activeRecipeId
                        ? "text-white/70"
                        : "text-slate-500"
                    }`}
                  >
                    Cost: {formatCurrency(recipe.total_recipe_cost)} · Portion:{" "}
                    {formatCurrency(recipe.cost_per_portion)} · FC%:{" "}
                    {Number(recipe.food_cost_percent || 0).toFixed(2)}%
                  </p>
                </button>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => editRecipe(recipe)}
                    className="forza-button-hover flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteRecipe(recipe.id)}
                    className="forza-button-hover flex h-10 w-10 items-center justify-center rounded-2xl border border-red-100 bg-red-50 text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}

            {visibleRecipes.length === 0 ? (
              <div className="rounded-3xl bg-white p-6 text-center text-sm font-bold text-slate-500">
                No recipes found for this branch and area.
              </div>
            ) : null}
          </div>
        </section>

        <section className="glass-panel rounded-[2rem] p-6">
          <div className="mb-5">
            <p className="text-sm font-black uppercase tracking-wide text-slate-400">
              Ingredient Sync
            </p>
            <h2 className="text-2xl font-black text-slate-950">
              Inventory Product Ingredients
            </h2>
          </div>

          <form onSubmit={saveIngredient} className="grid gap-4 md:grid-cols-2">
            <Field label="Inventory Product">
              <select
                value={ingredientProductId}
                onChange={(event) => setIngredientProductId(event.target.value)}
                className="forza-input"
              >
                <option value="">Select raw material</option>
                {visibleProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.product_name} — {product.current_stock}{" "}
                    {product.unit}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Qty Used Per Recipe">
              <input
                type="number"
                step="0.001"
                value={ingredientQty}
                onChange={(event) => setIngredientQty(event.target.value)}
                className="forza-input"
              />
            </Field>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={isIngredientSaving || !activeRecipeId}
                className="forza-button-hover flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus size={18} />
                {isIngredientSaving ? "Adding Ingredient..." : "Add Ingredient"}
              </button>
            </div>
          </form>

          <div className="mt-6 space-y-3">
            {activeRecipeItems.map((item) => {
              const product = products.find(
                (productItem) => productItem.id === item.product_id,
              );

              return (
                <div
                  key={item.id}
                  className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-black text-slate-950">
                        {product?.product_name || "Unknown Product"}
                      </h3>
                      <p className="mt-1 text-sm font-bold text-slate-500">
                        {item.quantity} {item.unit} ×{" "}
                        {formatCurrency(item.unit_cost_snapshot)} ={" "}
                        {formatCurrency(item.total_cost)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => deleteIngredient(item.id)}
                      className="forza-button-hover flex h-10 w-10 items-center justify-center rounded-2xl border border-red-100 bg-red-50 text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}

            {!activeRecipeId ? (
              <div className="rounded-3xl bg-amber-50 p-5 text-sm font-black text-amber-800">
                Select or create a recipe before adding ingredients.
              </div>
            ) : null}

            {activeRecipeId && activeRecipeItems.length === 0 ? (
              <div className="rounded-3xl bg-white p-5 text-sm font-bold text-slate-500">
                No ingredients added yet.
              </div>
            ) : null}
          </div>
        </section>
      </section>
    </div>
  );
}

type MetricCardProps = {
  label: string;
  value: string;
  icon: React.ReactNode;
};

function MetricCard({ label, value, icon }: MetricCardProps) {
  return (
    <div className="glass-panel forza-transition forza-hover rounded-[2rem] p-5">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
        {icon}
      </div>
      <p className="text-sm font-bold text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}

type FieldProps = {
  label: string;
  children: React.ReactNode;
};

function Field({ label, children }: FieldProps) {
  return (
    <div>
      <label className="text-sm font-bold text-slate-700">{label}</label>
      <div className="mt-2">{children}</div>
    </div>
  );
}