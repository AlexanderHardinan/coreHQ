"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Boxes,
  Building2,
  CalendarClock,
  ChefHat,
  CircleDollarSign,
  Flame,
  Gauge,
  GlassWater,
  Globe2,
  MapPin,
  Package,
  Radar,
  RefreshCw,
  Satellite,
  ShieldAlert,
  Sparkles,
  Target,
  Waves,
  Zap,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export type MainPanelBrand = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  icon: string | null;
};

export type MainPanelUnit = {
  id: string;
  brand_id: string | null;
  name: string;
  code: string;
  city: string | null;
  country: string | null;
  is_active: boolean;
};

export type MainPanelOpsArea = "kitchen" | "bar" | "global";

export type MainPanelProduct = {
  id: string;
  brand_id: string | null;
  brand_unit_id: string;
  category_id: string | null;
  product_category: string | null;
  product_group: string | null;
  ops_area: MainPanelOpsArea;
  product_name: string;
  sku: string;
  unit: string;
  current_stock: number;
  minimum_stock: number;
  maximum_stock: number;
  unit_cost: number;
  expiry_date: string | null;
  is_active: boolean;
};

export type MainPanelMovementType =
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

export type MainPanelMovement = {
  id: string;
  brand_id: string | null;
  brand_unit_id: string;
  product_id: string;
  ops_area: MainPanelOpsArea;
  movement_type: MainPanelMovementType;
  quantity: number;
  movement_date: string;
  physical_count_qty: number | null;
  discrepancy_qty: number | null;
  created_at: string | null;
};

type MainPanelClientProps = {
  brands: MainPanelBrand[];
  units: MainPanelUnit[];
  products: MainPanelProduct[];
  movements: MainPanelMovement[];
};

type AlertPriority = "critical" | "warning" | "stable";
type AreaFilter = "all" | MainPanelOpsArea;

const stockInTypes: MainPanelMovementType[] = [
  "opening_stock",
  "product_in",
  "transfer_in",
  "adjustment_in",
];

const stockOutTypes: MainPanelMovementType[] = [
  "production_consumption",
  "sold_consumption",
  "waste",
  "shrinkage",
  "transfer_out",
  "adjustment_out",
];

const areaLabels: Record<MainPanelOpsArea, string> = {
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

function getMovementDirection(type: MainPanelMovementType) {
  if (stockInTypes.includes(type)) {
    return "in";
  }

  if (stockOutTypes.includes(type)) {
    return "out";
  }

  return "count";
}

function getMovementBalanceEffect(movement: MainPanelMovement) {
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

function sortMovementsOldestFirst(movements: MainPanelMovement[]) {
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

function buildCalculatedProductBalanceMap(movements: MainPanelMovement[]) {
  const map = new Map<string, number>();
  const movementsByProduct = new Map<string, MainPanelMovement[]>();

  movements.forEach((movement) => {
    const current = movementsByProduct.get(movement.product_id) || [];
    current.push(movement);
    movementsByProduct.set(movement.product_id, current);
  });

  movementsByProduct.forEach((productMovements, productId) => {
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
    });

    map.set(productId, runningBalance);
  });

  return map;
}

function getProductStock(
  product: MainPanelProduct,
  balanceMap: Map<string, number>,
) {
  return balanceMap.get(product.id) ?? 0;
}

function getStockStatus(
  product: MainPanelProduct,
  balanceMap: Map<string, number>,
) {
  const stockQuantity = getProductStock(product, balanceMap);

  if (
    Number(product.maximum_stock || 0) > 0 &&
    stockQuantity > Number(product.maximum_stock || 0)
  ) {
    return "overstock";
  }

  if (stockQuantity <= Number(product.minimum_stock || 0)) {
    return "low";
  }

  return "on_track";
}

function getExpiryStatus(expiryDate: string | null) {
  if (!expiryDate) {
    return "no_expiry";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(`${expiryDate}T00:00:00`);
  const differenceMs = expiry.getTime() - today.getTime();
  const differenceDays = Math.ceil(differenceMs / (1000 * 60 * 60 * 24));

  if (differenceDays < 0) {
    return "expired";
  }

  if (differenceDays <= 14) {
    return "expiring_soon";
  }

  return "safe";
}

function getPriorityClasses(priority: AlertPriority) {
  if (priority === "critical") {
    return {
      panel: "border-red-200 bg-red-50/90 shadow-red-100",
      icon: "bg-red-600 text-white",
      text: "text-red-700",
      dot: "bg-red-500",
      ring: "border-red-400",
      badge: "bg-red-600 text-white",
    };
  }

  if (priority === "warning") {
    return {
      panel: "border-amber-200 bg-amber-50/90 shadow-amber-100",
      icon: "bg-amber-500 text-white",
      text: "text-amber-700",
      dot: "bg-amber-500",
      ring: "border-amber-400",
      badge: "bg-amber-500 text-white",
    };
  }

  return {
    panel: "border-emerald-200 bg-emerald-50/90 shadow-emerald-100",
    icon: "bg-emerald-600 text-white",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
    ring: "border-emerald-400",
    badge: "bg-emerald-600 text-white",
  };
}

function getBrandAccent(code: string) {
  if (code === "FUSION") {
    return {
      glow: "bg-blue-400",
      ring: "border-blue-400",
      badge: "bg-blue-950 text-white",
      soft: "bg-blue-50 text-blue-800 border-blue-100",
    };
  }

  return {
    glow: "bg-amber-400",
    ring: "border-amber-400",
    badge: "bg-slate-950 text-white",
    soft: "bg-amber-50 text-amber-800 border-amber-100",
  };
}

export function MainPanelClient({
  brands,
  units,
  products,
  movements,
}: MainPanelClientProps) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const refreshTimerRef = useRef<number | null>(null);

  const [areaFilter, setAreaFilter] = useState<AreaFilter>("all");

  const brandIds = useMemo(() => brands.map((brand) => brand.id), [brands]);

  useEffect(() => {
    if (brandIds.length === 0) {
      return;
    }

    function scheduleRefresh() {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }

      refreshTimerRef.current = window.setTimeout(() => {
        router.refresh();
      }, 350);
    }

    const channel = supabase
      .channel(`main-panel-command-radar-${brandIds.join("-")}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "brands",
        },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "brand_units",
        },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
        },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inventory_movements",
        },
        scheduleRefresh,
      )
      .subscribe();

    const fallbackRefresh = window.setInterval(() => {
      router.refresh();
    }, 15000);

    return () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }

      window.clearInterval(fallbackRefresh);
      supabase.removeChannel(channel);
    };
  }, [brandIds, router, supabase]);

  const balanceMap = useMemo(
    () => buildCalculatedProductBalanceMap(movements),
    [movements],
  );

  const filteredProducts = useMemo(() => {
    if (areaFilter === "all") {
      return products;
    }

    return products.filter((product) => product.ops_area === areaFilter);
  }, [areaFilter, products]);

  const filteredMovements = useMemo(() => {
    const productIds = new Set(filteredProducts.map((product) => product.id));

    return movements.filter((movement) => productIds.has(movement.product_id));
  }, [filteredProducts, movements]);

  const alertRows = useMemo(() => {
    const rows: {
      id: string;
      productName: string;
      brandName: string;
      unitName: string;
      area: MainPanelOpsArea;
      status: string;
      meta: string;
      priority: AlertPriority;
    }[] = [];

    filteredProducts.forEach((product) => {
      const brand = brands.find((item) => item.id === product.brand_id);
      const unit = units.find((item) => item.id === product.brand_unit_id);
      const stockQty = getProductStock(product, balanceMap);
      const stockStatus = getStockStatus(product, balanceMap);
      const expiryStatus = getExpiryStatus(product.expiry_date);

      if (stockQty < 0) {
        rows.push({
          id: `negative-${product.id}`,
          productName: product.product_name,
          brandName: brand?.name || "Unknown Brand",
          unitName: unit?.name || "Unknown Outlet",
          area: product.ops_area,
          status: "Negative Stock",
          meta: `${formatQty(stockQty)} ${product.unit}`,
          priority: "critical",
        });
      }

      if (expiryStatus === "expired") {
        rows.push({
          id: `expired-${product.id}`,
          productName: product.product_name,
          brandName: brand?.name || "Unknown Brand",
          unitName: unit?.name || "Unknown Outlet",
          area: product.ops_area,
          status: "Expired",
          meta: product.expiry_date || "Expired",
          priority: "critical",
        });
      }

      if (stockStatus === "low") {
        rows.push({
          id: `low-${product.id}`,
          productName: product.product_name,
          brandName: brand?.name || "Unknown Brand",
          unitName: unit?.name || "Unknown Outlet",
          area: product.ops_area,
          status: "Low Stock",
          meta: `${formatQty(stockQty)} ${product.unit} left`,
          priority: "critical",
        });
      }

      if (stockStatus === "overstock") {
        rows.push({
          id: `over-${product.id}`,
          productName: product.product_name,
          brandName: brand?.name || "Unknown Brand",
          unitName: unit?.name || "Unknown Outlet",
          area: product.ops_area,
          status: "Overstock",
          meta: `${formatQty(stockQty)} ${product.unit}`,
          priority: "warning",
        });
      }

      if (expiryStatus === "expiring_soon") {
        rows.push({
          id: `expiring-${product.id}`,
          productName: product.product_name,
          brandName: brand?.name || "Unknown Brand",
          unitName: unit?.name || "Unknown Outlet",
          area: product.ops_area,
          status: "Expiring Soon",
          meta: product.expiry_date || "Expiring soon",
          priority: "warning",
        });
      }
    });

    filteredMovements
      .filter(
        (movement) =>
          movement.movement_type === "stock_count" &&
          Number(movement.discrepancy_qty || 0) !== 0,
      )
      .slice(0, 40)
      .forEach((movement) => {
        const product = products.find((item) => item.id === movement.product_id);
        const brand = brands.find((item) => item.id === movement.brand_id);
        const unit = units.find((item) => item.id === movement.brand_unit_id);

        rows.push({
          id: `discrepancy-${movement.id}`,
          productName: product?.product_name || "Unknown Product",
          brandName: brand?.name || "Unknown Brand",
          unitName: unit?.name || "Unknown Outlet",
          area: movement.ops_area,
          status: "Discrepancy",
          meta: `Variance ${formatQty(Number(movement.discrepancy_qty || 0))}`,
          priority: "critical",
        });
      });

    return rows.sort((a, b) => {
      const priorityOrder: Record<AlertPriority, number> = {
        critical: 0,
        warning: 1,
        stable: 2,
      };

      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [balanceMap, brands, filteredMovements, filteredProducts, products, units]);

  const totalInventoryValue = filteredProducts.reduce((total, product) => {
    const stockQty = getProductStock(product, balanceMap);

    return total + stockQty * Number(product.unit_cost || 0);
  }, 0);

  const lowStockCount = filteredProducts.filter(
    (product) => getStockStatus(product, balanceMap) === "low",
  ).length;

  const overStockCount = filteredProducts.filter(
    (product) => getStockStatus(product, balanceMap) === "overstock",
  ).length;

  const expiredCount = filteredProducts.filter(
    (product) => getExpiryStatus(product.expiry_date) === "expired",
  ).length;

  const expiringSoonCount = filteredProducts.filter(
    (product) => getExpiryStatus(product.expiry_date) === "expiring_soon",
  ).length;

  const discrepancyCount = filteredMovements.filter(
    (movement) =>
      movement.movement_type === "stock_count" &&
      Number(movement.discrepancy_qty || 0) !== 0,
  ).length;

  const wasteQty = filteredMovements
    .filter((movement) => movement.movement_type === "waste")
    .reduce((total, movement) => total + Number(movement.quantity || 0), 0);

  const shrinkageQty = filteredMovements
    .filter((movement) => movement.movement_type === "shrinkage")
    .reduce((total, movement) => total + Number(movement.quantity || 0), 0);

  const criticalAlerts = alertRows.filter(
    (alert) => alert.priority === "critical",
  ).length;

  const warningAlerts = alertRows.filter(
    (alert) => alert.priority === "warning",
  ).length;

  const globalPriority: AlertPriority =
    criticalAlerts > 0 ? "critical" : warningAlerts > 0 ? "warning" : "stable";

  const areaSummary = (["kitchen", "bar", "global"] as MainPanelOpsArea[]).map(
    (area) => {
      const areaProducts = products.filter((product) => product.ops_area === area);
      const areaProductIds = new Set(areaProducts.map((product) => product.id));
      const areaMovements = movements.filter((movement) =>
        areaProductIds.has(movement.product_id),
      );
      const areaAlerts = alertRows.filter((alert) => alert.area === area);
      const areaCritical = areaAlerts.filter(
        (alert) => alert.priority === "critical",
      ).length;
      const areaWarning = areaAlerts.filter(
        (alert) => alert.priority === "warning",
      ).length;
      const priority: AlertPriority =
        areaCritical > 0 ? "critical" : areaWarning > 0 ? "warning" : "stable";

      return {
        area,
        products: areaProducts.length,
        movements: areaMovements.length,
        alerts: areaAlerts.length,
        priority,
      };
    },
  );

  return (
    <div className="space-y-6">
      <section className="glass-panel relative overflow-hidden rounded-[2.35rem] p-6 md:p-8">
        <div className="absolute -right-28 -top-28 h-80 w-80 animate-pulse rounded-full bg-blue-200/50 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-80 w-80 animate-pulse rounded-full bg-amber-200/50 blur-3xl" />
        <div className="absolute left-1/2 top-8 h-52 w-52 -translate-x-1/2 animate-ping rounded-full bg-slate-200/20" />

        <div className="relative z-10 grid gap-6 xl:grid-cols-[1fr_390px] xl:items-center">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm font-black text-slate-700 shadow-sm">
              <Radar size={17} />
              Main Panel
            </div>

            <p className="text-sm font-black uppercase tracking-[0.24em] text-slate-400">
              Multi-Outlet Command Radar
            </p>
            <h1 className="mt-3 max-w-4xl text-4xl font-black tracking-tight text-slate-950 md:text-6xl">
              Live Alert System for Forza and Fusion
            </h1>
            <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
              Full animated command center for all outlet alerts, kitchen
              operations, bar operations, global stock risks, expiry warnings,
              discrepancies, waste, shrinkage, and inventory value.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {(["all", "kitchen", "bar", "global"] as AreaFilter[]).map(
                (area) => (
                  <button
                    key={area}
                    type="button"
                    onClick={() => setAreaFilter(area)}
                    className={`forza-button-hover rounded-full px-4 py-2 text-xs font-black uppercase tracking-wide shadow-sm transition ${
                      areaFilter === area
                        ? "bg-slate-950 text-white"
                        : "border border-slate-200 bg-white/85 text-slate-600"
                    }`}
                  >
                    {area === "all" ? "All Areas" : areaLabels[area]}
                  </button>
                ),
              )}
            </div>
          </div>

          <div
            className={`rounded-[2rem] border p-5 shadow-xl ${
              getPriorityClasses(globalPriority).panel
            }`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`relative flex h-16 w-16 items-center justify-center rounded-3xl shadow-xl ${
                  getPriorityClasses(globalPriority).icon
                }`}
              >
                <span
                  className={`absolute inline-flex h-full w-full animate-ping rounded-3xl opacity-40 ${
                    getPriorityClasses(globalPriority).dot
                  }`}
                />
                <Bell className="relative z-10" size={28} />
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                  Global Alert Status
                </p>
                <h2
                  className={`mt-1 text-2xl font-black ${
                    getPriorityClasses(globalPriority).text
                  }`}
                >
                  {globalPriority === "critical"
                    ? "Critical"
                    : globalPriority === "warning"
                      ? "Watch Mode"
                      : "Stable"}
                </h2>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <MiniSignal label="Critical" value={criticalAlerts} />
              <MiniSignal label="Warning" value={warningAlerts} />
              <MiniSignal label="Products" value={filteredProducts.length} />
              <MiniSignal label="Movements" value={filteredMovements.length} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Inventory Value"
          value={formatCurrency(totalInventoryValue)}
          sub="Calculated from live stock × unit cost"
          priority="stable"
          icon={<CircleDollarSign size={22} />}
        />
        <MetricCard
          label="Critical Alerts"
          value={String(criticalAlerts)}
          sub="Expired, low stock, discrepancy, negative stock"
          priority={criticalAlerts > 0 ? "critical" : "stable"}
          icon={<ShieldAlert size={22} />}
        />
        <MetricCard
          label="Warning Alerts"
          value={String(warningAlerts)}
          sub="Overstock and expiring soon"
          priority={warningAlerts > 0 ? "warning" : "stable"}
          icon={<AlertTriangle size={22} />}
        />
        <MetricCard
          label="Active Radar Triggers"
          value={String(alertRows.length)}
          sub="All outlet alert triggers"
          priority={globalPriority}
          icon={<Target size={22} />}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="glass-panel relative min-h-[620px] overflow-hidden rounded-[2.35rem] p-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.14),transparent_42%)]" />
          <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-200/60" />
          <div className="absolute left-1/2 top-1/2 h-[390px] w-[390px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-200/60" />
          <div className="absolute left-1/2 top-1/2 h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-200/60" />
          <div className="absolute left-1/2 top-1/2 h-[130px] w-[130px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-200/60" />
          <div className="absolute left-1/2 top-1/2 h-[560px] w-1 origin-top animate-[radarSweep_4s_linear_infinite] bg-gradient-to-b from-blue-400/70 via-blue-300/20 to-transparent" />

          <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-slate-400">
                Outlet Radar Map
              </p>
              <h2 className="mt-1 text-3xl font-black text-slate-950">
                North Macedonia Operations
              </h2>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-black uppercase tracking-wide text-white shadow-xl">
              <Satellite size={15} />
              Live Sync
            </div>
          </div>

          <div className="relative z-10 mt-10 grid min-h-[440px] place-items-center">
            <div className="relative h-[380px] w-full max-w-[680px] rounded-[3rem] border border-slate-200 bg-white/45 p-8 shadow-2xl backdrop-blur-xl">
              <div className="absolute inset-8 rounded-[2.5rem] border border-dashed border-slate-300/80" />
              <div className="absolute left-[18%] top-[24%] h-24 w-28 rounded-[55%_45%_45%_55%] border border-slate-300 bg-slate-50/80 shadow-inner" />
              <div className="absolute left-[38%] top-[16%] h-44 w-52 rounded-[45%_60%_40%_55%] border border-slate-300 bg-slate-50/90 shadow-inner" />
              <div className="absolute left-[48%] top-[45%] h-36 w-40 rounded-[60%_40%_55%_45%] border border-slate-300 bg-slate-50/80 shadow-inner" />

              {brands.map((brand, index) => {
                const brandUnits = units.filter(
                  (unit) => unit.brand_id === brand.id,
                );
                const brandProducts = filteredProducts.filter(
                  (product) => product.brand_id === brand.id,
                );
                const brandAlerts = alertRows.filter(
                  (alert) => alert.brandName === brand.name,
                );
                const brandCritical = brandAlerts.filter(
                  (alert) => alert.priority === "critical",
                ).length;
                const brandWarning = brandAlerts.filter(
                  (alert) => alert.priority === "warning",
                ).length;
                const priority: AlertPriority =
                  brandCritical > 0
                    ? "critical"
                    : brandWarning > 0
                      ? "warning"
                      : "stable";
                const classes = getPriorityClasses(priority);
                const accent = getBrandAccent(brand.code);
                const position =
                  index % 2 === 0
                    ? "left-[37%] top-[28%]"
                    : "left-[58%] top-[58%]";

                return (
                  <div
                    key={brand.id}
                    className={`absolute ${position} -translate-x-1/2 -translate-y-1/2`}
                  >
                    <div
                      className={`relative flex h-24 w-24 items-center justify-center rounded-full border-4 bg-white shadow-2xl ${classes.ring}`}
                    >
                      <span
                        className={`absolute h-full w-full animate-ping rounded-full opacity-30 ${classes.dot}`}
                      />
                      <span
                        className={`absolute h-36 w-36 animate-pulse rounded-full border ${accent.ring}`}
                      />
                      <MapPin className={classes.text} size={30} />
                    </div>

                    <div className="mt-3 min-w-[180px] rounded-3xl border border-slate-200 bg-white/95 p-4 text-center shadow-xl backdrop-blur-xl">
                      <p className="text-sm font-black text-slate-950">
                        {brand.name}
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        {brandUnits.length} outlet unit
                        {brandUnits.length === 1 ? "" : "s"} ·{" "}
                        {brandProducts.length} products
                      </p>
                      <span
                        className={`mt-3 inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ${classes.badge}`}
                      >
                        {priority}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative z-10 mt-5 flex flex-wrap gap-3">
            <LegendDot color="bg-emerald-500" label="Stable" />
            <LegendDot color="bg-amber-500" label="Warning" />
            <LegendDot color="bg-red-500" label="Critical" />
            <LegendDot color="bg-blue-500" label="Live Signal" />
          </div>
        </section>

        <section className="space-y-4">
          {areaSummary.map((item) => {
            const classes = getPriorityClasses(item.priority);
            const Icon =
              item.area === "kitchen"
                ? ChefHat
                : item.area === "bar"
                  ? GlassWater
                  : Globe2;

            return (
              <div
                key={item.area}
                className={`relative overflow-hidden rounded-[2rem] border p-5 shadow-lg ${classes.panel}`}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.9),transparent_35%)]" />

                <div className="relative z-10 flex items-center gap-4">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-3xl shadow-xl ${classes.icon}`}
                  >
                    <Icon size={24} />
                  </div>

                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                      {areaLabels[item.area]} Radar
                    </p>
                    <h3 className="text-2xl font-black text-slate-950">
                      {item.alerts} Alerts
                    </h3>
                  </div>
                </div>

                <div className="relative z-10 mt-5 grid grid-cols-3 gap-2">
                  <MiniSignal label="Products" value={item.products} />
                  <MiniSignal label="Moves" value={item.movements} />
                  <MiniSignal label="Alerts" value={item.alerts} />
                </div>
              </div>
            );
          })}

          <div className="glass-panel rounded-[2rem] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">
                  Movement Risk
                </p>
                <h3 className="text-2xl font-black text-slate-950">
                  Waste & Shrinkage
                </h3>
              </div>
              <Waves size={26} className="text-slate-400" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <MiniSignal label="Waste" value={Number(formatQty(wasteQty)) || 0} />
              <MiniSignal
                label="Shrinkage"
                value={Number(formatQty(shrinkageQty)) || 0}
              />
            </div>
          </div>
        </section>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Low Stock"
          value={String(lowStockCount)}
          sub="At or below minimum"
          priority={lowStockCount > 0 ? "critical" : "stable"}
          icon={<AlertTriangle size={22} />}
        />
        <MetricCard
          label="Over Stock"
          value={String(overStockCount)}
          sub="Above maximum"
          priority={overStockCount > 0 ? "warning" : "stable"}
          icon={<Boxes size={22} />}
        />
        <MetricCard
          label="Expired"
          value={String(expiredCount)}
          sub="Expired products"
          priority={expiredCount > 0 ? "critical" : "stable"}
          icon={<Flame size={22} />}
        />
        <MetricCard
          label="Expiring Soon"
          value={String(expiringSoonCount)}
          sub="Within 14 days"
          priority={expiringSoonCount > 0 ? "warning" : "stable"}
          icon={<CalendarClock size={22} />}
        />
        <MetricCard
          label="Discrepancy"
          value={String(discrepancyCount)}
          sub="Physical count variance"
          priority={discrepancyCount > 0 ? "critical" : "stable"}
          icon={<ShieldAlert size={22} />}
        />
        <MetricCard
          label="Waste"
          value={formatQty(wasteQty)}
          sub="Waste movement total"
          priority={wasteQty > 0 ? "warning" : "stable"}
          icon={<Gauge size={22} />}
        />
        <MetricCard
          label="Shrinkage"
          value={formatQty(shrinkageQty)}
          sub="Shrinkage movement total"
          priority={shrinkageQty > 0 ? "warning" : "stable"}
          icon={<Package size={22} />}
        />
        <MetricCard
          label="Outlets"
          value={String(units.length)}
          sub="Active outlet units"
          priority="stable"
          icon={<Building2 size={22} />}
        />
      </section>

      <section className="glass-panel rounded-[2.35rem] p-6">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-slate-400">
              Live Alert Feed
            </p>
            <h2 className="mt-1 text-3xl font-black text-slate-950">
              Outlet Trigger Board
            </h2>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-xs font-black uppercase tracking-wide text-white shadow-xl">
            <RefreshCw size={15} />
            Auto Refresh
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-separate border-spacing-y-3">
            <thead>
              <tr className="text-left text-xs font-black uppercase tracking-wide text-slate-400">
                <th className="px-4">Product / Issue</th>
                <th className="px-4">Outlet</th>
                <th className="px-4">Area</th>
                <th className="px-4">Status</th>
                <th className="px-4">Meta</th>
                <th className="px-4">Priority</th>
              </tr>
            </thead>

            <tbody>
              {alertRows.slice(0, 18).map((alert) => {
                const classes = getPriorityClasses(alert.priority);
                const AreaIcon =
                  alert.area === "kitchen"
                    ? ChefHat
                    : alert.area === "bar"
                      ? GlassWater
                      : Globe2;

                return (
                  <tr key={alert.id} className="rounded-2xl bg-white shadow-sm">
                    <td className="rounded-l-2xl px-4 py-4">
                      <p className="text-sm font-black text-slate-950">
                        {alert.productName}
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-400">
                        {alert.status}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-slate-700">
                      {alert.brandName} · {alert.unitName}
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-700">
                        <AreaIcon size={14} />
                        {areaLabels[alert.area]}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-slate-700">
                      {alert.status}
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-slate-500">
                      {alert.meta}
                    </td>
                    <td className="rounded-r-2xl px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black uppercase ${classes.badge}`}
                      >
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                        </span>
                        {alert.priority}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {alertRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="rounded-2xl bg-white px-4 py-8 text-center text-sm font-black text-emerald-700"
                  >
                    No active alerts. All outlets are stable.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <style jsx>{`
        @keyframes radarSweep {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

type MetricCardProps = {
  label: string;
  value: string;
  sub: string;
  priority: AlertPriority;
  icon: React.ReactNode;
};

function MetricCard({ label, value, sub, priority, icon }: MetricCardProps) {
  const classes = getPriorityClasses(priority);

  return (
    <div
      className={`relative overflow-hidden rounded-[2rem] border p-5 shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-xl ${classes.panel}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.9),transparent_35%)]" />

      {priority !== "stable" ? (
        <div className={`absolute right-5 top-5 h-4 w-4 rounded-full ${classes.dot}`}>
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${classes.dot}`}
          />
        </div>
      ) : null}

      <div
        className={`relative z-10 mb-5 flex h-12 w-12 items-center justify-center rounded-2xl shadow-xl ${classes.icon}`}
      >
        {icon}
      </div>

      <p className="relative z-10 text-sm font-bold text-slate-500">{label}</p>
      <p className="relative z-10 mt-2 text-3xl font-black text-slate-950">
        {value}
      </p>
      <p className="relative z-10 mt-1 text-xs font-black uppercase tracking-wide text-slate-400">
        {sub}
      </p>
    </div>
  );
}

type MiniSignalProps = {
  label: string;
  value: number;
};

function MiniSignal({ label, value }: MiniSignalProps) {
  return (
    <div className="rounded-2xl bg-white/75 p-3 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-xl font-black text-slate-950">{value}</p>
    </div>
  );
}

type LegendDotProps = {
  color: string;
  label: string;
};

function LegendDot({ color, label }: LegendDotProps) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-600 shadow-sm">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </div>
  );
}