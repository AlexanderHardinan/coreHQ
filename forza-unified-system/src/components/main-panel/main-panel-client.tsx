// File name: src/components/main-panel/main-panel-client.tsx

"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  Boxes,
  Building2,
  CalendarClock,
  ChefHat,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Download,
  FileSpreadsheet,
  Flame,
  Gauge,
  GlassWater,
  Globe2,
  MapPin,
  MessageSquareText,
  Package,
  Radar,
  RefreshCw,
  Satellite,
  ShieldAlert,
  Target,
  Waves,
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
type AlertActionStatus = "acknowledged" | "investigating" | "resolved";
type AreaFilter = "all" | MainPanelOpsArea;

type MainPanelAlertAction = {
  id: string;
  brand_id: string;
  brand_unit_id: string | null;
  product_id: string | null;
  alert_key: string;
  alert_type: string;
  alert_status: AlertActionStatus;
  alert_note: string | null;
  ops_area: MainPanelOpsArea;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type MainPanelAlertRow = {
  id: string;
  alertKey: string;
  alertType: string;
  brandId: string;
  unitId: string | null;
  productId: string | null;
  productName: string;
  brandName: string;
  unitName: string;
  area: MainPanelOpsArea;
  status: string;
  meta: string;
  priority: AlertPriority;
};

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

function getActionStatusLabel(status: AlertActionStatus | null | undefined) {
  if (status === "acknowledged") {
    return "Acknowledged";
  }

  if (status === "investigating") {
    return "Investigating";
  }

  if (status === "resolved") {
    return "Resolved";
  }

  return "Active";
}

function getActionStatusClasses(status: AlertActionStatus | null | undefined) {
  if (status === "acknowledged") {
    return "border-blue-100 bg-blue-50 text-blue-700";
  }

  if (status === "investigating") {
    return "border-amber-100 bg-amber-50 text-amber-700";
  }

  if (status === "resolved") {
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  }

  return "border-slate-950 bg-slate-950 text-white";
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

function escapeCsvValue(value: string | number | null | undefined) {
  const stringValue = String(value ?? "");
  const escapedValue = stringValue.replaceAll('"', '""');

  return `"${escapedValue}"`;
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getReportDateStamp() {
  const now = new Date();

  return now.toISOString().slice(0, 19).replaceAll(":", "-");
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
  const [alertActions, setAlertActions] = useState<MainPanelAlertAction[]>([]);
  const [noteByAlertKey, setNoteByAlertKey] = useState<Record<string, string>>(
    {},
  );
  const [savingAlertKey, setSavingAlertKey] = useState("");

  const brandIds = useMemo(() => brands.map((brand) => brand.id), [brands]);
  const brandIdsKey = brandIds.join("-");

  async function loadAlertActions() {
    if (brandIds.length === 0) {
      setAlertActions([]);
      return;
    }

    const { data, error } = await supabase
      .from("main_panel_alert_actions")
      .select(
        "id, brand_id, brand_unit_id, product_id, alert_key, alert_type, alert_status, alert_note, ops_area, created_by, created_at, updated_at",
      )
      .in("brand_id", brandIds)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error(error.message);
      return;
    }

    setAlertActions((data || []) as MainPanelAlertAction[]);
  }

  useEffect(() => {
    loadAlertActions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandIdsKey]);

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
      .channel(`main-panel-command-radar-${brandIdsKey}`)
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
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "main_panel_alert_actions",
        },
        () => {
          loadAlertActions();
        },
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandIdsKey, router, supabase]);

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

  const alertActionMap = useMemo(() => {
    const map = new Map<string, MainPanelAlertAction>();

    alertActions.forEach((action) => {
      map.set(`${action.brand_id}:${action.alert_key}`, action);
    });

    return map;
  }, [alertActions]);

  const alertRows = useMemo(() => {
    const rows: MainPanelAlertRow[] = [];

    filteredProducts.forEach((product) => {
      const brand = brands.find((item) => item.id === product.brand_id);
      const unit = units.find((item) => item.id === product.brand_unit_id);
      const stockQty = getProductStock(product, balanceMap);
      const stockStatus = getStockStatus(product, balanceMap);
      const expiryStatus = getExpiryStatus(product.expiry_date);
      const brandId = product.brand_id || "";
      const unitId = product.brand_unit_id || null;

      if (stockQty < 0) {
        rows.push({
          id: `negative-${product.id}`,
          alertKey: `negative-${product.id}`,
          alertType: "negative_stock",
          brandId,
          unitId,
          productId: product.id,
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
          alertKey: `expired-${product.id}`,
          alertType: "expired",
          brandId,
          unitId,
          productId: product.id,
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
          alertKey: `low-${product.id}`,
          alertType: "low_stock",
          brandId,
          unitId,
          productId: product.id,
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
          alertKey: `over-${product.id}`,
          alertType: "overstock",
          brandId,
          unitId,
          productId: product.id,
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
          alertKey: `expiring-${product.id}`,
          alertType: "expiring_soon",
          brandId,
          unitId,
          productId: product.id,
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
          alertKey: `discrepancy-${movement.id}`,
          alertType: "discrepancy",
          brandId: movement.brand_id || "",
          unitId: movement.brand_unit_id || null,
          productId: movement.product_id || null,
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

  const acknowledgedCount = alertRows.filter((alert) => {
    const action = alertActionMap.get(`${alert.brandId}:${alert.alertKey}`);

    return action?.alert_status === "acknowledged";
  }).length;

  const investigatingCount = alertRows.filter((alert) => {
    const action = alertActionMap.get(`${alert.brandId}:${alert.alertKey}`);

    return action?.alert_status === "investigating";
  }).length;

  const resolvedCount = alertRows.filter((alert) => {
    const action = alertActionMap.get(`${alert.brandId}:${alert.alertKey}`);

    return action?.alert_status === "resolved";
  }).length;

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

  async function saveAlertAction(
    alert: MainPanelAlertRow,
    status: AlertActionStatus,
  ) {
    if (!alert.brandId || savingAlertKey) {
      return;
    }

    setSavingAlertKey(alert.id);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setSavingAlertKey("");
      return;
    }

    const note = String(noteByAlertKey[alert.id] || "").trim();

    const payload = {
      brand_id: alert.brandId,
      brand_unit_id: alert.unitId,
      product_id: alert.productId,
      alert_key: alert.alertKey,
      alert_type: alert.alertType,
      alert_status: status,
      alert_note: note || null,
      ops_area: alert.area,
      created_by: user.id,
    };

    const { data, error } = await supabase
      .from("main_panel_alert_actions")
      .upsert(payload, {
        onConflict: "brand_id,alert_key",
      })
      .select(
        "id, brand_id, brand_unit_id, product_id, alert_key, alert_type, alert_status, alert_note, ops_area, created_by, created_at, updated_at",
      )
      .single();

    setSavingAlertKey("");

    if (error) {
      console.error(error.message);
      return;
    }

    if (data) {
      setAlertActions((current) => {
        const next = current.filter(
          (action) =>
            !(
              action.brand_id === data.brand_id &&
              action.alert_key === data.alert_key
            ),
        );

        return [data as MainPanelAlertAction, ...next];
      });
    }
  }

  function getExportRows() {
    return alertRows.map((alert) => {
      const action = alertActionMap.get(`${alert.brandId}:${alert.alertKey}`);
      const actionStatus = getActionStatusLabel(action?.alert_status);
      const actionNote = action?.alert_note || "";
      const actionUpdatedAt = action?.updated_at || "";

      return {
        productIssue: alert.productName,
        outlet: `${alert.brandName} · ${alert.unitName}`,
        area: areaLabels[alert.area],
        alertStatus: alert.status,
        meta: alert.meta,
        priority: alert.priority,
        actionStatus,
        actionNote,
        actionUpdatedAt,
      };
    });
  }

  function downloadAlertCsv() {
    const exportRows = getExportRows();

    const headers = [
      "Product / Issue",
      "Outlet",
      "Area",
      "Alert Status",
      "Meta",
      "Priority",
      "Action Status",
      "Action Note",
      "Action Updated At",
    ];

    const csvRows = [
      headers.map(escapeCsvValue).join(","),
      ...exportRows.map((row) =>
        [
          row.productIssue,
          row.outlet,
          row.area,
          row.alertStatus,
          row.meta,
          row.priority,
          row.actionStatus,
          row.actionNote,
          row.actionUpdatedAt,
        ]
          .map(escapeCsvValue)
          .join(","),
      ),
    ];

    const blob = new Blob([csvRows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `main-panel-alert-report-${areaFilter}-${getReportDateStamp()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function downloadAlertPdf() {
    const exportRows = getExportRows();

    if (exportRows.length === 0) {
      window.alert("No alert rows available for the current filter.");
      return;
    }

    const generatedAt = new Date().toLocaleString();
    const areaLabel = areaFilter === "all" ? "All Areas" : areaLabels[areaFilter];

    const rowsHtml = exportRows
      .map(
        (row) => `
          <tr>
            <td>${escapeHtml(row.productIssue)}</td>
            <td>${escapeHtml(row.outlet)}</td>
            <td>${escapeHtml(row.area)}</td>
            <td>${escapeHtml(row.alertStatus)}</td>
            <td>${escapeHtml(row.meta)}</td>
            <td>${escapeHtml(row.priority)}</td>
            <td>${escapeHtml(row.actionStatus)}</td>
            <td>${escapeHtml(row.actionNote || "-")}</td>
          </tr>
        `,
      )
      .join("");

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Main Panel Executive Alert Report</title>
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
              font-size: 30px;
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
              <div class="headerTop">
                <div>
                  <div class="brand">Forza Unified System</div>
                  <h1>Main Panel Executive Alert Report</h1>
                </div>
                <div class="badge">${escapeHtml(areaLabel)}</div>
              </div>
            </section>

            <section class="content">
              <div class="grid">
                <div class="card"><div class="label">Area Filter</div><div class="value">${escapeHtml(areaLabel)}</div></div>
                <div class="card"><div class="label">Total Alerts</div><div class="value">${exportRows.length}</div></div>
                <div class="card"><div class="label">Critical</div><div class="value">${criticalAlerts}</div></div>
                <div class="card"><div class="label">Warning</div><div class="value">${warningAlerts}</div></div>
                <div class="card"><div class="label">Acknowledged</div><div class="value">${acknowledgedCount}</div></div>
                <div class="card"><div class="label">Investigating</div><div class="value">${investigatingCount}</div></div>
                <div class="card"><div class="label">Resolved</div><div class="value">${resolvedCount}</div></div>
                <div class="card"><div class="label">Generated</div><div class="value">${escapeHtml(generatedAt)}</div></div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Product / Issue</th>
                    <th>Outlet</th>
                    <th>Area</th>
                    <th>Alert Status</th>
                    <th>Meta</th>
                    <th>Priority</th>
                    <th>Action Status</th>
                    <th>Action Note</th>
                  </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
              </table>

              <div class="footer">
                <div>Main Panel Radar Export</div>
                <div>Developer Rights Chef Alex @FORZA 2026</div>
              </div>
            </section>
          </main>
          <script>window.onload = function () { window.print(); };</script>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=1200,height=900");

    if (!printWindow) {
      window.alert("Allow popups to export the Main Panel PDF report.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

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
              discrepancies, waste, shrinkage, inventory value, and alert
              resolution tracking.
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
              <MiniSignal label="Investigating" value={investigatingCount} />
              <MiniSignal label="Resolved" value={resolvedCount} />
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

      <section className="grid gap-4 md:grid-cols-3">
        <ActionMetricCard
          label="Acknowledged"
          value={acknowledgedCount}
          description="Alerts seen by the operations team"
          icon={<MessageSquareText size={22} />}
          className="border-blue-100 bg-blue-50/90 text-blue-700"
        />
        <ActionMetricCard
          label="Investigating"
          value={investigatingCount}
          description="Alerts currently being checked"
          icon={<Clock3 size={22} />}
          className="border-amber-100 bg-amber-50/90 text-amber-700"
        />
        <ActionMetricCard
          label="Resolved"
          value={resolvedCount}
          description="Alerts marked operationally resolved"
          icon={<CheckCircle2 size={22} />}
          className="border-emerald-100 bg-emerald-50/90 text-emerald-700"
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

          <div className="flex flex-wrap gap-2">
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-xs font-black uppercase tracking-wide text-white shadow-xl">
              <RefreshCw size={15} />
              Auto Refresh + Action Sync
            </div>

            <button
              type="button"
              onClick={downloadAlertPdf}
              className="forza-button-hover inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-700 shadow-sm"
            >
              <Download size={15} />
              PDF
            </button>

            <button
              type="button"
              onClick={downloadAlertCsv}
              className="forza-button-hover inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-700 shadow-sm"
            >
              <FileSpreadsheet size={15} />
              CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1280px] border-separate border-spacing-y-3">
            <thead>
              <tr className="text-left text-xs font-black uppercase tracking-wide text-slate-400">
                <th className="px-4">Product / Issue</th>
                <th className="px-4">Outlet</th>
                <th className="px-4">Area</th>
                <th className="px-4">Status</th>
                <th className="px-4">Meta</th>
                <th className="px-4">Priority</th>
                <th className="px-4">Action Status</th>
                <th className="px-4">Operational Action</th>
              </tr>
            </thead>

            <tbody>
              {alertRows.slice(0, 18).map((alert) => {
                const classes = getPriorityClasses(alert.priority);
                const action = alertActionMap.get(
                  `${alert.brandId}:${alert.alertKey}`,
                );
                const actionStatus = action?.alert_status;
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
                    <td className="px-4 py-4">
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
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black uppercase ${getActionStatusClasses(
                          actionStatus,
                        )}`}
                      >
                        {actionStatus === "resolved" ? (
                          <CheckCircle2 size={14} />
                        ) : actionStatus === "investigating" ? (
                          <Clock3 size={14} />
                        ) : actionStatus === "acknowledged" ? (
                          <MessageSquareText size={14} />
                        ) : (
                          <Bell size={14} />
                        )}
                        {getActionStatusLabel(actionStatus)}
                      </span>

                      {action?.alert_note ? (
                        <p className="mt-2 max-w-[220px] text-xs font-bold leading-5 text-slate-500">
                          {action.alert_note}
                        </p>
                      ) : null}
                    </td>
                    <td className="rounded-r-2xl px-4 py-4">
                      <div className="flex min-w-[280px] flex-col gap-2">
                        <input
                          value={
                            noteByAlertKey[alert.id] || action?.alert_note || ""
                          }
                          onChange={(event) =>
                            setNoteByAlertKey((current) => ({
                              ...current,
                              [alert.id]: event.target.value,
                            }))
                          }
                          className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 outline-none transition focus:border-slate-950 focus:bg-white"
                          placeholder="Optional action note"
                        />

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={savingAlertKey === alert.id}
                            onClick={() =>
                              saveAlertAction(alert, "acknowledged")
                            }
                            className="forza-button-hover rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Acknowledge
                          </button>
                          <button
                            type="button"
                            disabled={savingAlertKey === alert.id}
                            onClick={() =>
                              saveAlertAction(alert, "investigating")
                            }
                            className="forza-button-hover rounded-full border border-amber-100 bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Investigating
                          </button>
                          <button
                            type="button"
                            disabled={savingAlertKey === alert.id}
                            onClick={() => saveAlertAction(alert, "resolved")}
                            className="forza-button-hover rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Resolve
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {alertRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
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
  icon: ReactNode;
};

function MetricCard({ label, value, sub, priority, icon }: MetricCardProps) {
  const classes = getPriorityClasses(priority);

  return (
    <div
      className={`relative overflow-hidden rounded-[2rem] border p-5 shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-xl ${classes.panel}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.9),transparent_35%)]" />

      {priority !== "stable" ? (
        <div
          className={`absolute right-5 top-5 h-4 w-4 rounded-full ${classes.dot}`}
        >
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

type ActionMetricCardProps = {
  label: string;
  value: number;
  description: string;
  icon: ReactNode;
  className: string;
};

function ActionMetricCard({
  label,
  value,
  description,
  icon,
  className,
}: ActionMetricCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-[2rem] border p-5 shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-xl ${className}`}
    >
      <div className="relative z-10 mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 shadow-xl">
        {icon}
      </div>
      <p className="relative z-10 text-sm font-bold opacity-80">{label}</p>
      <p className="relative z-10 mt-2 text-3xl font-black">{value}</p>
      <p className="relative z-10 mt-1 text-xs font-black uppercase tracking-wide opacity-70">
        {description}
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