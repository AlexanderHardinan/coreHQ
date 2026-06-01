import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
  Bell,
  Boxes,
  Building2,
  CalendarClock,
  ChefHat,
  CircleDollarSign,
  ClipboardList,
  Flame,
  Gauge,
  LayoutGrid,
  PieChart,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Store,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { redirect } from "next/navigation";
import {
  DashboardShell,
  type DashboardBrand,
} from "@/components/layout/dashboard-shell";
import { getAllowedModules, type UserRole } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type DashboardPageProps = {
  searchParams?: Promise<{
    brand?: string;
  }>;
};

type OpsArea = "kitchen" | "bar" | "global";

type DashboardProduct = {
  id: string;
  brand_id: string | null;
  brand_unit_id: string;
  category_id: string | null;
  ops_area: OpsArea;
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

type DashboardMovementType =
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

type DashboardMovement = {
  id: string;
  product_id: string;
  movement_type: DashboardMovementType;
  quantity: number;
  movement_date: string;
  system_balance_after: number | null;
  physical_count_qty: number | null;
  discrepancy_qty: number | null;
};

type DashboardSoldItem = {
  id: string;
  brand_id: string | null;
  brand_unit_id: string;
  recipe_id: string | null;
  ops_area: OpsArea;
  item_name: string;
  quantity: number;
  selling_price: number;
  total_sales: number;
  sold_date: string;
};

type AlertPriority = "critical" | "warning" | "stable";

const stockInTypes: DashboardMovementType[] = [
  "opening_stock",
  "product_in",
  "transfer_in",
  "adjustment_in",
];

const stockOutTypes: DashboardMovementType[] = [
  "production_consumption",
  "sold_consumption",
  "waste",
  "shrinkage",
  "transfer_out",
  "adjustment_out",
];

const opsAreaLabels: Record<OpsArea, string> = {
  kitchen: "Kitchen",
  bar: "Bar",
  global: "Global",
};

function normalizeBrandCode(value: string | undefined) {
  const brand = String(value || "FORZA").trim().toUpperCase();

  if (brand === "FUSION") {
    return "FUSION";
  }

  return "FORZA";
}

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

function getStockStatus(product: DashboardProduct) {
  if (
    Number(product.maximum_stock || 0) > 0 &&
    Number(product.current_stock || 0) > Number(product.maximum_stock || 0)
  ) {
    return "overstock";
  }

  if (Number(product.current_stock || 0) <= Number(product.minimum_stock || 0)) {
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

function getMovementLabel(type: DashboardMovementType) {
  const labels: Record<DashboardMovementType, string> = {
    opening_stock: "Opening Stock",
    product_in: "Product In",
    transfer_in: "Transfer In",
    adjustment_in: "Adjustment In",
    production_consumption: "Production Consumption",
    sold_consumption: "Sold Consumption",
    waste: "Waste",
    shrinkage: "Shrinkage",
    transfer_out: "Transfer Out",
    adjustment_out: "Adjustment Out",
    stock_count: "Stock Count",
  };

  return labels[type] || type;
}

function getPriorityClass(priority: AlertPriority) {
  if (priority === "critical") {
    return {
      card: "border-red-200 bg-red-50/90 shadow-red-100",
      icon: "bg-red-600 text-white shadow-red-200",
      text: "text-red-700",
      glow: "bg-red-500",
      badge: "bg-red-600 text-white",
    };
  }

  if (priority === "warning") {
    return {
      card: "border-amber-200 bg-amber-50/90 shadow-amber-100",
      icon: "bg-amber-500 text-white shadow-amber-200",
      text: "text-amber-700",
      glow: "bg-amber-500",
      badge: "bg-amber-500 text-white",
    };
  }

  return {
    card: "border-emerald-200 bg-emerald-50/90 shadow-emerald-100",
    icon: "bg-emerald-600 text-white shadow-emerald-200",
    text: "text-emerald-700",
    glow: "bg-emerald-500",
    badge: "bg-emerald-600 text-white",
  };
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const resolvedSearchParams = await searchParams;
  const requestedBrandCode = normalizeBrandCode(resolvedSearchParams?.brand);

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/sign-in");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.is_active === false) {
    redirect("/sign-in");
  }

  const role = profile.role as UserRole;
  const modules = getAllowedModules(role);

  const { data: brandsData } = await supabase
    .from("brands")
    .select("id, name, code, description, icon")
    .eq("is_active", true)
    .order("name", { ascending: true });

  const brands = ((brandsData || []) as DashboardBrand[]).sort((a, b) => {
    const order = ["FORZA", "FUSION"];
    const aIndex = order.indexOf(a.code);
    const bIndex = order.indexOf(b.code);

    if (aIndex === -1 && bIndex === -1) {
      return a.name.localeCompare(b.name);
    }

    if (aIndex === -1) {
      return 1;
    }

    if (bIndex === -1) {
      return -1;
    }

    return aIndex - bIndex;
  });

  const selectedBrand =
    brands.find((brand) => brand.code === requestedBrandCode) ||
    brands.find((brand) => brand.code === "FORZA") ||
    brands[0] ||
    null;

  const selectedBrandId = selectedBrand?.id || "";
  const selectedBrandCode = selectedBrand?.code || requestedBrandCode;
  const selectedBrandName =
    selectedBrand?.name || (selectedBrandCode === "FUSION" ? "Fusion" : "Forza");

  const { data: productsData } = await supabase
    .from("products")
    .select(
      "id, brand_id, brand_unit_id, category_id, ops_area, product_name, sku, unit, current_stock, minimum_stock, maximum_stock, unit_cost, expiry_date, is_active",
    )
    .eq("brand_id", selectedBrandId)
    .eq("is_active", true)
    .order("product_name", { ascending: true });

  const products = (productsData || []) as DashboardProduct[];
  const productIds = products.map((product) => product.id);

  const { data: movementsData } =
    selectedBrandId && productIds.length > 0
      ? await supabase
          .from("inventory_movements")
          .select(
            "id, product_id, movement_type, quantity, movement_date, system_balance_after, physical_count_qty, discrepancy_qty",
          )
          .eq("brand_id", selectedBrandId)
          .in("product_id", productIds)
          .order("movement_date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(300)
      : { data: [] };

  const movements = (movementsData || []) as DashboardMovement[];

  const { data: soldItemsData } = await supabase
    .from("sold_items")
    .select(
      "id, brand_id, brand_unit_id, recipe_id, ops_area, item_name, quantity, selling_price, total_sales, sold_date",
    )
    .eq("brand_id", selectedBrandId)
    .order("sold_date", { ascending: false })
    .limit(300);

  const soldItems = (soldItemsData || []) as DashboardSoldItem[];

  const inventoryValue = products.reduce(
    (total, product) =>
      total + Number(product.current_stock || 0) * Number(product.unit_cost || 0),
    0,
  );

  const lowStockProducts = products.filter(
    (product) => getStockStatus(product) === "low",
  );

  const overStockProducts = products.filter(
    (product) => getStockStatus(product) === "overstock",
  );

  const expiredProducts = products.filter(
    (product) => getExpiryStatus(product.expiry_date) === "expired",
  );

  const expiringSoonProducts = products.filter(
    (product) => getExpiryStatus(product.expiry_date) === "expiring_soon",
  );

  const discrepancyMovements = movements.filter(
    (movement) =>
      movement.movement_type === "stock_count" &&
      Number(movement.discrepancy_qty || 0) !== 0,
  );

  const stockInQty = movements
    .filter((movement) => stockInTypes.includes(movement.movement_type))
    .reduce((total, movement) => total + Number(movement.quantity || 0), 0);

  const stockOutQty = movements
    .filter((movement) => stockOutTypes.includes(movement.movement_type))
    .reduce((total, movement) => total + Number(movement.quantity || 0), 0);

  const wasteQty = movements
    .filter((movement) => movement.movement_type === "waste")
    .reduce((total, movement) => total + Number(movement.quantity || 0), 0);

  const shrinkageQty = movements
    .filter((movement) => movement.movement_type === "shrinkage")
    .reduce((total, movement) => total + Number(movement.quantity || 0), 0);

  const soldQty = soldItems.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0,
  );

  const totalSales = soldItems.reduce(
    (total, item) => total + Number(item.total_sales || 0),
    0,
  );

  const criticalScore =
    expiredProducts.length * 5 +
    lowStockProducts.length * 3 +
    overStockProducts.length * 2 +
    discrepancyMovements.length * 4 +
    expiringSoonProducts.length;

  const riskLevel: AlertPriority =
    criticalScore > 8 ? "critical" : criticalScore > 0 ? "warning" : "stable";

  const consumedIngredientMap = new Map<
    string,
    {
      productName: string;
      sku: string;
      unit: string;
      quantity: number;
    }
  >();

  movements
    .filter((movement) => movement.movement_type === "sold_consumption")
    .forEach((movement) => {
      const product = products.find((item) => item.id === movement.product_id);

      if (!product) {
        return;
      }

      const current = consumedIngredientMap.get(product.id) || {
        productName: product.product_name,
        sku: product.sku,
        unit: product.unit,
        quantity: 0,
      };

      consumedIngredientMap.set(product.id, {
        ...current,
        quantity: current.quantity + Number(movement.quantity || 0),
      });
    });

  const topConsumedIngredients = Array.from(consumedIngredientMap.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 6);

  const soldDishMap = new Map<
    string,
    {
      itemName: string;
      quantity: number;
      totalSales: number;
    }
  >();

  soldItems.forEach((item) => {
    const current = soldDishMap.get(item.item_name) || {
      itemName: item.item_name,
      quantity: 0,
      totalSales: 0,
    };

    soldDishMap.set(item.item_name, {
      itemName: item.item_name,
      quantity: current.quantity + Number(item.quantity || 0),
      totalSales: current.totalSales + Number(item.total_sales || 0),
    });
  });

  const topSoldDishes = Array.from(soldDishMap.values())
    .sort((a, b) => b.totalSales - a.totalSales)
    .slice(0, 6);

  const topLowestStock = [...products]
    .sort((a, b) => Number(a.current_stock || 0) - Number(b.current_stock || 0))
    .slice(0, 8);

  const latestMovements = movements.slice(0, 10);

  const priorityAlerts = [
    ...expiredProducts.slice(0, 4).map((product) => ({
      id: `expired-${product.id}`,
      title: "Expired Item Detected",
      label: product.product_name,
      meta: `${formatQty(product.current_stock)} ${product.unit} left`,
      priority: "critical" as AlertPriority,
      icon: Flame,
    })),
    ...lowStockProducts.slice(0, 4).map((product) => ({
      id: `low-${product.id}`,
      title: "Low Stock Alert",
      label: product.product_name,
      meta: `${formatQty(product.current_stock)} ${product.unit} left`,
      priority: "critical" as AlertPriority,
      icon: AlertTriangle,
    })),
    ...overStockProducts.slice(0, 4).map((product) => ({
      id: `over-${product.id}`,
      title: "Overstock Alert",
      label: product.product_name,
      meta: `${formatQty(product.current_stock)} ${product.unit} on hand`,
      priority: "warning" as AlertPriority,
      icon: Boxes,
    })),
    ...discrepancyMovements.slice(0, 4).map((movement) => {
      const product = products.find((item) => item.id === movement.product_id);

      return {
        id: `discrepancy-${movement.id}`,
        title: "Stock Count Discrepancy",
        label: product?.product_name || "Unknown Product",
        meta: `Difference: ${formatQty(Number(movement.discrepancy_qty || 0))}`,
        priority: "critical" as AlertPriority,
        icon: ShieldAlert,
      };
    }),
    ...expiringSoonProducts.slice(0, 4).map((product) => ({
      id: `expiring-${product.id}`,
      title: "Expiry Watch",
      label: product.product_name,
      meta: product.expiry_date || "Expiring soon",
      priority: "warning" as AlertPriority,
      icon: CalendarClock,
    })),
  ].slice(0, 10);

  const metrics = [
    {
      label: "Inventory Value",
      value: formatCurrency(inventoryValue),
      sub: "Live product value",
      icon: CircleDollarSign,
      priority: "stable" as AlertPriority,
    },
    {
      label: "Net Revenue",
      value: formatCurrency(totalSales),
      sub: "Sales performance",
      icon: TrendingUp,
      priority: "stable" as AlertPriority,
    },
    {
      label: "Stock In",
      value: formatQty(stockInQty),
      sub: "Inventory inflow",
      icon: ArrowUpCircle,
      priority: "stable" as AlertPriority,
    },
    {
      label: "Stock Out",
      value: formatQty(stockOutQty),
      sub: "Inventory outflow",
      icon: ArrowDownCircle,
      priority: (stockOutQty > stockInQty ? "warning" : "stable") as AlertPriority,
    },
  ];

  const matrixCards = [
    {
      title: "Expired",
      value: String(expiredProducts.length),
      description: "Items past expiry date",
      icon: Flame,
      priority: expiredProducts.length > 0 ? "critical" : "stable",
    },
    {
      title: "Low Stock",
      value: String(lowStockProducts.length),
      description: "At or below minimum",
      icon: AlertTriangle,
      priority: lowStockProducts.length > 0 ? "critical" : "stable",
    },
    {
      title: "Overstock",
      value: String(overStockProducts.length),
      description: "Above maximum level",
      icon: Boxes,
      priority: overStockProducts.length > 0 ? "warning" : "stable",
    },
    {
      title: "Expiry Watch",
      value: String(expiringSoonProducts.length),
      description: "Expiring within 14 days",
      icon: CalendarClock,
      priority: expiringSoonProducts.length > 0 ? "warning" : "stable",
    },
    {
      title: "Discrepancy",
      value: String(discrepancyMovements.length),
      description: "Physical count variance",
      icon: ShieldAlert,
      priority: discrepancyMovements.length > 0 ? "critical" : "stable",
    },
    {
      title: "Waste",
      value: formatQty(wasteQty),
      description: "Waste movement total",
      icon: PieChart,
      priority: wasteQty > 0 ? "warning" : "stable",
    },
    {
      title: "Shrinkage",
      value: formatQty(shrinkageQty),
      description: "Shrinkage movement total",
      icon: Gauge,
      priority: shrinkageQty > 0 ? "warning" : "stable",
    },
    {
      title: "Sold Qty",
      value: formatQty(soldQty),
      description: "Total sold quantity",
      icon: Store,
      priority: "stable" as AlertPriority,
    },
  ];

  const riskClass = getPriorityClass(riskLevel);

  return (
    <DashboardShell
      fullName={profile.full_name || user.email || "Forza User"}
      avatarUrl={profile.avatar_url || null}
      role={role}
      modules={modules}
      brands={brands}
      selectedBrand={selectedBrand}
    >
      <section className="glass-panel relative overflow-hidden rounded-[2.25rem] p-6 md:p-8">
        <div className="absolute -right-24 -top-24 h-72 w-72 animate-pulse rounded-full bg-emerald-200/50 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 h-72 w-72 animate-pulse rounded-full bg-amber-200/50 blur-3xl" />
        <div className="absolute left-1/2 top-10 h-48 w-48 -translate-x-1/2 animate-ping rounded-full bg-slate-200/20" />

        <div className="relative z-10 grid gap-6 xl:grid-cols-[1fr_390px] xl:items-center">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm font-black text-slate-700 shadow-sm">
              <Sparkles size={16} />
              Premium Animated Matrix
            </div>

            <p className="text-sm font-black uppercase tracking-[0.24em] text-slate-400">
              Executive Performance Command
            </p>
            <h2 className="mt-3 max-w-4xl text-4xl font-black tracking-tight text-slate-950 md:text-6xl">
              {selectedBrandName} Live Operational Matrix
            </h2>
            <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
              Premium live dashboard for revenue, inventory health, stock
              movement, expiry, low stock, overstock, discrepancy, kitchen and
              bar operational performance.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <StatusPill
                priority={riskLevel}
                label={
                  riskLevel === "critical"
                    ? "Critical attention required"
                    : riskLevel === "warning"
                      ? "Warnings active"
                      : "All systems stable"
                }
              />
              <div className="rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-500 shadow-sm">
                Brand: {selectedBrandCode}
              </div>
              <div className="rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-500 shadow-sm">
                Products: {products.length}
              </div>
            </div>
          </div>

          <div className={`rounded-[2rem] border p-5 shadow-xl ${riskClass.card}`}>
            <div className="flex items-center gap-4">
              <div
                className={`relative flex h-16 w-16 items-center justify-center rounded-3xl shadow-xl ${riskClass.icon}`}
              >
                <span
                  className={`absolute inline-flex h-full w-full animate-ping rounded-3xl opacity-40 ${riskClass.glow}`}
                />
                <Bell className="relative z-10" size={28} />
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                  Premium Alert Status
                </p>
                <h3 className={`mt-1 text-2xl font-black ${riskClass.text}`}>
                  {riskLevel === "critical"
                    ? "Red Alert"
                    : riskLevel === "warning"
                      ? "Watch Mode"
                      : "Stable"}
                </h3>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <MiniSignal label="Expired" value={expiredProducts.length} />
              <MiniSignal label="Low" value={lowStockProducts.length} />
              <MiniSignal label="Over" value={overStockProducts.length} />
              <MiniSignal label="Variance" value={discrepancyMovements.length} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <PremiumMetricCard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              sub={metric.sub}
              priority={metric.priority}
              icon={<Icon size={22} />}
            />
          );
        })}
      </section>

      <section className="glass-panel rounded-[2.25rem] p-6">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-slate-400">
              Alert Matrix
            </p>
            <h2 className="mt-1 text-3xl font-black text-slate-950">
              Live Risk Performance Grid
            </h2>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-xs font-black uppercase tracking-wide text-white shadow-xl">
            <Zap size={15} />
            Realtime Performance Signals
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {matrixCards.map((card) => {
            const Icon = card.icon;

            return (
              <MatrixCard
                key={card.title}
                title={card.title}
                value={card.value}
                description={card.description}
                priority={card.priority}
                icon={<Icon size={22} />}
              />
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[430px_1fr]">
        <section className="glass-panel rounded-[2.25rem] p-6">
          <div className="mb-5">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-slate-400">
              Premium Notifications
            </p>
            <h2 className="text-2xl font-black text-slate-950">
              Alert Toast Feed
            </h2>
          </div>

          <div className="space-y-3">
            {priorityAlerts.map((alert) => {
              const Icon = alert.icon;
              const classes = getPriorityClass(alert.priority);

              return (
                <div
                  key={alert.id}
                  className={`relative overflow-hidden rounded-3xl border p-4 shadow-lg ${classes.card}`}
                >
                  <div
                    className={`absolute right-4 top-4 h-3 w-3 rounded-full ${classes.glow}`}
                  >
                    <span
                      className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-70 ${classes.glow}`}
                    />
                  </div>

                  <div className="flex gap-3">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-lg ${classes.icon}`}
                    >
                      <Icon size={20} />
                    </div>
                    <div>
                      <p className={`text-xs font-black uppercase ${classes.text}`}>
                        {alert.title}
                      </p>
                      <h3 className="mt-1 font-black text-slate-950">
                        {alert.label}
                      </h3>
                      <p className="mt-1 text-sm font-bold text-slate-600">
                        {alert.meta}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            {priorityAlerts.length === 0 ? (
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-black text-emerald-700 shadow-sm">
                No premium alerts. Operations are stable.
              </div>
            ) : null}
          </div>
        </section>

        <section className="glass-panel rounded-[2.25rem] p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-slate-400">
                Product Matrix
              </p>
              <h2 className="text-2xl font-black text-slate-950">
                Lowest Stock Radar
              </h2>
            </div>
            <LayoutGrid className="text-slate-400" size={28} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {topLowestStock.map((product) => {
              const stockStatus = getStockStatus(product);
              const expiryStatus = getExpiryStatus(product.expiry_date);
              const priority: AlertPriority =
                expiryStatus === "expired" || stockStatus === "low"
                  ? "critical"
                  : stockStatus === "overstock" || expiryStatus === "expiring_soon"
                    ? "warning"
                    : "stable";
              const classes = getPriorityClass(priority);

              return (
                <div
                  key={product.id}
                  className={`relative overflow-hidden rounded-3xl border p-5 shadow-lg transition duration-300 hover:-translate-y-1 ${classes.card}`}
                >
                  {priority !== "stable" ? (
                    <div
                      className={`absolute right-4 top-4 h-3 w-3 rounded-full ${classes.glow}`}
                    >
                      <span
                        className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-70 ${classes.glow}`}
                      />
                    </div>
                  ) : null}

                  <h3 className="font-black text-slate-950">
                    {product.product_name}
                  </h3>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                    {opsAreaLabels[product.ops_area]} · {product.sku}
                  </p>

                  <p className="mt-4 text-3xl font-black text-slate-950">
                    {formatQty(product.current_stock)} {product.unit}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${classes.badge}`}>
                      {stockStatus === "low"
                        ? "Low Stock"
                        : stockStatus === "overstock"
                          ? "Overstock"
                          : "On Track"}
                    </span>
                    <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-black text-slate-600">
                      {expiryStatus === "expired"
                        ? "Expired"
                        : expiryStatus === "expiring_soon"
                          ? "Expiring Soon"
                          : expiryStatus === "safe"
                            ? "Safe"
                            : "No Expiry"}
                    </span>
                  </div>
                </div>
              );
            })}

            {topLowestStock.length === 0 ? (
              <div className="rounded-3xl bg-white/75 p-5 text-sm font-bold text-slate-500 md:col-span-2">
                No products found for this brand.
              </div>
            ) : null}
          </div>
        </section>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_390px]">
        <section className="glass-panel rounded-[2.25rem] p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-slate-400">
                Brand Access
              </p>
              <h2 className="text-2xl font-black text-slate-950">
                Performance Modules
              </h2>
            </div>
            <BarChart3 className="text-slate-400" size={28} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {modules.map((module) => (
              <a
                key={`${module.href}-${module.title}`}
                href={`${module.href}?brand=${selectedBrandCode}`}
                className="group rounded-3xl border border-slate-200 bg-white/75 p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-slate-950 hover:shadow-xl"
              >
                <h3 className="text-lg font-black text-slate-950">
                  {module.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {module.description}
                </p>
                <div className="mt-4 h-1 rounded-full bg-slate-100">
                  <div className="h-1 w-1/3 rounded-full bg-slate-950 transition-all duration-500 group-hover:w-full" />
                </div>
              </a>
            ))}
          </div>
        </section>

        <section className="glass-panel rounded-[2.25rem] p-6">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-slate-400">
            Consumption Watch
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            Top Consumed Ingredients
          </h2>

          <div className="mt-5 space-y-3">
            {topConsumedIngredients.map((item) => (
              <div
                key={item.sku}
                className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-700">
                    <ChefHat size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-950">
                      {item.productName}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {formatQty(item.quantity)} {item.unit} consumed
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {topConsumedIngredients.length === 0 ? (
              <div className="rounded-3xl bg-white/75 p-5 text-sm font-bold text-slate-500">
                No sold consumption recorded yet.
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="glass-panel rounded-[2.25rem] p-6">
          <div className="mb-5">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-slate-400">
              Revenue Ranking
            </p>
            <h2 className="text-2xl font-black text-slate-950">
              Top Sold Items
            </h2>
          </div>

          <div className="space-y-3">
            {topSoldDishes.map((dish) => (
              <div
                key={dish.itemName}
                className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-black text-slate-950">
                      {dish.itemName}
                    </h3>
                    <p className="mt-1 text-sm font-bold text-slate-500">
                      Sold Qty: {formatQty(dish.quantity)}
                    </p>
                  </div>
                  <p className="text-sm font-black text-slate-950">
                    {formatCurrency(dish.totalSales)}
                  </p>
                </div>
              </div>
            ))}

            {topSoldDishes.length === 0 ? (
              <div className="rounded-3xl bg-white/75 p-5 text-sm font-bold text-slate-500">
                No sold items recorded yet.
              </div>
            ) : null}
          </div>
        </section>

        <section className="glass-panel rounded-[2.25rem] p-6">
          <div className="mb-5">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-slate-400">
              Inventory Pulse
            </p>
            <h2 className="text-2xl font-black text-slate-950">
              Latest Stock Movements
            </h2>
          </div>

          <div className="space-y-3">
            {latestMovements.map((movement) => {
              const product = products.find(
                (item) => item.id === movement.product_id,
              );

              return (
                <div
                  key={movement.id}
                  className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-black text-slate-950">
                        {product?.product_name || "Unknown Product"}
                      </h3>
                      <p className="mt-1 text-sm font-bold text-slate-500">
                        {getMovementLabel(movement.movement_type)} ·{" "}
                        {movement.movement_date}
                      </p>
                    </div>
                    <p className="text-sm font-black text-slate-950">
                      {movement.movement_type === "stock_count"
                        ? "Count"
                        : `${formatQty(movement.quantity)} ${
                            product?.unit || ""
                          }`}
                    </p>
                  </div>
                </div>
              );
            })}

            {latestMovements.length === 0 ? (
              <div className="rounded-3xl bg-white/75 p-5 text-sm font-bold text-slate-500">
                No movement records found.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}

type PremiumMetricCardProps = {
  label: string;
  value: string;
  sub: string;
  priority: AlertPriority;
  icon: React.ReactNode;
};

function PremiumMetricCard({
  label,
  value,
  sub,
  priority,
  icon,
}: PremiumMetricCardProps) {
  const classes = getPriorityClass(priority);

  return (
    <div
      className={`relative overflow-hidden rounded-[2rem] border p-5 shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-xl ${classes.card}`}
    >
      <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-white/40 blur-2xl" />

      {priority !== "stable" ? (
        <div className={`absolute right-5 top-5 h-3 w-3 rounded-full ${classes.glow}`}>
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-70 ${classes.glow}`}
          />
        </div>
      ) : null}

      <div className="relative z-10 mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-xl">
        {icon}
      </div>

      <p className="relative z-10 text-sm font-bold text-slate-500">{label}</p>
      <p className="relative z-10 mt-2 text-2xl font-black text-slate-950">
        {value}
      </p>
      <p className="relative z-10 mt-1 text-xs font-black uppercase tracking-wide text-slate-400">
        {sub}
      </p>
    </div>
  );
}

type MatrixCardProps = {
  title: string;
  value: string;
  description: string;
  priority: AlertPriority;
  icon: React.ReactNode;
};

function MatrixCard({
  title,
  value,
  description,
  priority,
  icon,
}: MatrixCardProps) {
  const classes = getPriorityClass(priority);

  return (
    <div
      className={`relative overflow-hidden rounded-[2rem] border p-5 shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-xl ${classes.card}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.85),transparent_35%)]" />

      {priority !== "stable" ? (
        <div className={`absolute right-5 top-5 h-4 w-4 rounded-full ${classes.glow}`}>
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${classes.glow}`}
          />
        </div>
      ) : null}

      <div
        className={`relative z-10 mb-5 flex h-12 w-12 items-center justify-center rounded-2xl shadow-xl ${classes.icon}`}
      >
        {icon}
      </div>
      <h3 className="relative z-10 text-sm font-black uppercase tracking-wide text-slate-500">
        {title}
      </h3>
      <p className="relative z-10 mt-2 text-4xl font-black text-slate-950">
        {value}
      </p>
      <p className="relative z-10 mt-2 text-sm font-semibold leading-6 text-slate-600">
        {description}
      </p>
    </div>
  );
}

type StatusPillProps = {
  priority: AlertPriority;
  label: string;
};

function StatusPill({ priority, label }: StatusPillProps) {
  const classes = getPriorityClass(priority);

  return (
    <div
      className={`relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-wide shadow-sm ${classes.badge}`}
    >
      {priority !== "stable" ? (
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
        </span>
      ) : (
        <span className="h-2.5 w-2.5 rounded-full bg-white" />
      )}
      {label}
    </div>
  );
}

type MiniSignalProps = {
  label: string;
  value: number;
};

function MiniSignal({ label, value }: MiniSignalProps) {
  const isActive = value > 0;

  return (
    <div className="rounded-2xl bg-white/80 p-3 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xl font-black text-slate-950">{value}</p>
        <span
          className={`relative h-3 w-3 rounded-full ${
            isActive ? "bg-red-500" : "bg-emerald-500"
          }`}
        >
          {isActive ? (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-70" />
          ) : null}
        </span>
      </div>
    </div>
  );
}