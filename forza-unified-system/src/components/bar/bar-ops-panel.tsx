"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Download,
  PieChart,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import type { UserRole } from "@/lib/auth/permissions";

export type BarProduct = {
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

export type BarUnit = {
  id: string;
  brand_id: string | null;
  name: string;
  code: string;
  is_active: boolean;
};

export type BarMovement = {
  id: string;
  brand_id: string | null;
  brand_unit_id: string;
  product_id: string;
  ops_area: "kitchen" | "bar" | "global";
  movement_type: string;
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

function getMovementLabel(type: string) {
  const labels: Record<string, string> = {
    opening_stock: "Opening Stock",
    product_in: "Product In / Delivery",
    transfer_in: "Transfer In",
    adjustment_in: "Adjustment In",
    production_consumption: "Production Consumption",
    sold_consumption: "Sold Consumption",
    waste: "Waste",
    shrinkage: "Shrinkage",
    transfer_out: "Transfer Out",
    adjustment_out: "Adjustment Out",
    stock_count: "Physical Stock Count",
  };

  return labels[type] || type.replaceAll("_", " ");
}

function getMovementDirection(type: string) {
  if (
    ["opening_stock", "product_in", "transfer_in", "adjustment_in"].includes(type)
  ) {
    return "in";
  }

  if (
    [
      "production_consumption",
      "sold_consumption",
      "waste",
      "shrinkage",
      "transfer_out",
      "adjustment_out",
    ].includes(type)
  ) {
    return "out";
  }

  return "count";
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
      cardClassName: "border-amber-200 bg-amber-50/80",
    };
  }

  if (product.current_stock <= product.minimum_stock) {
    return {
      label: "Low Stock",
      className: "bg-red-50 text-red-700",
      cardClassName: "border-red-200 bg-red-50/80",
    };
  }

  return {
    label: "On Track",
    className: "bg-emerald-50 text-emerald-700",
    cardClassName: "border-emerald-200 bg-emerald-50/80",
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
  role,
  selectedBrand,
  units,
  products,
  movements,
}: BarOpsPanelProps) {
  const [selectedUnitId, setSelectedUnitId] = useState(units[0]?.id || "");
  const [search, setSearch] = useState("");

  const selectedUnit = useMemo(
    () => units.find((unit) => unit.id === selectedUnitId) || null,
    [selectedUnitId, units],
  );

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesUnit = product.brand_unit_id === selectedUnitId;
      const matchesArea = product.ops_area === "bar";
      const matchesSearch =
        !query ||
        product.product_name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        String(product.supplier_name || "").toLowerCase().includes(query);

      return matchesUnit && matchesArea && product.is_active && matchesSearch;
    });
  }, [products, search, selectedUnitId]);

  const visibleProductIds = useMemo(
    () => visibleProducts.map((product) => product.id),
    [visibleProducts],
  );

  const visibleMovements = useMemo(
    () =>
      movements.filter((movement) =>
        visibleProductIds.includes(movement.product_id),
      ),
    [movements, visibleProductIds],
  );

  const calculatedMovementBalanceMap = useMemo(() => {
    const map = new Map<string, number>();
    const movementsByProduct = new Map<string, BarMovement[]>();

    movements.forEach((movement) => {
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
  }, [movements]);

  function getCalculatedMovementBalance(movement: BarMovement) {
    return calculatedMovementBalanceMap.get(movement.id) ?? null;
  }

  const todayMovements = useMemo(
    () =>
      visibleMovements.filter(
        (movement) => movement.movement_date === todayDate(),
      ),
    [visibleMovements],
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

    const productIn = visibleMovements
      .filter((movement) => movement.movement_type === "product_in")
      .reduce((total, movement) => total + Number(movement.quantity || 0), 0);

    const productionConsumption = visibleMovements
      .filter((movement) => movement.movement_type === "production_consumption")
      .reduce((total, movement) => total + Number(movement.quantity || 0), 0);

    const waste = visibleMovements
      .filter((movement) => movement.movement_type === "waste")
      .reduce((total, movement) => total + Number(movement.quantity || 0), 0);

    const shrinkage = visibleMovements
      .filter((movement) => movement.movement_type === "shrinkage")
      .reduce((total, movement) => total + Number(movement.quantity || 0), 0);

    const stockOut = visibleMovements
      .filter((movement) => getMovementDirection(movement.movement_type) === "out")
      .reduce((total, movement) => total + Number(movement.quantity || 0), 0);

    const stockIn = visibleMovements
      .filter((movement) => getMovementDirection(movement.movement_type) === "in")
      .reduce((total, movement) => total + Number(movement.quantity || 0), 0);

    const todayWaste = todayMovements
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
      productIn,
      productionConsumption,
      waste,
      shrinkage,
      stockIn,
      stockOut,
      todayActivity: todayMovements.length,
      todayWaste,
    };
  }, [todayMovements, visibleMovements, visibleProducts]);

  const topLowestStock = useMemo(
    () =>
      [...visibleProducts]
        .sort(
          (a, b) =>
            Number(a.current_stock || 0) - Number(b.current_stock || 0),
        )
        .slice(0, 8),
    [visibleProducts],
  );

  const topConsumptionProducts = useMemo(() => {
    const consumptionMap = new Map<
      string,
      {
        product: BarProduct;
        quantity: number;
      }
    >();

    visibleMovements
      .filter((movement) => getMovementDirection(movement.movement_type) === "out")
      .forEach((movement) => {
        const product = visibleProducts.find(
          (item) => item.id === movement.product_id,
        );

        if (!product) {
          return;
        }

        const current = consumptionMap.get(product.id) || {
          product,
          quantity: 0,
        };

        consumptionMap.set(product.id, {
          product,
          quantity: current.quantity + Number(movement.quantity || 0),
        });
      });

    return Array.from(consumptionMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 8);
  }, [visibleMovements, visibleProducts]);

  function downloadBarPdf() {
    if (visibleProducts.length === 0 && visibleMovements.length === 0) {
      toast.error("No bar performance data available for PDF.");
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
        const product = visibleProducts.find(
          (item) => item.id === movement.product_id,
        );
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
                : `${formatQty(movement.quantity)} ${escapeHtml(product?.unit || "")}`
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

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Bar Performance Report</title>
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
              <h1>Bar Performance Report</h1>
            </section>

            <section class="content">
              <div class="grid">
                <div class="card"><div class="label">Brand</div><div class="value">${escapeHtml(selectedBrand?.name || "Selected Brand")}</div></div>
                <div class="card"><div class="label">Branch</div><div class="value">${escapeHtml(selectedUnit?.name || "Selected Branch")}</div></div>
                <div class="card"><div class="label">Products</div><div class="value">${visibleProducts.length}</div></div>
                <div class="card"><div class="label">Inventory Value</div><div class="value">${formatCurrency(stats.inventoryValue)}</div></div>
                <div class="card"><div class="label">Stock In</div><div class="value">${formatQty(stats.stockIn)}</div></div>
                <div class="card"><div class="label">Stock Out</div><div class="value">${formatQty(stats.stockOut)}</div></div>
                <div class="card"><div class="label">Waste</div><div class="value">${formatQty(stats.waste)}</div></div>
                <div class="card"><div class="label">Shrinkage</div><div class="value">${formatQty(stats.shrinkage)}</div></div>
              </div>

              <h2>📦 Bar Product Performance</h2>
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

              <h2>🔁 Synced Inventory Movements</h2>
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
                  ${movementRows || `<tr><td colspan="8">No movements found.</td></tr>`}
                </tbody>
              </table>

              <div class="footer">
                <div>Bar Performance Dashboard Report</div>
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
      toast.error("Allow popups to download the bar PDF.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  return (
    <div className="space-y-6">
      <section className="glass-panel overflow-hidden rounded-[2rem] p-6">
        <div className="relative">
          <div className="absolute -right-16 -top-20 h-52 w-52 animate-pulse rounded-full bg-emerald-100/80 blur-3xl" />
          <div className="absolute -bottom-24 -left-14 h-56 w-56 animate-pulse rounded-full bg-amber-100/80 blur-3xl" />

          <div className="relative z-10 grid gap-5 xl:grid-cols-[1fr_360px] xl:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-black text-slate-700 shadow-sm">
                <Sparkles size={16} />
                Synced from Inventory
              </div>

              <p className="text-sm font-black uppercase tracking-wide text-slate-400">
                Bar Performance Dashboard
              </p>
              <h1 className="mt-2 text-3xl font-black text-slate-950 md:text-5xl">
                {selectedBrand?.name || "Selected Brand"} Bar Ops
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
                Live bar performance from Inventory movements. This page is
                read-only and displays bar stock health, usage, waste,
                shrinkage, discrepancy, expiry, and movement performance.
              </p>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white/85 p-5 shadow-sm">
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
                  Mode
                </p>
                <p className="mt-1 text-sm font-black text-slate-950">
                  {role === "foh_staff"
                    ? "FOH Performance View"
                    : "Bar Performance Control"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Bar Inventory Value"
          value={formatCurrency(stats.inventoryValue)}
          icon={<CheckCircle2 size={22} />}
        />
        <MetricCard
          label="Stock In"
          value={formatQty(stats.stockIn)}
          icon={<TrendingUp size={22} />}
        />
        <MetricCard
          label="Stock Out"
          value={formatQty(stats.stockOut)}
          icon={<TrendingDown size={22} />}
        />
        <MetricCard
          label="Today Activity"
          value={String(stats.todayActivity)}
          icon={<ClipboardList size={22} />}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard
          label="Bar Products"
          value={String(stats.productCount)}
          icon={<Boxes size={22} />}
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
          label="Waste"
          value={formatQty(stats.waste)}
          icon={<ShieldAlert size={22} />}
        />
        <MetricCard
          label="Shrinkage"
          value={formatQty(stats.shrinkage)}
          icon={<BarChart3 size={22} />}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="glass-panel rounded-[2rem] p-6">
          <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-slate-400">
                Performance Search
              </p>
              <h2 className="text-2xl font-black text-slate-950">
                Bar Product Performance
              </h2>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="forza-input pl-11 xl:min-w-[300px]"
                  placeholder="Search product, SKU, supplier..."
                />
              </div>

              <button
                type="button"
                onClick={downloadBarPdf}
                className="forza-button-hover inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-xl"
              >
                <Download size={18} />
                PDF
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {topLowestStock.map((product) => {
              const stock = getStockStatus(product);
              const expiry = getExpiryStatus(product.expiry_date);

              return (
                <div
                  key={product.id}
                  className={`forza-transition forza-hover rounded-3xl border p-5 shadow-sm ${stock.cardClassName}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-black text-slate-950">
                        {product.product_name}
                      </h3>
                      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                        {product.sku}
                      </p>
                    </div>
                    <PieChart size={22} className="text-slate-500" />
                  </div>

                  <p className="mt-4 text-3xl font-black text-slate-950">
                    {formatQty(product.current_stock)} {product.unit}
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

                  <p className="mt-4 text-sm font-bold text-slate-600">
                    Value: {formatCurrency(product.current_stock * product.unit_cost)}
                  </p>
                </div>
              );
            })}

            {topLowestStock.length === 0 ? (
              <div className="rounded-3xl bg-white/80 p-6 text-sm font-bold text-slate-500 md:col-span-2">
                No bar products found.
              </div>
            ) : null}
          </div>
        </div>

        <div className="glass-panel rounded-[2rem] p-6">
          <p className="text-sm font-black uppercase tracking-wide text-slate-400">
            Top Usage
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            Highest Bar Consumption
          </h2>

          <div className="mt-5 space-y-3">
            {topConsumptionProducts.map((item) => (
              <div
                key={item.product.id}
                className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-black text-slate-950">
                      {item.product.product_name}
                    </h3>
                    <p className="mt-1 text-sm font-bold text-slate-500">
                      {item.product.sku}
                    </p>
                  </div>

                  <p className="text-sm font-black text-slate-950">
                    {formatQty(item.quantity)} {item.product.unit}
                  </p>
                </div>
              </div>
            ))}

            {topConsumptionProducts.length === 0 ? (
              <div className="rounded-3xl bg-white/80 p-5 text-sm font-bold text-slate-500">
                No bar consumption movements found.
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="glass-panel rounded-[2rem] p-6">
        <div className="mb-5">
          <p className="text-sm font-black uppercase tracking-wide text-slate-400">
            Critical Bar Stock
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
                className="forza-transition forza-hover rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm"
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
              No critical bar stock issues found.
            </div>
          ) : null}
        </div>
      </section>

      <section className="glass-panel rounded-[2rem] p-6">
        <div className="mb-5">
          <p className="text-sm font-black uppercase tracking-wide text-slate-400">
            Synced Inventory Movement Feed
          </p>
          <h2 className="text-2xl font-black text-slate-950">
            Latest Bar Movements
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
                <th className="px-4">Calculated Balance</th>
                <th className="px-4">Discrepancy</th>
                <th className="px-4">Reference</th>
              </tr>
            </thead>

            <tbody>
              {visibleMovements.map((movement) => {
                const product = visibleProducts.find(
                  (item) => item.id === movement.product_id,
                );

                const direction = getMovementDirection(movement.movement_type);
                const discrepancy = getDiscrepancyStatus(
                  movement.discrepancy_qty,
                );

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
                      {getCalculatedMovementBalance(movement) === null
                        ? "-"
                        : `${formatQty(getCalculatedMovementBalance(movement) || 0)} ${product?.unit || ""}`}
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
                    No bar movements found.
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