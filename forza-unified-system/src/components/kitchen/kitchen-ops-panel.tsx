"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Boxes,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Download,
  PackageCheck,
  Save,
  Search,
  ShieldAlert,
  Trash2,
  Utensils,
} from "lucide-react";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { UserRole } from "@/lib/auth/permissions";

export type KitchenProduct = {
  id: string;
  brand_id: string | null;
  brand_unit_id: string;
  category_id: string | null;
  ops_area: "kitchen" | "bar" | "global";
  product_name: string;
  sku: string;
  unit: string;
  supplier_name: string | null;
  current_stock: number;
  minimum_stock: number;
  maximum_stock: number;
  unit_cost: number;
  expiry_date: string | null;
  is_active: boolean;
};

export type KitchenUnit = {
  id: string;
  brand_id: string | null;
  name: string;
  code: string;
  is_active: boolean;
};

export type KitchenMovementType =
  | "product_in"
  | "production_consumption"
  | "waste"
  | "shrinkage"
  | "stock_count";

export type KitchenMovement = {
  id: string;
  brand_id: string | null;
  brand_unit_id: string;
  product_id: string;
  ops_area: "kitchen" | "bar" | "global";
  movement_type: KitchenMovementType | string;
  quantity: number;
  unit_cost: number | null;
  reference_code: string | null;
  notes: string | null;
  movement_date: string;
  system_balance_after: number | null;
  physical_count_qty: number | null;
  discrepancy_qty: number | null;
  created_at: string | null;
};

type KitchenOpsPanelProps = {
  userId: string;
  role: UserRole;
  selectedBrand: {
    id: string;
    name: string;
    code: string;
  } | null;
  units: KitchenUnit[];
  products: KitchenProduct[];
  movements: KitchenMovement[];
};

const kitchenMovementTypes: {
  value: KitchenMovementType;
  label: string;
  shortLabel: string;
  description: string;
  direction: "in" | "out" | "count";
  icon: typeof PackageCheck;
}[] = [
  {
    value: "product_in",
    label: "Product In / Delivery",
    shortLabel: "Delivery In",
    description: "Receive supplier deliveries into kitchen stock.",
    direction: "in",
    icon: PackageCheck,
  },
  {
    value: "production_consumption",
    label: "Production Consumption",
    shortLabel: "Production Use",
    description: "Record raw material usage for prep and production.",
    direction: "out",
    icon: Utensils,
  },
  {
    value: "waste",
    label: "Waste",
    shortLabel: "Waste",
    description: "Record spoiled, damaged, or unusable kitchen stock.",
    direction: "out",
    icon: Trash2,
  },
  {
    value: "shrinkage",
    label: "Shrinkage",
    shortLabel: "Shrinkage",
    description: "Record trimming, evaporation, loss, or handling shrinkage.",
    direction: "out",
    icon: ArrowDownCircle,
  },
  {
    value: "stock_count",
    label: "Physical Stock Count",
    shortLabel: "Stock Count",
    description: "Count actual kitchen stock and detect discrepancy.",
    direction: "count",
    icon: ClipboardList,
  },
];

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatQty(value: number) {
  const safeValue = Number(value || 0);

  if (Number.isInteger(safeValue)) {
    return String(safeValue);
  }

  return String(Number(safeValue.toFixed(3)));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("mk-MK", {
    style: "currency",
    currency: "EUR",
    currencyDisplay: "symbol",
  }).format(value || 0);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getMovementConfig(type: string) {
  return kitchenMovementTypes.find((item) => item.value === type);
}

function getMovementLabel(type: string) {
  return getMovementConfig(type)?.label || type.replaceAll("_", " ");
}

function getMovementDirection(type: string) {
  return getMovementConfig(type)?.direction || "count";
}

function getStockStatus(product: KitchenProduct) {
  if (
    Number(product.maximum_stock || 0) > 0 &&
    Number(product.current_stock || 0) > Number(product.maximum_stock || 0)
  ) {
    return {
      label: "Over Stocked",
      className: "bg-amber-50 text-amber-700",
    };
  }

  if (Number(product.current_stock || 0) <= Number(product.minimum_stock || 0)) {
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

function getDiscrepancyStatus(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return {
      label: "No Count",
      className: "bg-slate-100 text-slate-700",
    };
  }

  if (value < 0) {
    return {
      label: "Missing",
      className: "bg-red-50 text-red-700",
    };
  }

  if (value > 0) {
    return {
      label: "Over",
      className: "bg-amber-50 text-amber-700",
    };
  }

  return {
    label: "On Track",
    className: "bg-emerald-50 text-emerald-700",
  };
}

export function KitchenOpsPanel({
  userId,
  role,
  selectedBrand,
  units,
  products,
  movements,
}: KitchenOpsPanelProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [productList, setProductList] = useState(products);
  const [movementList, setMovementList] = useState(movements);
  const [selectedUnitId, setSelectedUnitId] = useState(units[0]?.id || "");
  const [search, setSearch] = useState("");

  const [productId, setProductId] = useState("");
  const [movementType, setMovementType] =
    useState<KitchenMovementType>("product_in");
  const [movementQty, setMovementQty] = useState("0");
  const [physicalCountQty, setPhysicalCountQty] = useState("0");
  const [unitCost, setUnitCost] = useState("0");
  const [referenceCode, setReferenceCode] = useState("");
  const [notes, setNotes] = useState("");
  const [movementDate, setMovementDate] = useState(todayDate());
  const [isSaving, setIsSaving] = useState(false);

  const selectedUnit = useMemo(
    () => units.find((unit) => unit.id === selectedUnitId) || null,
    [selectedUnitId, units],
  );

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return productList.filter((product) => {
      const matchesUnit = product.brand_unit_id === selectedUnitId;
      const matchesArea = product.ops_area === "kitchen";
      const matchesSearch =
        !query ||
        product.product_name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        String(product.supplier_name || "").toLowerCase().includes(query);

      return matchesUnit && matchesArea && product.is_active && matchesSearch;
    });
  }, [productList, search, selectedUnitId]);

  const visibleProductIds = useMemo(
    () => visibleProducts.map((product) => product.id),
    [visibleProducts],
  );

  const visibleMovements = useMemo(
    () =>
      movementList.filter((movement) =>
        visibleProductIds.includes(movement.product_id),
      ),
    [movementList, visibleProductIds],
  );

  const todayMovements = useMemo(
    () =>
      visibleMovements.filter(
        (movement) => movement.movement_date === todayDate(),
      ),
    [visibleMovements],
  );

  const selectedProduct = useMemo(
    () => productList.find((product) => product.id === productId) || null,
    [productId, productList],
  );

  const criticalProducts = useMemo(
    () =>
      visibleProducts.filter((product) => {
        const stock = getStockStatus(product).label;
        const expiry = getExpiryStatus(product.expiry_date).label;

        return (
          stock === "Low Stock" ||
          stock === "Over Stocked" ||
          expiry === "Expired" ||
          expiry === "Expiring Soon"
        );
      }),
    [visibleProducts],
  );

  const stats = useMemo(() => {
    const inventoryValue = visibleProducts.reduce(
      (total, product) =>
        total +
        Number(product.current_stock || 0) * Number(product.unit_cost || 0),
      0,
    );

    const lowStock = visibleProducts.filter(
      (product) => getStockStatus(product).label === "Low Stock",
    ).length;

    const overStocked = visibleProducts.filter(
      (product) => getStockStatus(product).label === "Over Stocked",
    ).length;

    const expiring = visibleProducts.filter((product) =>
      ["Expired", "Expiring Soon"].includes(
        getExpiryStatus(product.expiry_date).label,
      ),
    ).length;

    const discrepancies = visibleMovements.filter(
      (movement) =>
        movement.movement_type === "stock_count" &&
        Number(movement.discrepancy_qty || 0) !== 0,
    ).length;

    const deliveryIn = todayMovements
      .filter((movement) => movement.movement_type === "product_in")
      .reduce((total, movement) => total + Number(movement.quantity || 0), 0);

    const productionUse = todayMovements
      .filter((movement) => movement.movement_type === "production_consumption")
      .reduce((total, movement) => total + Number(movement.quantity || 0), 0);

    const wasteShrinkage = todayMovements
      .filter((movement) =>
        ["waste", "shrinkage"].includes(String(movement.movement_type)),
      )
      .reduce((total, movement) => total + Number(movement.quantity || 0), 0);

    return {
      productCount: visibleProducts.length,
      inventoryValue,
      lowStock,
      overStocked,
      expiring,
      discrepancies,
      deliveryIn,
      productionUse,
      wasteShrinkage,
      todayActivity: todayMovements.length,
    };
  }, [todayMovements, visibleMovements, visibleProducts]);

  async function refreshKitchenData() {
    if (!selectedBrand?.id) {
      return;
    }

    const { data: productsData, error: productsError } = await supabase
      .from("products")
      .select(
        "id, brand_id, brand_unit_id, category_id, ops_area, product_name, sku, unit, supplier_name, current_stock, minimum_stock, maximum_stock, unit_cost, expiry_date, is_active",
      )
      .eq("brand_id", selectedBrand.id)
      .eq("ops_area", "kitchen")
      .eq("is_active", true)
      .order("product_name", { ascending: true });

    if (productsError) {
      toast.error(productsError.message);
      return;
    }

    const nextProducts = (productsData || []) as KitchenProduct[];
    const nextProductIds = nextProducts.map((product) => product.id);

    setProductList(nextProducts);

    if (nextProductIds.length === 0) {
      setMovementList([]);
      return;
    }

    const { data: movementsData, error: movementsError } = await supabase
      .from("inventory_movements")
      .select(
        "id, brand_id, brand_unit_id, product_id, ops_area, movement_type, quantity, unit_cost, reference_code, notes, movement_date, system_balance_after, physical_count_qty, discrepancy_qty, created_at",
      )
      .in("product_id", nextProductIds)
      .order("movement_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(150);

    if (movementsError) {
      toast.error(movementsError.message);
      return;
    }

    setMovementList((movementsData || []) as KitchenMovement[]);
  }

  function resetMovementForm() {
    setMovementQty("0");
    setPhysicalCountQty("0");
    setUnitCost(String(selectedProduct?.unit_cost || 0));
    setReferenceCode("");
    setNotes("");
    setMovementDate(todayDate());
  }

  function handleWorkflowSelect(nextType: KitchenMovementType) {
    setMovementType(nextType);
    setMovementQty("0");
    setPhysicalCountQty("0");
  }

  async function saveMovement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedBrand?.id) {
      toast.error("Selected brand is required.");
      return;
    }

    if (!selectedProduct) {
      toast.error("Select a kitchen product.");
      return;
    }

    const direction = getMovementDirection(movementType);
    const qty = Number(movementQty || 0);
    const countQty = Number(physicalCountQty || 0);

    if (direction !== "count" && qty <= 0) {
      toast.error("Movement quantity must be greater than zero.");
      return;
    }

    if (direction === "count" && Number.isNaN(countQty)) {
      toast.error("Physical count is required.");
      return;
    }

    setIsSaving(true);

    const { error } = await supabase.from("inventory_movements").insert({
      brand_id: selectedBrand.id,
      brand_unit_id: selectedProduct.brand_unit_id,
      product_id: selectedProduct.id,
      ops_area: "kitchen",
      movement_type: movementType,
      quantity: direction === "count" ? 0 : qty,
      unit_cost: Number(unitCost || selectedProduct.unit_cost || 0),
      physical_count_qty: direction === "count" ? countQty : null,
      reference_code: referenceCode.trim() || null,
      notes: notes.trim() || null,
      movement_date: movementDate || todayDate(),
      created_by: userId,
    });

    setIsSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Kitchen movement saved successfully.");
    resetMovementForm();
    await refreshKitchenData();
  }

  function downloadKitchenPdf() {
    if (visibleProducts.length === 0 && visibleMovements.length === 0) {
      toast.error("No kitchen data available for PDF.");
      return;
    }

    const productRows = visibleProducts
      .map((product) => {
        const stock = getStockStatus(product);
        const expiry = getExpiryStatus(product.expiry_date);

        return `
          <tr>
            <td>${escapeHtml(product.product_name)}</td>
            <td>${escapeHtml(product.sku)}</td>
            <td>${formatQty(product.current_stock)} ${escapeHtml(product.unit)}</td>
            <td>${formatQty(product.minimum_stock)}</td>
            <td>${formatQty(product.maximum_stock)}</td>
            <td>${formatCurrency(product.unit_cost)}</td>
            <td>${formatCurrency(product.current_stock * product.unit_cost)}</td>
            <td>${escapeHtml(stock.label)}</td>
            <td>${escapeHtml(expiry.label)}</td>
          </tr>
        `;
      })
      .join("");

    const movementRows = visibleMovements
      .slice(0, 200)
      .map((movement) => {
        const product = productList.find(
          (item) => item.id === movement.product_id,
        );
        const direction = getMovementDirection(movement.movement_type);

        return `
          <tr>
            <td>${escapeHtml(movement.movement_date)}</td>
            <td>${escapeHtml(product?.product_name || "Unknown Product")}</td>
            <td>${escapeHtml(getMovementLabel(movement.movement_type))}</td>
            <td>${direction === "count" ? "-" : `${formatQty(movement.quantity)} ${escapeHtml(product?.unit || "")}`}</td>
            <td>${movement.physical_count_qty === null ? "-" : formatQty(movement.physical_count_qty)}</td>
            <td>${movement.system_balance_after === null ? "-" : formatQty(movement.system_balance_after)}</td>
            <td>${movement.discrepancy_qty === null ? "-" : formatQty(movement.discrepancy_qty)}</td>
            <td>${escapeHtml(movement.reference_code || "-")}</td>
          </tr>
        `;
      })
      .join("");

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Kitchen Daily Report</title>
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
              max-width: 1180px;
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
            .brand {
              font-size: 12px;
              letter-spacing: 1.4px;
              text-transform: uppercase;
              font-weight: 900;
              color: #d4af37;
            }
            h1 {
              margin: 10px 0 0;
              font-size: 30px;
              line-height: 1.1;
            }
            .content { padding: 28px; }
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
              font-size: 11px;
            }
            th {
              text-align: left;
              background: #0f172a;
              color: #ffffff;
              padding: 9px;
              font-size: 9px;
              text-transform: uppercase;
              letter-spacing: .7px;
            }
            td {
              border-bottom: 1px solid #e2e8f0;
              padding: 9px;
              vertical-align: top;
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
              <div class="brand">👨‍🍳 Forza Unified System</div>
              <h1>Kitchen Daily Operations Report</h1>
            </section>

            <section class="content">
              <div class="grid">
                <div class="card"><div class="label">Brand</div><div class="value">${escapeHtml(selectedBrand?.name || "Selected Brand")}</div></div>
                <div class="card"><div class="label">Branch</div><div class="value">${escapeHtml(selectedUnit?.name || "Selected Branch")}</div></div>
                <div class="card"><div class="label">Products</div><div class="value">${visibleProducts.length}</div></div>
                <div class="card"><div class="label">Inventory Value</div><div class="value">${formatCurrency(stats.inventoryValue)}</div></div>
                <div class="card"><div class="label">Today Activity</div><div class="value">${todayMovements.length}</div></div>
                <div class="card"><div class="label">Delivery In</div><div class="value">${formatQty(stats.deliveryIn)}</div></div>
                <div class="card"><div class="label">Production Use</div><div class="value">${formatQty(stats.productionUse)}</div></div>
                <div class="card"><div class="label">Waste/Shrinkage</div><div class="value">${formatQty(stats.wasteShrinkage)}</div></div>
              </div>

              <h2>📦 Kitchen Product Summary</h2>
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Qty Left</th>
                    <th>Min</th>
                    <th>Max</th>
                    <th>Unit Cost</th>
                    <th>Value</th>
                    <th>Stock</th>
                    <th>Expiry</th>
                  </tr>
                </thead>
                <tbody>
                  ${productRows || `<tr><td colspan="9">No products found.</td></tr>`}
                </tbody>
              </table>

              <h2>🔁 Kitchen Movement Ledger</h2>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Product</th>
                    <th>Movement</th>
                    <th>Qty</th>
                    <th>Physical</th>
                    <th>System</th>
                    <th>Discrepancy</th>
                    <th>Reference</th>
                  </tr>
                </thead>
                <tbody>
                  ${movementRows || `<tr><td colspan="8">No movements found.</td></tr>`}
                </tbody>
              </table>

              <div class="footer">
                <div>Kitchen Daily Report</div>
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

    const printWindow = window.open("", "_blank", "width=1200,height=900");

    if (!printWindow) {
      toast.error("Allow popups to download the kitchen PDF.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  const selectedWorkflow = kitchenMovementTypes.find(
    (item) => item.value === movementType,
  );

  const selectedWorkflowDirection = getMovementDirection(movementType);

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-[2rem] p-6">
        <div className="grid gap-5 xl:grid-cols-[1fr_360px] xl:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-slate-400">
              Kitchen Daily Workflow
            </p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">
              {selectedBrand?.name || "Selected Brand"} Kitchen Ops
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Daily BOH workflow for deliveries, production usage, waste,
              shrinkage, physical stock count, and critical kitchen stock
              control.
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
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>

            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                Access
              </p>
              <p className="mt-1 text-sm font-black text-slate-950">
                {role === "boh_staff"
                  ? "BOH Daily Operations"
                  : "Kitchen Operations Control"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Today Activity"
          value={String(stats.todayActivity)}
          icon={<ClipboardList size={22} />}
        />
        <MetricCard
          label="Delivery In Today"
          value={formatQty(stats.deliveryIn)}
          icon={<ArrowUpCircle size={22} />}
        />
        <MetricCard
          label="Production Use Today"
          value={formatQty(stats.productionUse)}
          icon={<Utensils size={22} />}
        />
        <MetricCard
          label="Waste / Shrinkage"
          value={formatQty(stats.wasteShrinkage)}
          icon={<ArrowDownCircle size={22} />}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard
          label="Kitchen Products"
          value={String(stats.productCount)}
          icon={<Boxes size={22} />}
        />
        <MetricCard
          label="Inventory Value"
          value={formatCurrency(stats.inventoryValue)}
          icon={<CheckCircle2 size={22} />}
        />
        <MetricCard
          label="Low Stock"
          value={String(stats.lowStock)}
          icon={<AlertTriangle size={22} />}
        />
        <MetricCard
          label="Over Stock"
          value={String(stats.overStocked)}
          icon={<Boxes size={22} />}
        />
        <MetricCard
          label="Expiry Watch"
          value={String(stats.expiring)}
          icon={<CalendarClock size={22} />}
        />
        <MetricCard
          label="Discrepancy"
          value={String(stats.discrepancies)}
          icon={<ShieldAlert size={22} />}
        />
      </section>

      <section className="glass-panel rounded-[2rem] p-6">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-slate-400">
              Daily Kitchen Actions
            </p>
            <h2 className="text-2xl font-black text-slate-950">
              Select Workflow
            </h2>
          </div>

          <button
            type="button"
            onClick={downloadKitchenPdf}
            className="forza-button-hover inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-xl"
          >
            <Download size={18} />
            Download Kitchen Daily Report
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {kitchenMovementTypes.map((workflow) => {
            const Icon = workflow.icon;
            const isActive = movementType === workflow.value;

            return (
              <button
                key={workflow.value}
                type="button"
                onClick={() => handleWorkflowSelect(workflow.value)}
                className={`forza-transition rounded-3xl border p-5 text-left shadow-sm ${
                  isActive
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 bg-white/80 text-slate-950 hover:-translate-y-1 hover:bg-slate-950 hover:text-white"
                }`}
              >
                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${
                    isActive
                      ? "bg-white text-slate-950"
                      : "bg-slate-950 text-white"
                  }`}
                >
                  <Icon size={22} />
                </div>
                <h3 className="text-sm font-black">{workflow.shortLabel}</h3>
                <p
                  className={`mt-2 text-xs font-semibold leading-5 ${
                    isActive ? "text-white/75" : "text-slate-500"
                  }`}
                >
                  {workflow.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <section className="glass-panel rounded-[2rem] p-6">
          <div className="mb-5">
            <p className="text-sm font-black uppercase tracking-wide text-slate-400">
              {selectedWorkflow?.shortLabel || "Kitchen Action"}
            </p>
            <h2 className="text-2xl font-black text-slate-950">
              {selectedWorkflow?.label || "Kitchen Movement"}
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              {selectedWorkflow?.description ||
                "Record a kitchen stock movement."}
            </p>
          </div>

          <form
            onSubmit={saveMovement}
            className="grid gap-4 md:grid-cols-2"
          >
            <Field label="Kitchen Product">
              <select
                value={productId}
                onChange={(event) => {
                  const nextProduct = productList.find(
                    (product) => product.id === event.target.value,
                  );

                  setProductId(event.target.value);
                  setUnitCost(String(nextProduct?.unit_cost || 0));
                }}
                className="forza-input"
              >
                <option value="">Select product</option>
                {visibleProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.product_name} — Qty Left:{" "}
                    {formatQty(product.current_stock)} {product.unit}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Movement Date">
              <input
                type="date"
                value={movementDate}
                onChange={(event) => setMovementDate(event.target.value)}
                className="forza-input"
              />
            </Field>

            {selectedWorkflowDirection === "count" ? (
              <Field label="Physical Count Qty">
                <input
                  type="number"
                  step="0.001"
                  value={physicalCountQty}
                  onChange={(event) => setPhysicalCountQty(event.target.value)}
                  className="forza-input"
                />
              </Field>
            ) : (
              <Field label="Movement Qty">
                <input
                  type="number"
                  step="0.001"
                  value={movementQty}
                  onChange={(event) => setMovementQty(event.target.value)}
                  className="forza-input"
                />
              </Field>
            )}

            <Field label="Unit Cost (€)">
              <input
                type="number"
                step="0.0001"
                value={unitCost}
                onChange={(event) => setUnitCost(event.target.value)}
                className="forza-input"
              />
            </Field>

            <Field label="Reference">
              <input
                value={referenceCode}
                onChange={(event) => setReferenceCode(event.target.value)}
                className="forza-input"
                placeholder="Invoice, prep, waste, count ref..."
              />
            </Field>

            <Field label="Notes">
              <input
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="forza-input"
                placeholder="Kitchen movement notes"
              />
            </Field>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={isSaving}
                className="forza-button-hover flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={18} />
                {isSaving
                  ? "Saving Kitchen Action..."
                  : `Save ${selectedWorkflow?.shortLabel || "Kitchen Action"}`}
              </button>
            </div>
          </form>
        </section>

        <section className="glass-panel rounded-[2rem] p-6">
          <div className="mb-5">
            <p className="text-sm font-black uppercase tracking-wide text-slate-400">
              Today’s Kitchen Activity
            </p>
            <h2 className="text-2xl font-black text-slate-950">
              Daily Movement Feed
            </h2>
          </div>

          <div className="space-y-3">
            {todayMovements.slice(0, 8).map((movement) => {
              const product = productList.find(
                (item) => item.id === movement.product_id,
              );

              const direction = getMovementDirection(movement.movement_type);

              return (
                <div
                  key={movement.id}
                  className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-black text-slate-950">
                        {product?.product_name || "Unknown Product"}
                      </h3>
                      <p className="mt-1 text-sm font-bold text-slate-500">
                        {getMovementLabel(movement.movement_type)}
                      </p>
                    </div>

                    <p className="text-sm font-black text-slate-950">
                      {direction === "count"
                        ? "Count"
                        : `${formatQty(movement.quantity)} ${
                            product?.unit || ""
                          }`}
                    </p>
                  </div>
                </div>
              );
            })}

            {todayMovements.length === 0 ? (
              <div className="rounded-3xl bg-white/80 p-5 text-sm font-bold text-slate-500">
                No kitchen activity recorded today.
              </div>
            ) : null}
          </div>
        </section>
      </section>

      <section className="glass-panel rounded-[2rem] p-6">
        <div className="mb-5">
          <p className="text-sm font-black uppercase tracking-wide text-slate-400">
            Critical Kitchen Stock
          </p>
          <h2 className="text-2xl font-black text-slate-950">
            Items Requiring Attention
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {criticalProducts.slice(0, 9).map((product) => {
            const stock = getStockStatus(product);
            const expiry = getExpiryStatus(product.expiry_date);

            return (
              <div
                key={product.id}
                className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm"
              >
                <h3 className="font-black text-slate-950">
                  {product.product_name}
                </h3>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  Qty Left: {formatQty(product.current_stock)} {product.unit}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${stock.className}`}
                  >
                    {stock.label}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${expiry.className}`}
                  >
                    {expiry.label}
                  </span>
                </div>
              </div>
            );
          })}

          {criticalProducts.length === 0 ? (
            <div className="rounded-3xl bg-white/80 p-6 text-sm font-bold text-slate-500 md:col-span-2 xl:col-span-3">
              No critical kitchen stock issues found.
            </div>
          ) : null}
        </div>
      </section>

      <section className="glass-panel rounded-[2rem] p-6">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-slate-400">
              Kitchen Stock View
            </p>
            <h2 className="text-2xl font-black text-slate-950">
              Kitchen Product Health
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
              placeholder="Search kitchen product..."
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] border-separate border-spacing-y-3">
            <thead>
              <tr className="text-left text-xs font-black uppercase tracking-wide text-slate-400">
                <th className="px-4">Product</th>
                <th className="px-4">SKU</th>
                <th className="px-4">Qty Left</th>
                <th className="px-4">Min</th>
                <th className="px-4">Max</th>
                <th className="px-4">Cost</th>
                <th className="px-4">Value</th>
                <th className="px-4">Stock</th>
                <th className="px-4">Expiry</th>
              </tr>
            </thead>

            <tbody>
              {visibleProducts.map((product) => {
                const stock = getStockStatus(product);
                const expiry = getExpiryStatus(product.expiry_date);

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
                    <td className="px-4 py-4 text-sm font-black text-slate-950">
                      {formatQty(product.current_stock)} {product.unit}
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-slate-700">
                      {formatQty(product.minimum_stock)}
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-slate-700">
                      {formatQty(product.maximum_stock)}
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-slate-700">
                      {formatCurrency(product.unit_cost)}
                    </td>
                    <td className="px-4 py-4 text-sm font-black text-slate-950">
                      {formatCurrency(product.current_stock * product.unit_cost)}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${stock.className}`}
                      >
                        {stock.label}
                      </span>
                    </td>
                    <td className="rounded-r-2xl px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${expiry.className}`}
                      >
                        {expiry.label}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {visibleProducts.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="rounded-2xl bg-white px-4 py-8 text-center text-sm font-bold text-slate-500"
                  >
                    No kitchen products found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="glass-panel rounded-[2rem] p-6">
        <div className="mb-5">
          <p className="text-sm font-black uppercase tracking-wide text-slate-400">
            Kitchen Movement History
          </p>
          <h2 className="text-2xl font-black text-slate-950">
            Latest Kitchen Ledger Entries
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] border-separate border-spacing-y-3">
            <thead>
              <tr className="text-left text-xs font-black uppercase tracking-wide text-slate-400">
                <th className="px-4">Date</th>
                <th className="px-4">Product</th>
                <th className="px-4">Movement</th>
                <th className="px-4">Qty</th>
                <th className="px-4">Physical</th>
                <th className="px-4">System</th>
                <th className="px-4">Discrepancy</th>
                <th className="px-4">Reference</th>
              </tr>
            </thead>

            <tbody>
              {visibleMovements.map((movement) => {
                const product = productList.find(
                  (item) => item.id === movement.product_id,
                );

                const direction = getMovementDirection(movement.movement_type);
                const discrepancy = getDiscrepancyStatus(movement.discrepancy_qty);

                return (
                  <tr key={movement.id} className="rounded-2xl bg-white shadow-sm">
                    <td className="rounded-l-2xl px-4 py-4 text-sm font-bold text-slate-700">
                      {movement.movement_date}
                    </td>
                    <td className="px-4 py-4 text-sm font-black text-slate-950">
                      {product?.product_name || "Unknown Product"}
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-slate-700">
                      {getMovementLabel(movement.movement_type)}
                    </td>
                    <td className="px-4 py-4 text-sm font-black text-slate-950">
                      {direction === "count"
                        ? "-"
                        : `${formatQty(movement.quantity)} ${product?.unit || ""}`}
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-slate-700">
                      {movement.physical_count_qty === null
                        ? "-"
                        : formatQty(movement.physical_count_qty)}
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-slate-700">
                      {movement.system_balance_after === null
                        ? "-"
                        : formatQty(movement.system_balance_after)}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${discrepancy.className}`}
                      >
                        {movement.discrepancy_qty === null
                          ? "-"
                          : `${formatQty(movement.discrepancy_qty)} ${discrepancy.label}`}
                      </span>
                    </td>
                    <td className="rounded-r-2xl px-4 py-4 text-sm font-bold text-slate-600">
                      {movement.reference_code || "-"}
                    </td>
                  </tr>
                );
              })}

              {visibleMovements.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="rounded-2xl bg-white px-4 py-8 text-center text-sm font-bold text-slate-500"
                  >
                    No kitchen movements found.
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