"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Beer,
  Boxes,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Download,
  GlassWater,
  Package,
  Save,
  Search,
  Wine,
} from "lucide-react";
import { toast } from "sonner";
import type { UserRole } from "@/lib/auth/permissions";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export type OpsArea = "kitchen" | "bar" | "global";

export type BarUnit = {
  id: string;
  brand_id: string | null;
  name: string;
  code: string;
  is_active: boolean;
};

export type BarProduct = {
  id: string;
  brand_id: string | null;
  brand_unit_id: string;
  category_id: string | null;
  ops_area: OpsArea;
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

export type BarMovement = {
  id: string;
  brand_id: string | null;
  brand_unit_id: string;
  product_id: string;
  ops_area: OpsArea;
  movement_type: InventoryMovementType;
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

export type InventoryMovementType =
  | "opening_stock"
  | "product_in"
  | "transfer_in"
  | "adjustment_in"
  | "production_consumption"
  | "sold_consumption"
  | "waste"
  | "shrinkage"
  | "transfer_out"
  | "adjustment_out"
  | "stock_count";

type BarOpsPanelProps = {
  role: UserRole;
  selectedBrand: {
    id: string;
    name: string;
    code: string;
  } | null;
  units: BarUnit[];
  products: BarProduct[];
  movements: BarMovement[];
};

const movementTypes: {
  value: InventoryMovementType;
  label: string;
  direction: "in" | "out" | "count";
}[] = [
  { value: "opening_stock", label: "Opening Stock", direction: "in" },
  { value: "product_in", label: "Product In / Delivery", direction: "in" },
  { value: "transfer_in", label: "Transfer In", direction: "in" },
  { value: "adjustment_in", label: "Adjustment In", direction: "in" },
  {
    value: "production_consumption",
    label: "Production Consumption",
    direction: "out",
  },
  { value: "sold_consumption", label: "Sold Consumption", direction: "out" },
  { value: "waste", label: "Waste", direction: "out" },
  { value: "shrinkage", label: "Shrinkage", direction: "out" },
  { value: "transfer_out", label: "Transfer Out", direction: "out" },
  { value: "adjustment_out", label: "Adjustment Out", direction: "out" },
  { value: "stock_count", label: "Physical Stock Count", direction: "count" },
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

function getMovementLabel(type: InventoryMovementType) {
  return movementTypes.find((item) => item.value === type)?.label || type;
}

function getMovementDirection(type: InventoryMovementType) {
  return movementTypes.find((item) => item.value === type)?.direction || "count";
}

function getMovementBalanceEffect(movement: BarMovement) {
  const direction = getMovementDirection(movement.movement_type);
  const quantity = Number(movement.quantity || 0);

  if (direction === "in") {
    return quantity;
  }

  if (direction === "out") {
    return quantity * -1;
  }

  return 0;
}

function sortMovementsOldestFirst(movements: BarMovement[]) {
  return [...movements].sort((a, b) => {
    const dateCompare = a.movement_date.localeCompare(b.movement_date);

    if (dateCompare !== 0) {
      return dateCompare;
    }

    const createdA = a.created_at || "";
    const createdB = b.created_at || "";

    return createdA.localeCompare(createdB);
  });
}

function getStockStatus(product: BarProduct) {
  if (
    product.maximum_stock > 0 &&
    product.current_stock > product.maximum_stock
  ) {
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

function getDiscrepancyStatus(discrepancy: number | null) {
  if (discrepancy === null || Number.isNaN(discrepancy)) {
    return {
      label: "No Count",
      className: "bg-slate-100 text-slate-700",
    };
  }

  if (discrepancy < 0) {
    return {
      label: "Missing",
      className: "bg-red-50 text-red-700",
    };
  }

  if (discrepancy > 0) {
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

export function BarOpsPanel({
  selectedBrand,
  units,
  products,
  movements,
}: BarOpsPanelProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [productList, setProductList] = useState<BarProduct[]>(products);
  const [movementList, setMovementList] = useState<BarMovement[]>(movements);

  const [selectedUnitId, setSelectedUnitId] = useState(units[0]?.id || "");
  const [search, setSearch] = useState("");

  const [movementProductId, setMovementProductId] = useState("");
  const [movementType, setMovementType] =
    useState<InventoryMovementType>("product_in");
  const [movementQty, setMovementQty] = useState("0");
  const [physicalCountQty, setPhysicalCountQty] = useState("0");
  const [movementUnitCost, setMovementUnitCost] = useState("0");
  const [movementReference, setMovementReference] = useState("");
  const [movementNotes, setMovementNotes] = useState("");
  const [movementDate, setMovementDate] = useState(todayDate());
  const [isMovementSaving, setIsMovementSaving] = useState(false);

  useEffect(() => {
    setProductList(products);
  }, [products]);

  useEffect(() => {
    setMovementList(movements);
  }, [movements]);

  useEffect(() => {
    if (!selectedUnitId && units[0]?.id) {
      setSelectedUnitId(units[0].id);
    }
  }, [selectedUnitId, units]);

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return productList.filter((product) => {
      const matchesUnit = !selectedUnitId || product.brand_unit_id === selectedUnitId;
      const matchesArea = product.ops_area === "bar";
      const matchesSearch =
        !query ||
        product.product_name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        String(product.supplier_name || "").toLowerCase().includes(query);

      return matchesUnit && matchesArea && matchesSearch;
    });
  }, [productList, search, selectedUnitId]);

  const visibleProductIds = useMemo(
    () => visibleProducts.map((product) => product.id),
    [visibleProducts],
  );

  const visibleMovements = useMemo(() => {
    return movementList.filter((movement) =>
      visibleProductIds.includes(movement.product_id),
    );
  }, [movementList, visibleProductIds]);

  const selectedMovementProduct = useMemo(
    () => productList.find((product) => product.id === movementProductId) || null,
    [movementProductId, productList],
  );

  const calculatedMovementBalanceMap = useMemo(() => {
    const map = new Map<string, number>();
    const movementsByProduct = new Map<string, BarMovement[]>();

    movementList.forEach((movement) => {
      const current = movementsByProduct.get(movement.product_id) || [];
      current.push(movement);
      movementsByProduct.set(movement.product_id, current);
    });

    movementsByProduct.forEach((productMovements) => {
      let runningBalance = 0;

      sortMovementsOldestFirst(productMovements).forEach((movement) => {
        const direction = getMovementDirection(movement.movement_type);

        if (direction === "count") {
          if (movement.physical_count_qty !== null) {
            runningBalance = Number(movement.physical_count_qty || 0);
          }
        } else {
          runningBalance += getMovementBalanceEffect(movement);
        }

        map.set(movement.id, runningBalance);
      });
    });

    return map;
  }, [movementList]);

  const inventoryStats = useMemo(() => {
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

  useEffect(() => {
    if (!movementProductId && visibleProducts[0]?.id) {
      setMovementProductId(visibleProducts[0].id);
      setMovementUnitCost(String(visibleProducts[0].unit_cost || 0));
    }

    if (
      movementProductId &&
      visibleProducts.length > 0 &&
      !visibleProducts.some((product) => product.id === movementProductId)
    ) {
      setMovementProductId(visibleProducts[0].id);
      setMovementUnitCost(String(visibleProducts[0].unit_cost || 0));
    }
  }, [movementProductId, visibleProducts]);

  async function refreshBarData() {
    if (!selectedBrand?.id) {
      return;
    }

    const { data: refreshedProducts, error: productsError } = await supabase
      .from("products")
      .select(
        "id, brand_id, brand_unit_id, category_id, ops_area, product_name, sku, unit, supplier_name, current_stock, minimum_stock, maximum_stock, unit_cost, expiry_date, is_active",
      )
      .eq("brand_id", selectedBrand.id)
      .eq("ops_area", "bar")
      .eq("is_active", true)
      .order("product_name", { ascending: true });

    if (productsError) {
      toast.error(productsError.message);
      return;
    }

    const nextProducts = (refreshedProducts || []) as BarProduct[];
    setProductList(nextProducts);

    const productIds = nextProducts.map((product) => product.id);

    if (productIds.length === 0) {
      setMovementList([]);
      return;
    }

    const { data: refreshedMovements, error: movementsError } = await supabase
      .from("inventory_movements")
      .select(
        "id, brand_id, brand_unit_id, product_id, ops_area, movement_type, quantity, unit_cost, reference_code, notes, movement_date, system_balance_after, physical_count_qty, discrepancy_qty, created_at",
      )
      .eq("brand_id", selectedBrand.id)
      .eq("ops_area", "bar")
      .in("product_id", productIds)
      .order("movement_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(150);

    if (movementsError) {
      toast.error(movementsError.message);
      return;
    }

    setMovementList((refreshedMovements || []) as BarMovement[]);
  }

  useEffect(() => {
    if (!selectedBrand?.id) {
      return;
    }

    const channel = supabase
      .channel(`bar-ops-ledger-${selectedBrand.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
        },
        () => {
          refreshBarData();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inventory_movements",
        },
        () => {
          refreshBarData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBrand?.id]);

  function resetMovementForm() {
    setMovementType("product_in");
    setMovementQty("0");
    setPhysicalCountQty("0");
    setMovementUnitCost(String(selectedMovementProduct?.unit_cost || 0));
    setMovementReference("");
    setMovementNotes("");
    setMovementDate(todayDate());
  }

  function getCalculatedMovementBalance(movement: BarMovement) {
    return calculatedMovementBalanceMap.get(movement.id) ?? null;
  }

  async function saveMovement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedBrand?.id) {
      toast.error("Selected brand is required.");
      return;
    }

    if (!selectedMovementProduct) {
      toast.error("Select a product first.");
      return;
    }

    const direction = getMovementDirection(movementType);
    const movementQuantity = Number(movementQty || 0);
    const stockCountQuantity = Number(physicalCountQty || 0);

    if (direction !== "count" && movementQuantity <= 0) {
      toast.error("Movement quantity must be greater than zero.");
      return;
    }

    if (direction === "count" && Number.isNaN(stockCountQuantity)) {
      toast.error("Physical count is required.");
      return;
    }

    setIsMovementSaving(true);

    const payload = {
      brand_id: selectedBrand.id,
      brand_unit_id: selectedMovementProduct.brand_unit_id,
      product_id: selectedMovementProduct.id,
      ops_area: selectedMovementProduct.ops_area,
      movement_type: movementType,
      quantity: direction === "count" ? 0 : movementQuantity,
      unit_cost: Number(movementUnitCost || selectedMovementProduct.unit_cost || 0),
      physical_count_qty:
        direction === "count" ? Number(physicalCountQty || 0) : null,
      reference_code: movementReference.trim() || null,
      notes: movementNotes.trim() || null,
      movement_date: movementDate || todayDate(),
    };

    const { error } = await supabase.from("inventory_movements").insert(payload);

    setIsMovementSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    await refreshBarData();
    toast.success("Bar movement saved successfully.");
    resetMovementForm();
  }

  function downloadBarPdf() {
    if (visibleProducts.length === 0 && visibleMovements.length === 0) {
      toast.error("No bar data available for this PDF export.");
      return;
    }

    const productRows = visibleProducts
      .map((product) => {
        const stockStatus = getStockStatus(product);
        const expiryStatus = getExpiryStatus(product.expiry_date);

        return `
          <tr>
            <td>${escapeHtml(product.product_name)}</td>
            <td>${escapeHtml(product.sku)}</td>
            <td>${formatQty(product.current_stock)} ${escapeHtml(product.unit)}</td>
            <td>${formatQty(product.minimum_stock)}</td>
            <td>${formatQty(product.maximum_stock)}</td>
            <td>${formatCurrency(product.unit_cost)}</td>
            <td>${formatCurrency(product.current_stock * product.unit_cost)}</td>
            <td>${escapeHtml(stockStatus.label)}</td>
            <td>${escapeHtml(expiryStatus.label)}</td>
          </tr>
        `;
      })
      .join("");

    const movementRows = visibleMovements
      .slice(0, 200)
      .map((movement) => {
        const product = productList.find((item) => item.id === movement.product_id);
        const direction = getMovementDirection(movement.movement_type);
        const calculatedBalance = getCalculatedMovementBalance(movement);

        return `
          <tr>
            <td>${escapeHtml(movement.movement_date)}</td>
            <td>${escapeHtml(product?.product_name || "Unknown Product")}</td>
            <td>${escapeHtml(getMovementLabel(movement.movement_type))}</td>
            <td>${
              direction === "count"
                ? "-"
                : `${formatQty(movement.quantity)} ${escapeHtml(
                    product?.unit || "",
                  )}`
            }</td>
            <td>${
              movement.physical_count_qty === null
                ? "-"
                : formatQty(movement.physical_count_qty)
            }</td>
            <td>${
              calculatedBalance === null
                ? "-"
                : `${formatQty(calculatedBalance)} ${escapeHtml(product?.unit || "")}`
            }</td>
            <td>${
              movement.discrepancy_qty === null
                ? "-"
                : formatQty(movement.discrepancy_qty)
            }</td>
            <td>${escapeHtml(movement.reference_code || "-")}</td>
          </tr>
        `;
      })
      .join("");

    const totalValue = visibleProducts.reduce(
      (total, product) => total + product.current_stock * product.unit_cost,
      0,
    );

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Bar Ops Report</title>
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
              <div class="brand">🍷 Forza Unified System</div>
              <h1>Bar Ops Report</h1>
            </section>

            <section class="content">
              <div class="grid">
                <div class="card"><div class="label">Brand</div><div class="value">${escapeHtml(selectedBrand?.name || "Selected Brand")}</div></div>
                <div class="card"><div class="label">Products</div><div class="value">${visibleProducts.length}</div></div>
                <div class="card"><div class="label">Movements</div><div class="value">${visibleMovements.length}</div></div>
                <div class="card"><div class="label">Inventory Value</div><div class="value">${formatCurrency(totalValue)}</div></div>
              </div>

              <h2>Product Summary</h2>
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

              <h2>Movement Ledger</h2>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Product</th>
                    <th>Movement</th>
                    <th>Qty</th>
                    <th>Physical</th>
                    <th>Calculated Balance</th>
                    <th>Discrepancy</th>
                    <th>Reference</th>
                  </tr>
                </thead>
                <tbody>
                  ${movementRows || `<tr><td colspan="8">No movement entries found.</td></tr>`}
                </tbody>
              </table>

              <div class="footer">
                <div>Report Type: Bar Ops Report</div>
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
      toast.error("Allow popups to download the bar report PDF.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-[2rem] p-6">
        <div className="grid gap-5 xl:grid-cols-[1fr_360px] xl:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-slate-400">
              Bar Operations
            </p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">
              {selectedBrand?.name || "Selected Brand"} Bar Ops
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Bar stock and movement ledger for beverage operations. Product In,
              transfer, adjustment, sold consumption, waste, shrinkage, and
              stock count are calculated by product UOM.
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
          label="Bar Products"
          value={String(inventoryStats.totalProducts)}
          icon={<GlassWater size={22} />}
        />
        <MetricCard
          label="Bar Value"
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
        <div className="mb-5 grid gap-4 xl:grid-cols-[1fr_auto] xl:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-slate-400">
              Bar Movement Entry
            </p>
            <h2 className="text-2xl font-black text-slate-950">
              Product In / Sold / Waste / Count
            </h2>
          </div>

          <button
            type="button"
            onClick={downloadBarPdf}
            className="forza-button-hover inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-xl"
          >
            <Download size={18} />
            Download PDF
          </button>
        </div>

        <form
          onSubmit={saveMovement}
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <Field label="Product">
            <select
              value={movementProductId}
              onChange={(event) => {
                const nextProduct = productList.find(
                  (product) => product.id === event.target.value,
                );

                setMovementProductId(event.target.value);
                setMovementUnitCost(String(nextProduct?.unit_cost || 0));
              }}
              className="forza-input"
            >
              <option value="">Select product</option>
              {visibleProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.product_name} — {product.sku}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Movement Type">
            <select
              value={movementType}
              onChange={(event) =>
                setMovementType(event.target.value as InventoryMovementType)
              }
              className="forza-input"
            >
              {movementTypes.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>

          {getMovementDirection(movementType) === "count" ? (
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
            <Field
              label={`Movement Qty${
                selectedMovementProduct?.unit
                  ? ` (${selectedMovementProduct.unit})`
                  : ""
              }`}
            >
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
              value={movementUnitCost}
              onChange={(event) => setMovementUnitCost(event.target.value)}
              className="forza-input"
            />
          </Field>

          <Field label="Movement Date">
            <input
              type="date"
              value={movementDate}
              onChange={(event) => setMovementDate(event.target.value)}
              className="forza-input"
            />
          </Field>

          <Field label="Reference">
            <input
              value={movementReference}
              onChange={(event) => setMovementReference(event.target.value)}
              className="forza-input"
              placeholder="Invoice, transfer, POS, waste ref..."
            />
          </Field>

          <div className="md:col-span-2">
            <Field label="Notes">
              <input
                value={movementNotes}
                onChange={(event) => setMovementNotes(event.target.value)}
                className="forza-input"
                placeholder="Movement note"
              />
            </Field>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 md:col-span-2 xl:col-span-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
              Current Movement UOM
            </p>
            <p className="mt-2 text-sm font-bold text-slate-700">
              {selectedMovementProduct
                ? `${selectedMovementProduct.product_name} uses ${selectedMovementProduct.unit}. Movement quantity will be calculated in ${selectedMovementProduct.unit}.`
                : "Select a product to see the movement UOM."}
            </p>
          </div>

          <div className="md:col-span-2 xl:col-span-4">
            <button
              type="submit"
              disabled={isMovementSaving}
              className="forza-button-hover flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={18} />
              {isMovementSaving ? "Saving Movement..." : "Save Movement"}
            </button>
          </div>
        </form>
      </section>

      <section className="glass-panel rounded-[2rem] p-6">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-slate-400">
              Bar Product List
            </p>
            <h2 className="text-2xl font-black text-slate-950">
              Bottle / Beverage Balance
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
          <table className="w-full min-w-[1050px] border-separate border-spacing-y-3">
            <thead>
              <tr className="text-left text-xs font-black uppercase tracking-wide text-slate-400">
                <th className="px-4">Product</th>
                <th className="px-4">SKU</th>
                <th className="px-4">Actual Qty Left</th>
                <th className="px-4">Min</th>
                <th className="px-4">Max</th>
                <th className="px-4">Cost</th>
                <th className="px-4">Value</th>
                <th className="px-4">Stock Status</th>
                <th className="px-4">Expiry</th>
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
                    <td className="px-4 py-4 text-sm font-black text-slate-950">
                      {formatQty(product.current_stock)} {product.unit}
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-slate-600">
                      {formatQty(product.minimum_stock)}
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-slate-600">
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
                        className={`rounded-full px-3 py-1 text-xs font-black ${stockStatus.className}`}
                      >
                        {stockStatus.label}
                      </span>
                    </td>
                    <td className="rounded-r-2xl px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${expiryStatus.className}`}
                      >
                        {expiryStatus.label}
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
                    No bar products found for this branch.
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
            Latest Bar Movements
          </p>
          <h2 className="text-2xl font-black text-slate-950">
            Calculated Movement Ledger
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-separate border-spacing-y-3">
            <thead>
              <tr className="text-left text-xs font-black uppercase tracking-wide text-slate-400">
                <th className="px-4">Date</th>
                <th className="px-4">Product</th>
                <th className="px-4">Movement</th>
                <th className="px-4">Qty</th>
                <th className="px-4">Physical</th>
                <th className="px-4">Calculated Balance</th>
                <th className="px-4">Discrepancy</th>
                <th className="px-4">Reference</th>
                <th className="px-4">Notes</th>
              </tr>
            </thead>

            <tbody>
              {visibleMovements.map((movement) => {
                const product = productList.find(
                  (item) => item.id === movement.product_id,
                );

                const direction = getMovementDirection(movement.movement_type);
                const discrepancyStatus = getDiscrepancyStatus(
                  movement.discrepancy_qty,
                );
                const calculatedBalance = getCalculatedMovementBalance(movement);

                return (
                  <tr
                    key={movement.id}
                    className="rounded-2xl bg-white shadow-sm"
                  >
                    <td className="rounded-l-2xl px-4 py-4 text-sm font-bold text-slate-700">
                      {movement.movement_date}
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm font-black text-slate-950">
                        {product?.product_name || "Unknown Product"}
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-400">
                        {product?.sku || "No SKU"}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${
                          direction === "in"
                            ? "bg-emerald-50 text-emerald-700"
                            : direction === "out"
                              ? "bg-red-50 text-red-700"
                              : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {getMovementLabel(movement.movement_type)}
                      </span>
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
                    <td className="px-4 py-4 text-sm font-black text-slate-950">
                      {calculatedBalance === null
                        ? "-"
                        : `${formatQty(calculatedBalance)} ${product?.unit || ""}`}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${discrepancyStatus.className}`}
                      >
                        {movement.discrepancy_qty === null
                          ? "-"
                          : formatQty(movement.discrepancy_qty)}{" "}
                        {movement.discrepancy_qty === null
                          ? ""
                          : discrepancyStatus.label}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-slate-600">
                      {movement.reference_code || "-"}
                    </td>
                    <td className="rounded-r-2xl px-4 py-4 text-sm font-bold text-slate-600">
                      {movement.notes || "-"}
                    </td>
                  </tr>
                );
              })}

              {visibleMovements.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="rounded-2xl bg-white px-4 py-8 text-center text-sm font-bold text-slate-500"
                  >
                    No bar movements found for this branch.
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
  icon: ReactNode;
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
  children: ReactNode;
};

function Field({ label, children }: FieldProps) {
  return (
    <div>
      <label className="text-sm font-bold text-slate-700">{label}</label>
      <div className="mt-2">{children}</div>
    </div>
  );
}