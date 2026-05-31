"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  CalendarClock,
  CheckCircle2,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { UserRole } from "@/lib/auth/permissions";

export type OpsArea = "kitchen" | "bar" | "global";

export type InventoryBrand = {
  id: string;
  name: string;
  code: string;
};

export type InventoryUnit = {
  id: string;
  brand_id: string | null;
  name: string;
  code: string;
  city: string | null;
  country: string | null;
  is_active: boolean;
};

export type InventoryCategory = {
  id: string;
  brand_id: string | null;
  brand_unit_id: string | null;
  ops_area: OpsArea;
  name: string;
  icon: string;
  is_active: boolean;
};

export type InventoryProduct = {
  id: string;
  brand_id: string | null;
  brand_unit_id: string;
  category_id: string | null;
  ops_area: OpsArea;
  product_name: string;
  sku: string;
  unit: string;
  supplier_name: string | null;
  opening_stock: number;
  current_stock: number;
  minimum_stock: number;
  maximum_stock: number;
  unit_cost: number;
  expiry_date: string | null;
  storage_area: string | null;
  is_active: boolean;
};

type InventoryPanelProps = {
  role: UserRole;
  selectedBrand: InventoryBrand | null;
  units: InventoryUnit[];
  categories: InventoryCategory[];
  products: InventoryProduct[];
};

type EditMode = "create" | "edit";

const opsAreaLabels: Record<OpsArea, string> = {
  kitchen: "Kitchen",
  bar: "Bar",
  global: "Global",
};

const unitOptions = ["kg", "g", "liter", "ml", "bottle", "pcs", "box", "pack"];

function toCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(value || 0);
}

function getStockStatus(product: InventoryProduct) {
  if (product.maximum_stock > 0 && product.current_stock > product.maximum_stock) {
    return {
      label: "Over Stocked",
      className: "bg-amber-50 text-amber-700",
    };
  }

  if (product.current_stock <= product.minimum_stock) {
    return {
      label: "Low Stock",
      className: "bg-red-50 text-red-700",
    };
  }

  return {
    label: "On Track",
    className: "bg-emerald-50 text-emerald-700",
  };
}

function getExpiryStatus(expiryDate: string | null) {
  if (!expiryDate) {
    return {
      label: "No Expiry",
      className: "bg-slate-100 text-slate-700",
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(`${expiryDate}T00:00:00`);
  const differenceMs = expiry.getTime() - today.getTime();
  const differenceDays = Math.ceil(differenceMs / (1000 * 60 * 60 * 24));

  if (differenceDays < 0) {
    return {
      label: "Expired",
      className: "bg-red-50 text-red-700",
    };
  }

  if (differenceDays <= 14) {
    return {
      label: "Expiring Soon",
      className: "bg-amber-50 text-amber-700",
    };
  }

  return {
    label: "Safe",
    className: "bg-emerald-50 text-emerald-700",
  };
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

export function InventoryPanel({
  role,
  selectedBrand,
  units,
  categories,
  products,
}: InventoryPanelProps) {
  const supabase = createSupabaseBrowserClient();

  const allowedOpsAreas = getAllowedOpsAreas(role);

  const [productList, setProductList] = useState(products);
  const [mode, setMode] = useState<EditMode>("create");
  const [editId, setEditId] = useState("");

  const [selectedUnitId, setSelectedUnitId] = useState(units[0]?.id || "");
  const [selectedOpsArea, setSelectedOpsArea] = useState<OpsArea>(
    allowedOpsAreas[0] || "global",
  );
  const [search, setSearch] = useState("");

  const [productName, setProductName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [sku, setSku] = useState("");
  const [unit, setUnit] = useState("kg");
  const [supplierName, setSupplierName] = useState("");
  const [openingStock, setOpeningStock] = useState("0");
  const [currentStock, setCurrentStock] = useState("0");
  const [minimumStock, setMinimumStock] = useState("0");
  const [maximumStock, setMaximumStock] = useState("0");
  const [unitCost, setUnitCost] = useState("0");
  const [expiryDate, setExpiryDate] = useState("");
  const [storageArea, setStorageArea] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const selectedUnit = useMemo(
    () => units.find((item) => item.id === selectedUnitId) || null,
    [selectedUnitId, units],
  );

  const visibleCategories = useMemo(
    () =>
      categories.filter((category) => {
        const matchesUnit =
          !category.brand_unit_id || category.brand_unit_id === selectedUnitId;
        const matchesArea = category.ops_area === selectedOpsArea;
        const isAllowedArea = allowedOpsAreas.includes(category.ops_area);

        return matchesUnit && matchesArea && isAllowedArea && category.is_active;
      }),
    [allowedOpsAreas, categories, selectedOpsArea, selectedUnitId],
  );

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return productList.filter((product) => {
      const matchesUnit = product.brand_unit_id === selectedUnitId;
      const matchesArea = product.ops_area === selectedOpsArea;
      const allowedArea = allowedOpsAreas.includes(product.ops_area);
      const matchesSearch =
        !query ||
        product.product_name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        String(product.supplier_name || "").toLowerCase().includes(query);

      return matchesUnit && matchesArea && allowedArea && matchesSearch;
    });
  }, [allowedOpsAreas, productList, search, selectedOpsArea, selectedUnitId]);

  const inventoryStats = useMemo(() => {
    const lowStock = visibleProducts.filter(
      (product) => getStockStatus(product).label === "Low Stock",
    ).length;

    const overStocked = visibleProducts.filter(
      (product) => getStockStatus(product).label === "Over Stocked",
    ).length;

    const expiring = visibleProducts.filter((product) =>
      ["Expired", "Expiring Soon"].includes(getExpiryStatus(product.expiry_date).label),
    ).length;

    const value = visibleProducts.reduce(
      (total, product) => total + product.current_stock * product.unit_cost,
      0,
    );

    return {
      totalProducts: visibleProducts.length,
      lowStock,
      overStocked,
      expiring,
      value,
    };
  }, [visibleProducts]);

  function resetForm() {
    setMode("create");
    setEditId("");
    setProductName("");
    setCategoryId("");
    setSku("");
    setUnit("kg");
    setSupplierName("");
    setOpeningStock("0");
    setCurrentStock("0");
    setMinimumStock("0");
    setMaximumStock("0");
    setUnitCost("0");
    setExpiryDate("");
    setStorageArea("");
  }

  function generateSku() {
    const brandCode = selectedBrand?.code || "BRAND";
    const unitCode = selectedUnit?.code || "UNIT";
    const areaCode = selectedOpsArea.toUpperCase();
    const category = visibleCategories.find((item) => item.id === categoryId);
    const categoryCode = category ? toCode(category.name) : "GENERAL";

    const existingCount =
      productList.filter(
        (product) =>
          product.brand_unit_id === selectedUnitId &&
          product.ops_area === selectedOpsArea &&
          product.category_id === categoryId,
      ).length + 1;

    const nextNumber = String(existingCount).padStart(5, "0");

    setSku(`${brandCode}-${unitCode}-${areaCode}-${categoryCode}-${nextNumber}`);
  }

  function editProduct(product: InventoryProduct) {
    setMode("edit");
    setEditId(product.id);
    setSelectedUnitId(product.brand_unit_id);
    setSelectedOpsArea(product.ops_area);
    setProductName(product.product_name);
    setCategoryId(product.category_id || "");
    setSku(product.sku);
    setUnit(product.unit);
    setSupplierName(product.supplier_name || "");
    setOpeningStock(String(product.opening_stock || 0));
    setCurrentStock(String(product.current_stock || 0));
    setMinimumStock(String(product.minimum_stock || 0));
    setMaximumStock(String(product.maximum_stock || 0));
    setUnitCost(String(product.unit_cost || 0));
    setExpiryDate(product.expiry_date || "");
    setStorageArea(product.storage_area || "");
  }

  async function saveProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedBrand?.id) {
      toast.error("Selected brand is required.");
      return;
    }

    if (!selectedUnitId) {
      toast.error("Select a branch unit first.");
      return;
    }

    if (!productName.trim()) {
      toast.error("Product name is required.");
      return;
    }

    if (!sku.trim()) {
      toast.error("SKU is required. Generate or enter a SKU.");
      return;
    }

    setIsSaving(true);

    const payload = {
      brand_id: selectedBrand.id,
      brand_unit_id: selectedUnitId,
      category_id: categoryId || null,
      ops_area: selectedOpsArea,
      product_name: productName.trim(),
      sku: sku.trim().toUpperCase(),
      unit,
      supplier_name: supplierName.trim() || null,
      opening_stock: Number(openingStock || 0),
      current_stock: Number(currentStock || 0),
      minimum_stock: Number(minimumStock || 0),
      maximum_stock: Number(maximumStock || 0),
      unit_cost: Number(unitCost || 0),
      expiry_date: expiryDate || null,
      storage_area: storageArea.trim() || null,
      is_active: true,
    };

    if (mode === "edit") {
      const { error } = await supabase
        .from("products")
        .update(payload)
        .eq("id", editId);

      setIsSaving(false);

      if (error) {
        toast.error(error.message);
        return;
      }

      setProductList((current) =>
        current.map((product) =>
          product.id === editId ? { ...product, ...payload } : product,
        ),
      );

      toast.success("Product updated successfully.");
      resetForm();
      return;
    }

    const { data, error } = await supabase
      .from("products")
      .insert(payload)
      .select(
        "id, brand_id, brand_unit_id, category_id, ops_area, product_name, sku, unit, supplier_name, opening_stock, current_stock, minimum_stock, maximum_stock, unit_cost, expiry_date, storage_area, is_active",
      )
      .single();

    setIsSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setProductList((current) => [...current, data as InventoryProduct]);
    toast.success("Product created successfully.");
    resetForm();
  }

  async function deleteProduct(productId: string) {
    const confirmed = window.confirm("Delete this product? This cannot be undone.");

    if (!confirmed) {
      return;
    }

    const { error } = await supabase.from("products").delete().eq("id", productId);

    if (error) {
      toast.error(error.message);
      return;
    }

    setProductList((current) => current.filter((item) => item.id !== productId));
    toast.success("Product deleted successfully.");
  }

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-[2rem] p-6">
        <div className="grid gap-5 xl:grid-cols-[1fr_360px] xl:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-slate-400">
              Inventory Foundation
            </p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">
              {selectedBrand?.name || "Selected Brand"} Inventory
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Manage products by branch, area, stock level, cost, expiry date,
              and SKU. Inventory access follows the user role and selected
              brand context.
            </p>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white/80 p-5 shadow-sm">
            <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">
              Branch Unit
            </label>
            <select
              value={selectedUnitId}
              onChange={(event) => setSelectedUnitId(event.target.value)}
              className="forza-input"
            >
              {units.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Products"
          value={String(inventoryStats.totalProducts)}
          icon={<Boxes size={22} />}
        />
        <MetricCard
          label="Inventory Value"
          value={formatCurrency(inventoryStats.value)}
          icon={<CheckCircle2 size={22} />}
        />
        <MetricCard
          label="Low Stock"
          value={String(inventoryStats.lowStock)}
          icon={<AlertTriangle size={22} />}
        />
        <MetricCard
          label="Over Stocked"
          value={String(inventoryStats.overStocked)}
          icon={<Boxes size={22} />}
        />
        <MetricCard
          label="Expiry Watch"
          value={String(inventoryStats.expiring)}
          icon={<CalendarClock size={22} />}
        />
      </section>

      <section className="glass-panel rounded-[2rem] p-6">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-slate-400">
              Product Control
            </p>
            <h2 className="text-2xl font-black text-slate-950">
              Create / Edit Product
            </h2>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={selectedOpsArea}
              onChange={(event) => {
                setSelectedOpsArea(event.target.value as OpsArea);
                setCategoryId("");
              }}
              className="forza-input sm:min-w-[180px]"
            >
              {allowedOpsAreas.map((area) => (
                <option key={area} value={area}>
                  {opsAreaLabels[area]}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={generateSku}
              className="forza-button-hover inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-xl"
            >
              <Plus size={17} />
              Generate SKU
            </button>
          </div>
        </div>

        <form onSubmit={saveProduct} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Product Name">
            <input
              required
              value={productName}
              onChange={(event) => setProductName(event.target.value)}
              className="forza-input"
              placeholder="Example: Tomato"
            />
          </Field>

          <Field label="Category">
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="forza-input"
            >
              <option value="">No category</option>
              {visibleCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="SKU">
            <input
              required
              value={sku}
              onChange={(event) => setSku(event.target.value.toUpperCase())}
              className="forza-input"
              placeholder="Auto generated SKU"
            />
          </Field>

          <Field label="Unit">
            <select
              value={unit}
              onChange={(event) => setUnit(event.target.value)}
              className="forza-input"
            >
              {unitOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Supplier">
            <input
              value={supplierName}
              onChange={(event) => setSupplierName(event.target.value)}
              className="forza-input"
              placeholder="Supplier name"
            />
          </Field>

          <Field label="Opening Stock">
            <input
              type="number"
              step="0.001"
              value={openingStock}
              onChange={(event) => setOpeningStock(event.target.value)}
              className="forza-input"
            />
          </Field>

          <Field label="Current Stock">
            <input
              type="number"
              step="0.001"
              value={currentStock}
              onChange={(event) => setCurrentStock(event.target.value)}
              className="forza-input"
            />
          </Field>

          <Field label="Minimum Stock">
            <input
              type="number"
              step="0.001"
              value={minimumStock}
              onChange={(event) => setMinimumStock(event.target.value)}
              className="forza-input"
            />
          </Field>

          <Field label="Maximum Stock">
            <input
              type="number"
              step="0.001"
              value={maximumStock}
              onChange={(event) => setMaximumStock(event.target.value)}
              className="forza-input"
            />
          </Field>

          <Field label="Unit Cost">
            <input
              type="number"
              step="0.0001"
              value={unitCost}
              onChange={(event) => setUnitCost(event.target.value)}
              className="forza-input"
            />
          </Field>

          <Field label="Expiry Date">
            <input
              type="date"
              value={expiryDate}
              onChange={(event) => setExpiryDate(event.target.value)}
              className="forza-input"
            />
          </Field>

          <Field label="Storage Area">
            <input
              value={storageArea}
              onChange={(event) => setStorageArea(event.target.value)}
              className="forza-input"
              placeholder="Example: Dry Store"
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
                  ? "Update Product"
                  : "Create Product"}
            </button>

            {mode === "edit" ? (
              <button
                type="button"
                onClick={resetForm}
                className="forza-button-hover flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-700"
              >
                <X size={18} />
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="glass-panel rounded-[2rem] p-6">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-slate-400">
              Product List
            </p>
            <h2 className="text-2xl font-black text-slate-950">
              {opsAreaLabels[selectedOpsArea]} Products
            </h2>
          </div>

          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="forza-input pl-11 xl:min-w-[320px]"
              placeholder="Search product, SKU, supplier..."
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] border-separate border-spacing-y-3">
            <thead>
              <tr className="text-left text-xs font-black uppercase tracking-wide text-slate-400">
                <th className="px-4">Product</th>
                <th className="px-4">SKU</th>
                <th className="px-4">Area</th>
                <th className="px-4">Current</th>
                <th className="px-4">Min</th>
                <th className="px-4">Max</th>
                <th className="px-4">Cost</th>
                <th className="px-4">Value</th>
                <th className="px-4">Stock Status</th>
                <th className="px-4">Expiry</th>
                <th className="px-4">Action</th>
              </tr>
            </thead>

            <tbody>
              {visibleProducts.map((product) => {
                const stockStatus = getStockStatus(product);
                const expiryStatus = getExpiryStatus(product.expiry_date);

                return (
                  <tr key={product.id} className="rounded-2xl bg-white shadow-sm">
                    <td className="rounded-l-2xl px-4 py-4">
                      <p className="text-sm font-black text-slate-950">
                        {product.product_name}
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-400">
                        {product.supplier_name || "No supplier"}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-slate-700">
                      {product.sku}
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-slate-700">
                      {opsAreaLabels[product.ops_area]}
                    </td>
                    <td className="px-4 py-4 text-sm font-black text-slate-950">
                      {product.current_stock} {product.unit}
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-slate-600">
                      {product.minimum_stock}
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-slate-600">
                      {product.maximum_stock}
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-slate-700">
                      {formatCurrency(product.unit_cost)}
                    </td>
                    <td className="px-4 py-4 text-sm font-black text-slate-950">
                      {formatCurrency(product.current_stock * product.unit_cost)}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${stockStatus.className}`}
                      >
                        {stockStatus.label}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${expiryStatus.className}`}
                      >
                        {expiryStatus.label}
                      </span>
                    </td>
                    <td className="rounded-r-2xl px-4 py-4">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => editProduct(product)}
                          className="forza-button-hover flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteProduct(product.id)}
                          className="forza-button-hover flex h-10 w-10 items-center justify-center rounded-2xl border border-red-100 bg-red-50 text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {visibleProducts.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="rounded-2xl bg-white px-4 py-8 text-center text-sm font-bold text-slate-500"
                  >
                    No products found for this branch and area.
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