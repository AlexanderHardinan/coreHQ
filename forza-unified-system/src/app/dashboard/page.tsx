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
  PieChart,
  ShieldCheck,
  Store,
  TrendingUp,
} from "lucide-react";
import { redirect } from "next/navigation";
import {
  DashboardShell,
  type DashboardBrand,
} from "@/components/layout/dashboard-shell";
import { getAllowedModules, type UserRole } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase-server";

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

  if (profile?.is_active === false) {
    redirect("/sign-in");
  }

  const role = (profile?.role || "manager") as UserRole;
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
    productIds.length > 0
      ? await supabase
          .from("inventory_movements")
          .select(
            "id, product_id, movement_type, quantity, movement_date, system_balance_after, physical_count_qty, discrepancy_qty",
          )
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
    .limit(150);

  const soldItems = (soldItemsData || []) as DashboardSoldItem[];

  const inventoryValue = products.reduce(
    (total, product) =>
      total + Number(product.current_stock || 0) * Number(product.unit_cost || 0),
    0,
  );

  const lowStockCount = products.filter(
    (product) => getStockStatus(product) === "low",
  ).length;

  const overStockCount = products.filter(
    (product) => getStockStatus(product) === "overstock",
  ).length;

  const expiryWatchCount = products.filter((product) =>
    ["expired", "expiring_soon"].includes(getExpiryStatus(product.expiry_date)),
  ).length;

  const discrepancyCount = movements.filter(
    (movement) =>
      movement.movement_type === "stock_count" &&
      Number(movement.discrepancy_qty || 0) !== 0,
  ).length;

  const stockInQty = movements
    .filter((movement) => stockInTypes.includes(movement.movement_type))
    .reduce((total, movement) => total + Number(movement.quantity || 0), 0);

  const stockOutQty = movements
    .filter((movement) => stockOutTypes.includes(movement.movement_type))
    .reduce((total, movement) => total + Number(movement.quantity || 0), 0);

  const soldQty = soldItems.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0,
  );

  const totalSales = soldItems.reduce(
    (total, item) => total + Number(item.total_sales || 0),
    0,
  );

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
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 6);

  const latestMovements = movements.slice(0, 8);

  const metrics = [
    {
      label: "Inventory Value",
      value: formatCurrency(inventoryValue),
      status: "Live",
      icon: CircleDollarSign,
    },
    {
      label: "Total Sales",
      value: formatCurrency(totalSales),
      status: "Sold Items",
      icon: TrendingUp,
    },
    {
      label: "Stock In",
      value: formatQty(stockInQty),
      status: "Movement",
      icon: ArrowUpCircle,
    },
    {
      label: "Stock Out",
      value: formatQty(stockOutQty),
      status: "Movement",
      icon: ArrowDownCircle,
    },
  ];

  const alertCards = [
    {
      title: "Low Stock",
      value: String(lowStockCount),
      description: "Products at or below minimum stock.",
      icon: AlertTriangle,
    },
    {
      title: "Over Stock",
      value: String(overStockCount),
      description: "Products above maximum stock level.",
      icon: Boxes,
    },
    {
      title: "Expiry Watch",
      value: String(expiryWatchCount),
      description: "Expired or expiring within 14 days.",
      icon: CalendarClock,
    },
    {
      title: "Discrepancies",
      value: String(discrepancyCount),
      description: "Stock counts with missing or over quantity.",
      icon: ShieldCheck,
    },
  ];

  return (
    <DashboardShell
      fullName={profile?.full_name || user.email || "Forza User"}
      avatarUrl={profile?.avatar_url || null}
      role={role}
      modules={modules}
      brands={brands}
      selectedBrand={selectedBrand}
    >
      <section className="glass-panel rounded-[2rem] p-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-slate-400">
              Live Brand Command Center
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              {selectedBrandName} Live Operations View
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Realtime operational summary from inventory, movement ledger,
              recipe consumption, and sold dish activity for the selected brand.
            </p>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white/80 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <Building2 size={24} />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                  Active Brand
                </p>
                <p className="text-2xl font-black text-slate-950">
                  {selectedBrandName}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                  Products
                </p>
                <p className="mt-1 text-lg font-black text-slate-950">
                  {products.length}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                  Sold Qty
                </p>
                <p className="mt-1 text-lg font-black text-slate-950">
                  {formatQty(soldQty)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <div
              key={metric.label}
              className="glass-panel forza-transition forza-hover rounded-[2rem] p-5"
            >
              <div className="mb-5 flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                  <Icon size={22} />
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                  {metric.status}
                </span>
              </div>
              <p className="text-sm font-bold text-slate-400">
                {metric.label}
              </p>
              <p className="mt-2 text-2xl font-black text-slate-950">
                {metric.value}
              </p>
            </div>
          );
        })}
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {alertCards.map((alert) => {
          const Icon = alert.icon;

          return (
            <div
              key={alert.title}
              className="glass-panel rounded-[2rem] p-5"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                  <Icon size={20} />
                </div>
                <p className="text-3xl font-black text-slate-950">
                  {alert.value}
                </p>
              </div>
              <h3 className="font-black text-slate-950">{alert.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {alert.description}
              </p>
            </div>
          );
        })}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="glass-panel rounded-[2rem] p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-slate-400">
                {selectedBrandName} Access
              </p>
              <h2 className="text-2xl font-black text-slate-950">
                Available Modules
              </h2>
            </div>
            <BarChart3 className="text-slate-400" size={28} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {modules.map((module) => (
              <a
                key={`${module.href}-${module.title}`}
                href={`${module.href}?brand=${selectedBrandCode}`}
                className="forza-transition forza-hover rounded-3xl border border-slate-200 bg-white/75 p-5 shadow-sm"
              >
                <h3 className="text-lg font-black text-slate-950">
                  {module.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {module.description}
                </p>
              </a>
            ))}
          </div>
        </div>

        <div className="glass-panel rounded-[2rem] p-6">
          <p className="text-sm font-bold uppercase tracking-wide text-slate-400">
            Consumption Watch
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            Top Consumed Ingredients
          </h2>

          <div className="mt-5 space-y-3">
            {topConsumedIngredients.map((item) => (
              <div
                key={item.sku}
                className="rounded-3xl border border-slate-200 bg-white/75 p-4"
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
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="glass-panel rounded-[2rem] p-6">
          <div className="mb-5">
            <p className="text-sm font-bold uppercase tracking-wide text-slate-400">
              Sold Dish Summary
            </p>
            <h2 className="text-2xl font-black text-slate-950">
              Top Sold Dishes
            </h2>
          </div>

          <div className="space-y-3">
            {topSoldDishes.map((dish) => (
              <div
                key={dish.itemName}
                className="rounded-3xl border border-slate-200 bg-white/75 p-4"
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
                No sold dishes recorded yet.
              </div>
            ) : null}
          </div>
        </section>

        <section className="glass-panel rounded-[2rem] p-6">
          <div className="mb-5">
            <p className="text-sm font-bold uppercase tracking-wide text-slate-400">
              Movement Ledger
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
                  className="rounded-3xl border border-slate-200 bg-white/75 p-4"
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