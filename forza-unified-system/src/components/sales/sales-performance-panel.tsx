"use client";

import { useMemo, useState } from "react";
import {
  ChefHat,
  CircleDollarSign,
  Plus,
  ReceiptText,
  Save,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { UserRole } from "@/lib/auth/permissions";

export type OpsArea = "kitchen" | "bar" | "global";

export type SalesUnit = {
  id: string;
  brand_id: string | null;
  name: string;
  code: string;
  is_active: boolean;
};

export type SalesRecipe = {
  id: string;
  brand_id: string | null;
  brand_unit_id: string;
  ops_area: OpsArea;
  recipe_name: string;
  recipe_category: string | null;
  selling_price: number;
  cost_per_portion: number;
  is_active: boolean;
};

export type SoldItemRecord = {
  id: string;
  sale_id: string | null;
  brand_id: string | null;
  brand_unit_id: string;
  recipe_id: string | null;
  product_id: string | null;
  ops_area: OpsArea;
  item_name: string;
  quantity: number;
  selling_price: number;
  total_sales: number;
  sold_date: string;
  created_by: string | null;
  created_at: string | null;
};

type SalesPerformancePanelProps = {
  userId: string;
  role: UserRole;
  selectedBrand: {
    id: string;
    name: string;
    code: string;
  } | null;
  units: SalesUnit[];
  recipes: SalesRecipe[];
  soldItems: SoldItemRecord[];
};

const opsAreaLabels: Record<OpsArea, string> = {
  kitchen: "Kitchen",
  bar: "Bar",
  global: "Global",
};

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

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

export function SalesPerformancePanel({
  userId,
  role,
  selectedBrand,
  units,
  recipes,
  soldItems,
}: SalesPerformancePanelProps) {
  const supabase = createSupabaseBrowserClient();
  const allowedOpsAreas = getAllowedOpsAreas(role);

  const [soldItemList, setSoldItemList] = useState(soldItems);
  const [selectedUnitId, setSelectedUnitId] = useState(units[0]?.id || "");
  const [selectedOpsArea, setSelectedOpsArea] = useState<OpsArea>(
    allowedOpsAreas[0] || "kitchen",
  );

  const [recipeId, setRecipeId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [sellingPrice, setSellingPrice] = useState("0");
  const [soldDate, setSoldDate] = useState(todayDate());
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const visibleRecipes = useMemo(
    () =>
      recipes.filter(
        (recipe) =>
          recipe.brand_unit_id === selectedUnitId &&
          recipe.ops_area === selectedOpsArea &&
          recipe.is_active,
      ),
    [recipes, selectedOpsArea, selectedUnitId],
  );

  const selectedRecipe = useMemo(
    () => recipes.find((recipe) => recipe.id === recipeId) || null,
    [recipeId, recipes],
  );

  const visibleSoldItems = useMemo(
    () =>
      soldItemList.filter(
        (item) =>
          item.brand_unit_id === selectedUnitId &&
          item.ops_area === selectedOpsArea,
      ),
    [selectedOpsArea, selectedUnitId, soldItemList],
  );

  const salesStats = useMemo(() => {
    const totalQty = visibleSoldItems.reduce(
      (total, item) => total + Number(item.quantity || 0),
      0,
    );

    const totalSales = visibleSoldItems.reduce(
      (total, item) => total + Number(item.total_sales || 0),
      0,
    );

    const averageSale =
      visibleSoldItems.length > 0 ? totalSales / visibleSoldItems.length : 0;

    return {
      count: visibleSoldItems.length,
      totalQty,
      totalSales,
      averageSale,
    };
  }, [visibleSoldItems]);

  function handleRecipeChange(nextRecipeId: string) {
    const recipe = recipes.find((item) => item.id === nextRecipeId);

    setRecipeId(nextRecipeId);
    setSellingPrice(String(recipe?.selling_price || 0));
  }

  async function saveSoldDish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedBrand?.id) {
      toast.error("Selected brand is required.");
      return;
    }

    if (!selectedUnitId) {
      toast.error("Select a branch unit.");
      return;
    }

    if (!selectedRecipe) {
      toast.error("Select a recipe / dish.");
      return;
    }

    const qty = Number(quantity || 0);
    const price = Number(sellingPrice || 0);

    if (qty <= 0) {
      toast.error("Sold quantity must be greater than zero.");
      return;
    }

    setIsSaving(true);

    const totalSales = qty * price;

    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .insert({
        brand_id: selectedBrand.id,
        brand_unit_id: selectedUnitId,
        sale_date: soldDate,
        gross_sales: totalSales,
        discounts: 0,
        guest_count: 0,
        notes: notes.trim() || null,
        created_by: userId,
        updated_by: userId,
      })
      .select("id")
      .single();

    if (saleError || !sale) {
      setIsSaving(false);
      toast.error(saleError?.message || "Failed to create sale.");
      return;
    }

    const { data: soldItem, error: soldItemError } = await supabase
      .from("sold_items")
      .insert({
        sale_id: sale.id,
        brand_id: selectedBrand.id,
        brand_unit_id: selectedUnitId,
        recipe_id: selectedRecipe.id,
        product_id: null,
        ops_area: selectedRecipe.ops_area,
        item_name: selectedRecipe.recipe_name,
        quantity: qty,
        selling_price: price,
        sold_date: soldDate,
        created_by: userId,
      })
      .select(
        "id, sale_id, brand_id, brand_unit_id, recipe_id, product_id, ops_area, item_name, quantity, selling_price, total_sales, sold_date, created_by, created_at",
      )
      .single();

    setIsSaving(false);

    if (soldItemError || !soldItem) {
      toast.error(soldItemError?.message || "Failed to create sold item.");
      return;
    }

    setSoldItemList((current) => [soldItem as SoldItemRecord, ...current]);
    setRecipeId("");
    setQuantity("1");
    setSellingPrice("0");
    setNotes("");

    toast.success("Dish sold. Ingredients deducted from inventory.");
  }

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-[2rem] p-6">
        <div className="grid gap-6 xl:grid-cols-[1fr_360px] xl:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-slate-400">
              Sales Performance
            </p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">
              Sold Dish Entry
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Record recipe sales here. Every sold dish creates a sold item and
              automatically deducts all linked ingredients from inventory in
              realtime.
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
                setRecipeId("");
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
          label="Sold Entries"
          value={String(salesStats.count)}
          icon={<ReceiptText size={22} />}
        />
        <MetricCard
          label="Sold Qty"
          value={String(salesStats.totalQty)}
          icon={<ChefHat size={22} />}
        />
        <MetricCard
          label="Total Sales"
          value={formatCurrency(salesStats.totalSales)}
          icon={<CircleDollarSign size={22} />}
        />
        <MetricCard
          label="Average Sale"
          value={formatCurrency(salesStats.averageSale)}
          icon={<TrendingUp size={22} />}
        />
      </section>

      <section className="glass-panel rounded-[2rem] p-6">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-slate-400">
              Sold Dish
            </p>
            <h2 className="text-2xl font-black text-slate-950">
              Recipe Sale Entry
            </h2>
          </div>

          <select
            value={selectedOpsArea}
            onChange={(event) => {
              setSelectedOpsArea(event.target.value as OpsArea);
              setRecipeId("");
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
          onSubmit={saveSoldDish}
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <Field label="Recipe / Dish">
            <select
              required
              value={recipeId}
              onChange={(event) => handleRecipeChange(event.target.value)}
              className="forza-input"
            >
              <option value="">Select recipe</option>
              {visibleRecipes.map((recipe) => (
                <option key={recipe.id} value={recipe.id}>
                  {recipe.recipe_name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Sold Qty">
            <input
              type="number"
              step="0.001"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
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

          <Field label="Sold Date">
            <input
              type="date"
              value={soldDate}
              onChange={(event) => setSoldDate(event.target.value)}
              className="forza-input"
            />
          </Field>

          <div className="md:col-span-2 xl:col-span-4">
            <Field label="Notes">
              <input
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="forza-input"
                placeholder="Optional sale notes"
              />
            </Field>
          </div>

          <div className="md:col-span-2 xl:col-span-4">
            <button
              type="submit"
              disabled={isSaving}
              className="forza-button-hover flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={18} />
              {isSaving ? "Saving Sale..." : "Save Sold Dish"}
            </button>
          </div>
        </form>
      </section>

      <section className="glass-panel rounded-[2rem] p-6">
        <div className="mb-5">
          <p className="text-sm font-black uppercase tracking-wide text-slate-400">
            Sales Ledger
          </p>
          <h2 className="text-2xl font-black text-slate-950">
            Sold Recipes / Dishes
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-separate border-spacing-y-3">
            <thead>
              <tr className="text-left text-xs font-black uppercase tracking-wide text-slate-400">
                <th className="px-4">Date</th>
                <th className="px-4">Dish</th>
                <th className="px-4">Area</th>
                <th className="px-4">Qty</th>
                <th className="px-4">Price</th>
                <th className="px-4">Total</th>
              </tr>
            </thead>
            <tbody>
              {visibleSoldItems.map((item) => (
                <tr key={item.id} className="rounded-2xl bg-white shadow-sm">
                  <td className="rounded-l-2xl px-4 py-4 text-sm font-bold text-slate-700">
                    {item.sold_date}
                  </td>
                  <td className="px-4 py-4 text-sm font-black text-slate-950">
                    {item.item_name}
                  </td>
                  <td className="px-4 py-4 text-sm font-bold text-slate-700">
                    {opsAreaLabels[item.ops_area]}
                  </td>
                  <td className="px-4 py-4 text-sm font-bold text-slate-700">
                    {item.quantity}
                  </td>
                  <td className="px-4 py-4 text-sm font-bold text-slate-700">
                    {formatCurrency(item.selling_price)}
                  </td>
                  <td className="rounded-r-2xl px-4 py-4 text-sm font-black text-slate-950">
                    {formatCurrency(item.total_sales)}
                  </td>
                </tr>
              ))}

              {visibleSoldItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="rounded-2xl bg-white px-4 py-8 text-center text-sm font-bold text-slate-500"
                  >
                    No sold dishes found for this branch and area.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
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