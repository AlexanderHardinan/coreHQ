"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  Calculator,
  ChefHat,
  Download,
  Flame,
  Globe2,
  Pencil,
  Plus,
  Save,
  Scale,
  ShieldAlert,
  Trash2,
  Utensils,
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
  cuisine: string | null;
  calories: number;
  allergen: string | null;
  procedure: string | null;
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
  waste_shrinkage_percent: number;
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

function formatQty(value: number) {
  const safeValue = Number(value || 0);
  if (Number.isInteger(safeValue)) {
    return String(safeValue);
  }
  
  return String(Number(safeValue.toFixed(3)));
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

function getIngredientGrossQty(quantity: number, wastePercent: number) {
  return Number(quantity || 0) * (1 + Number(wastePercent || 0) / 100);
}

function getIngredientLineCost(item: RecipeItemRecord) {
  return (
    getIngredientGrossQty(item.quantity, item.waste_shrinkage_percent) *
    Number(item.unit_cost_snapshot || 0)
  );
}

function calculateRecipeTotals(
  items: RecipeItemRecord[],
  recipeId: string,
  portionYield: number,
  sellingPrice: number,
) {
  const totalRecipeCost = items
    .filter((item) => item.recipe_id === recipeId)
    .reduce((total, item) => total + getIngredientLineCost(item), 0);

  const costPerPortion =
    Number(portionYield || 0) > 0 ? totalRecipeCost / Number(portionYield) : 0;

  const foodCostPercent =
    Number(sellingPrice || 0) > 0
      ? (costPerPortion / Number(sellingPrice)) * 100
      : 0;

  return {
    total_recipe_cost: totalRecipeCost,
    cost_per_portion: costPerPortion,
    food_cost_percent: foodCostPercent,
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const allowedOpsAreas = getAllowedOpsAreas(role);

  const [productList, setProductList] = useState(products);
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
  const [cuisine, setCuisine] = useState("");
  const [calories, setCalories] = useState("0");
  const [allergen, setAllergen] = useState("");
  const [batchYield, setBatchYield] = useState("1");
  const [portionYield, setPortionYield] = useState("1");
  const [sellingPrice, setSellingPrice] = useState("0");
  const [procedure, setProcedure] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [activeRecipeId, setActiveRecipeId] = useState(recipeList[0]?.id || "");
  const [ingredientProductId, setIngredientProductId] = useState("");
  const [ingredientQty, setIngredientQty] = useState("0");
  const [ingredientWaste, setIngredientWaste] = useState("0");
  const [isIngredientSaving, setIsIngredientSaving] = useState(false);

  useEffect(() => {
    setProductList(products);
  }, [products]);

  useEffect(() => {
    setRecipeList(recipes);
  }, [recipes]);

  useEffect(() => {
    setItemList(recipeItems);
  }, [recipeItems]);

  async function refreshProducts() {
    if (!selectedBrand?.id) {
      return;
    }

    const { data, error } = await supabase
      .from("products")
      .select(
        "id, brand_id, brand_unit_id, ops_area, product_name, sku, unit, unit_cost, current_stock, is_active",
      )
      .eq("brand_id", selectedBrand.id)
      .eq("is_active", true)
      .order("product_name", { ascending: true });

    if (error) {
      toast.error(error.message);
      return;
    }

    setProductList((data || []) as RecipeProduct[]);
  }

  async function refreshRecipesAndItems() {
    if (!selectedBrand?.id) {
      return;
    }

    const { data: recipesData, error: recipesError } = await supabase
      .from("recipes")
      .select(
        "id, brand_id, brand_unit_id, ops_area, recipe_name, recipe_category, cuisine, calories, allergen, procedure, batch_yield, portion_yield, selling_price, food_cost_percent, total_recipe_cost, cost_per_portion, is_active",
      )
      .eq("brand_id", selectedBrand.id)
      .eq("is_active", true)
      .order("recipe_name", { ascending: true });

    if (recipesError) {
      toast.error(recipesError.message);
      return;
    }

    const nextRecipes = (recipesData || []) as RecipeRecord[];
    const recipeIds = nextRecipes.map((recipe) => recipe.id);

    setRecipeList(nextRecipes);

    if (recipeIds.length === 0) {
      setItemList([]);
      setActiveRecipeId("");
      return;
    }

    const { data: itemsData, error: itemsError } = await supabase
      .from("recipe_items")
      .select(
        "id, recipe_id, product_id, quantity, unit, waste_shrinkage_percent, unit_cost_snapshot, total_cost",
      )
      .in("recipe_id", recipeIds);

    if (itemsError) {
      toast.error(itemsError.message);
      return;
    }

    setItemList((itemsData || []) as RecipeItemRecord[]);
  }

  useEffect(() => {
    if (!selectedBrand?.id) {
      return;
    }

    const channel = supabase
      .channel(`recipe-maker-live-${selectedBrand.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
        },
        () => {
          refreshProducts();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "recipes",
        },
        () => {
          refreshRecipesAndItems();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "recipe_items",
        },
        () => {
          refreshRecipesAndItems();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBrand?.id]);

  const visibleProducts = useMemo(
    () =>
      productList.filter(
        (product) =>
          product.brand_unit_id === selectedUnitId &&
          product.ops_area === selectedOpsArea &&
          product.is_active,
      ),
    [productList, selectedOpsArea, selectedUnitId],
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
    setCuisine("");
    setCalories("0");
    setAllergen("");
    setBatchYield("1");
    setPortionYield("1");
    setSellingPrice("0");
    setProcedure("");
  }

  function editRecipe(recipe: RecipeRecord) {
    setMode("edit");
    setEditId(recipe.id);
    setSelectedUnitId(recipe.brand_unit_id);
    setSelectedOpsArea(recipe.ops_area);
    setRecipeName(recipe.recipe_name);
    setRecipeCategory(recipe.recipe_category || "");
    setCuisine(recipe.cuisine || "");
    setCalories(String(recipe.calories || 0));
    setAllergen(recipe.allergen || "");
    setBatchYield(String(recipe.batch_yield || 1));
    setPortionYield(String(recipe.portion_yield || 1));
    setSellingPrice(String(recipe.selling_price || 0));
    setProcedure(recipe.procedure || "");
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
      toast.error("Dish name is required.");
      return;
    }

    setIsSaving(true);

    const payload = {
      brand_id: selectedBrand.id,
      brand_unit_id: selectedUnitId,
      ops_area: selectedOpsArea,
      recipe_name: recipeName.trim(),
      recipe_category: recipeCategory.trim() || null,
      cuisine: cuisine.trim() || null,
      calories: Number(calories || 0),
      allergen: allergen.trim() || null,
      procedure: procedure.trim() || null,
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
        "id, brand_id, brand_unit_id, ops_area, recipe_name, recipe_category, cuisine, calories, allergen, procedure, batch_yield, portion_yield, selling_price, food_cost_percent, total_recipe_cost, cost_per_portion, is_active",
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

    setItemList((current) =>
      current.filter((item) => item.recipe_id !== recipeId),
    );
    setRecipeList((current) =>
      current.filter((recipe) => recipe.id !== recipeId),
    );
    setActiveRecipeId("");
    toast.success("Recipe deleted successfully.");
  }

  async function saveIngredient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeRecipeId) {
      toast.error("Select a recipe first.");
      return;
    }

    const product = productList.find((item) => item.id === ingredientProductId);

    if (!product) {
      toast.error("Select an ingredient product.");
      return;
    }

    const alreadyAdded = itemList.some(
      (item) =>
        item.recipe_id === activeRecipeId && item.product_id === product.id,
    );

    if (alreadyAdded) {
      toast.error(
        "This ingredient is already added to this recipe. Remove it first before adding again.",
      );
      return;
    }

    const qty = Number(ingredientQty || 0);
    const wastePercent = Number(ingredientWaste || 0);

    if (qty <= 0) {
      toast.error("Ingredient quantity must be greater than zero.");
      return;
    }

    if (wastePercent < 0) {
      toast.error("Waste / shrinkage percentage cannot be negative.");
      return;
    }

    setIsIngredientSaving(true);

    const payload = {
      recipe_id: activeRecipeId,
      product_id: product.id,
      quantity: qty,
      unit: product.unit,
      waste_shrinkage_percent: wastePercent,
      unit_cost_snapshot: Number(product.unit_cost || 0),
    };

    const { data, error } = await supabase
      .from("recipe_items")
      .insert(payload)
      .select(
        "id, recipe_id, product_id, quantity, unit, waste_shrinkage_percent, unit_cost_snapshot, total_cost",
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
    setIngredientWaste("0");
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

  function downloadRecipePdf(recipe: RecipeRecord) {
    const recipeUnit = units.find((unit) => unit.id === recipe.brand_unit_id);
    const recipeIngredients = itemList.filter(
      (item) => item.recipe_id === recipe.id,
    );

    const ingredientRows = recipeIngredients
      .map((item) => {
        const product = productList.find(
          (productItem) => productItem.id === item.product_id,
        );

        const grossQty = getIngredientGrossQty(
          item.quantity,
          item.waste_shrinkage_percent,
        );

        return `
          <tr>
            <td>${escapeHtml(product?.product_name || "Unknown Ingredient")}</td>
            <td>${formatQty(item.quantity)}</td>
            <td>${escapeHtml(item.unit)}</td>
            <td>${formatQty(item.waste_shrinkage_percent)}%</td>
            <td>${formatQty(grossQty)} ${escapeHtml(item.unit)}</td>
            <td>${formatCurrency(item.unit_cost_snapshot)}</td>
            <td>${formatCurrency(getIngredientLineCost(item))}</td>
          </tr>
        `;
      })
      .join("");

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(recipe.recipe_name)} Recipe Sheet</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 32px;
              color: #0f172a;
              font-family: Arial, Helvetica, sans-serif;
              background: #ffffff;
            }
            .sheet {
              max-width: 980px;
              margin: 0 auto;
              border: 1px solid #e2e8f0;
              border-radius: 24px;
              overflow: hidden;
            }
            .header {
              padding: 28px;
              background: linear-gradient(135deg, #0f172a, #1e293b);
              color: #ffffff;
            }
            .headerTop {
              display: flex;
              justify-content: space-between;
              gap: 24px;
              align-items: flex-start;
            }
            .brand {
              font-size: 12px;
              letter-spacing: 1.4px;
              text-transform: uppercase;
              font-weight: 900;
              color: #d4af37;
            }
            h1 {
              margin: 10px 0 0;
              font-size: 34px;
              line-height: 1.1;
            }
            .badge {
              display: inline-block;
              padding: 8px 12px;
              border-radius: 999px;
              background: rgba(255,255,255,.12);
              font-size: 12px;
              font-weight: 900;
              white-space: nowrap;
            }
            .content {
              padding: 28px;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 12px;
              margin-bottom: 24px;
            }
            .card {
              border: 1px solid #e2e8f0;
              border-radius: 18px;
              padding: 14px;
              background: #f8fafc;
            }
            .label {
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: .8px;
              color: #64748b;
              font-weight: 900;
            }
            .value {
              margin-top: 6px;
              font-size: 15px;
              color: #0f172a;
              font-weight: 900;
            }
            h2 {
              margin: 26px 0 12px;
              font-size: 18px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              overflow: hidden;
              border-radius: 16px;
              font-size: 12px;
            }
            th {
              text-align: left;
              background: #0f172a;
              color: #ffffff;
              padding: 11px;
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: .7px;
            }
            td {
              border-bottom: 1px solid #e2e8f0;
              padding: 11px;
              vertical-align: top;
            }
            .procedure {
              white-space: pre-wrap;
              border: 1px solid #e2e8f0;
              border-radius: 18px;
              padding: 16px;
              background: #f8fafc;
              line-height: 1.6;
              font-size: 13px;
            }
            .footer {
              margin-top: 28px;
              padding-top: 18px;
              border-top: 1px solid #e2e8f0;
              display: flex;
              justify-content: space-between;
              gap: 18px;
              font-size: 11px;
              color: #64748b;
              font-weight: 700;
            }
            @media print {
              body { padding: 0; }
              .sheet { border: 0; border-radius: 0; }
            }
          </style>
        </head>
        <body>
          <main class="sheet">
            <section class="header">
              <div class="headerTop">
                <div>
                  <div class="brand">🍽️ Forza Unified System</div>
                  <h1>${escapeHtml(recipe.recipe_name)}</h1>
                </div>
                <div class="badge">Professional Recipe Sheet</div>
              </div>
            </section>

            <section class="content">
              <div class="grid">
                <div class="card"><div class="label">Category</div><div class="value">${escapeHtml(recipe.recipe_category || "-")}</div></div>
                <div class="card"><div class="label">Cuisine</div><div class="value">${escapeHtml(recipe.cuisine || "-")}</div></div>
                <div class="card"><div class="label">Calories</div><div class="value">${formatQty(recipe.calories || 0)}</div></div>
                <div class="card"><div class="label">Allergen</div><div class="value">${escapeHtml(recipe.allergen || "None")}</div></div>
                <div class="card"><div class="label">Batch Yield</div><div class="value">${formatQty(recipe.batch_yield)}</div></div>
                <div class="card"><div class="label">Portion Yield</div><div class="value">${formatQty(recipe.portion_yield)}</div></div>
                <div class="card"><div class="label">Cost / Portion</div><div class="value">${formatCurrency(recipe.cost_per_portion)}</div></div>
                <div class="card"><div class="label">Selling Price</div><div class="value">${formatCurrency(recipe.selling_price)}</div></div>
              </div>

              <h2>🧾 Ingredients</h2>
              <table>
                <thead>
                  <tr>
                    <th>Ingredient Name</th>
                    <th>Qty</th>
                    <th>UOM</th>
                    <th>Waste / Shrinkage</th>
                    <th>Gross Qty</th>
                    <th>Unit Cost</th>
                    <th>Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  ${
                    ingredientRows ||
                    `<tr><td colspan="7">No ingredients added.</td></tr>`
                  }
                </tbody>
              </table>

              <h2>🔥 Procedure</h2>
              <div class="procedure">${escapeHtml(recipe.procedure || "No procedure added.")}</div>

              <div class="footer">
                <div>Branch: ${escapeHtml(recipeUnit?.name || "Selected Unit")}</div>
                <div>Developer Rights Chef Alex @FORZA 2026</div>
              </div>
            </section>
          </main>
          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=1100,height=900");

    if (!printWindow) {
      toast.error("Allow popups to download the recipe PDF.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-[2rem] p-6">
        <div className="grid gap-6 xl:grid-cols-[1fr_360px] xl:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-slate-400">
              Professional Recipe Maker
            </p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">
              {selectedBrand?.name || "Selected Brand"} Recipe Sheet
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Build detailed professional recipes with cuisine, calories,
              allergens, procedure, ingredient costing, waste / shrinkage, and
              PDF export.
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
          icon={<Scale size={22} />}
        />
        <MetricCard
          label="Recipe Cost"
          value={formatCurrency(activeRecipe?.total_recipe_cost || 0)}
          icon={<Calculator size={22} />}
        />
        <MetricCard
          label="Cost Per Portion"
          value={formatCurrency(activeRecipe?.cost_per_portion || 0)}
          icon={<Utensils size={22} />}
        />
      </section>

      <section className="glass-panel rounded-[2rem] p-6">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-slate-400">
              Recipe Master
            </p>
            <h2 className="text-2xl font-black text-slate-950">
              Create / Edit Professional Recipe
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
          <Field label="Dish Name">
            <input
              required
              value={recipeName}
              onChange={(event) => setRecipeName(event.target.value)}
              className="forza-input"
              placeholder="Example: Signature Beef Tenderloin"
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

          <Field label="Cuisine">
            <input
              value={cuisine}
              onChange={(event) => setCuisine(event.target.value)}
              className="forza-input"
              placeholder="Example: Mediterranean"
            />
          </Field>

          <Field label="Calories">
            <input
              type="number"
              step="0.001"
              value={calories}
              onChange={(event) => setCalories(event.target.value)}
              className="forza-input"
            />
          </Field>

          <Field label="Allergen">
            <input
              value={allergen}
              onChange={(event) => setAllergen(event.target.value)}
              className="forza-input"
              placeholder="Example: Dairy, nuts, gluten"
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

          <div className="md:col-span-2 xl:col-span-4">
            <Field label="Procedure">
              <textarea
                value={procedure}
                onChange={(event) => setProcedure(event.target.value)}
                className="forza-input min-h-[150px] resize-y"
                placeholder="Write the professional preparation, cooking, plating, and service procedure..."
              />
            </Field>
          </div>

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
                    {recipe.recipe_category || "No category"} ·{" "}
                    {recipe.cuisine || "No cuisine"} ·{" "}
                    {formatQty(recipe.calories || 0)} calories
                  </p>
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

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => editRecipe(recipe)}
                    className="forza-button-hover flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700"
                  >
                    <Pencil size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadRecipePdf(recipe)}
                    className="forza-button-hover flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-700"
                  >
                    <Download size={16} />
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
              Ingredient Details
            </p>
            <h2 className="text-2xl font-black text-slate-950">
              Product Ingredients + Waste
            </h2>
          </div>

          <form onSubmit={saveIngredient} className="grid gap-4 md:grid-cols-2">
            <Field label="Ingredient Name">
              <select
                value={ingredientProductId}
                onChange={(event) => setIngredientProductId(event.target.value)}
                className="forza-input"
              >
                <option value="">Select ingredient name</option>
                {visibleProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.product_name} — Actual Qty Left:{" "}
                    {formatQty(product.current_stock)} {product.unit}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Qty">
              <input
                type="number"
                step="0.001"
                value={ingredientQty}
                onChange={(event) => setIngredientQty(event.target.value)}
                className="forza-input"
              />
            </Field>

            <Field label="UOM">
              <input
                value={
                  productList.find((product) => product.id === ingredientProductId)
                    ?.unit || ""
                }
                readOnly
                className="forza-input bg-slate-50"
                placeholder="Auto from product"
              />
            </Field>

            <Field label="Waste / Shrinkage %">
              <input
                type="number"
                step="0.001"
                value={ingredientWaste}
                onChange={(event) => setIngredientWaste(event.target.value)}
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
              const product = productList.find(
                (productItem) => productItem.id === item.product_id,
              );

              const grossQty = getIngredientGrossQty(
                item.quantity,
                item.waste_shrinkage_percent,
              );

              return (
                <div
                  key={item.id}
                  className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-black text-slate-950">
                        {product?.product_name || "Unknown Ingredient"}
                      </h3>
                      <p className="mt-1 text-sm font-bold text-slate-500">
                        Qty: {formatQty(item.quantity)} {item.unit} · Waste:{" "}
                        {formatQty(item.waste_shrinkage_percent)}% · Gross:{" "}
                        {formatQty(grossQty)} {item.unit}
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-500">
                        Cost: {formatCurrency(item.unit_cost_snapshot)} /{" "}
                        {item.unit} · Line:{" "}
                        {formatCurrency(getIngredientLineCost(item))}
                      </p>
                      <p className="mt-1 text-xs font-black uppercase tracking-wide text-slate-400">
                        Actual Qty Left:{" "}
                        {product
                          ? `${formatQty(product.current_stock)} ${product.unit}`
                          : "Unavailable"}
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