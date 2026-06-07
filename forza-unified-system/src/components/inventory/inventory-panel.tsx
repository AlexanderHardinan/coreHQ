"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Apple,
  ArrowDownCircle,
  ArrowUpCircle,
  Beef,
  Beer,
  Boxes,
  CalendarClock,
  Carrot,
  CheckCircle2,
  ClipboardList,
  Coffee,
  CupSoda,
  Download,
  Droplets,
  Fish,
  GlassWater,
  Milk,
  Package,
  Pencil,
  Plus,
  Save,
  Search,
  Tags,
  Trash2,
  Wheat,
  Wine,
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
  product_category: ProductCategoryValue | null;
  product_group: ProductGroupValue | null;
  ops_area: OpsArea;
  product_name: string;
  sku: string;
  unit: string;
  supplier_name: string | null;
  opening_stock: number;
  current_stock: number;
  minimum_stock: number;
  maximum_stock: number;
  packaging_amount: number;
  packaging_cost: number;
  unit_cost: number;
  expiry_date: string | null;
  storage_area: string | null;
  is_active: boolean;
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

export type InventoryMovement = {
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
  balance_direction: number | null;
  system_balance_after: number | null;
  physical_count_qty: number | null;
  discrepancy_qty: number | null;
  alert_status: string | null;
  created_at: string | null;
};

type InventoryPanelProps = {
  role: UserRole;
  selectedBrand: InventoryBrand | null;
  units: InventoryUnit[];
  categories: InventoryCategory[];
  products: InventoryProduct[];
  initialUnitId: string;
  initialOpsArea: OpsArea;
};

type EditMode = "create" | "edit";
type ReportScope = "all" | "product" | "category" | "date";
type ProductCategoryValue = "Food" | "Beverage" | "Others";
type ProductGroupValue =
  | "Seafood"
  | "Meat"
  | "Dairy"
  | "Dry Goods"
  | "Vegetables"
  | "Fruits"
  | "Beer"
  | "Wine"
  | "Softdrink"
  | "Water"
  | "Dry Good"
  | "Fruit"
  | "Vegetable"
  | "Cleaning"
  | "Utilities"
  | "Maintenance"
  | "Packaging"
  | "Office Supplies"
  | "Others";

const opsAreaLabels: Record<OpsArea, string> = {
  kitchen: "Kitchen",
  bar: "Bar",
  global: "Global",
};

const unitOptions = ["gram", "ml", "pc", "bottle"];

const productCategoryOptions: {
  value: ProductCategoryValue;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "Food",
    label: "Food",
    icon: <ClipboardList size={17} />,
  },
  {
    value: "Beverage",
    label: "Beverage",
    icon: <GlassWater size={17} />,
  },
  {
    value: "Others",
    label: "Others",
    icon: <Tags size={17} />,
  },
];

const productGroupOptions: Record<
  ProductCategoryValue,
  {
    value: ProductGroupValue;
    label: string;
    icon: React.ReactNode;
  }[]
> = {
  Food: [
    { value: "Seafood", label: "Seafood", icon: <Fish size={17} /> },
    { value: "Meat", label: "Meat", icon: <Beef size={17} /> },
    { value: "Dairy", label: "Dairy", icon: <Milk size={17} /> },
    { value: "Dry Goods", label: "Dry Goods", icon: <Wheat size={17} /> },
    { value: "Vegetables", label: "Vegetables", icon: <Carrot size={17} /> },
    { value: "Fruits", label: "Fruits", icon: <Apple size={17} /> },
  ],
  Beverage: [
    { value: "Beer", label: "Beer", icon: <Beer size={17} /> },
    { value: "Wine", label: "Wine", icon: <Wine size={17} /> },
    { value: "Softdrink", label: "Softdrink", icon: <CupSoda size={17} /> },
    { value: "Water", label: "Water", icon: <Droplets size={17} /> },
    { value: "Dry Good", label: "Dry Good", icon: <Coffee size={17} /> },
    { value: "Fruit", label: "Fruit", icon: <Apple size={17} /> },
    { value: "Vegetable", label: "Vegetable", icon: <Carrot size={17} /> },
  ],
  Others: [
    { value: "Cleaning", label: "Cleaning", icon: <Package size={17} /> },
    { value: "Utilities", label: "Utilities", icon: <Droplets size={17} /> },
    {
      value: "Maintenance",
      label: "Maintenance",
      icon: <ClipboardList size={17} />,
    },
    { value: "Packaging", label: "Packaging", icon: <Package size={17} /> },
    {
      value: "Office Supplies",
      label: "Office Supplies",
      icon: <Tags size={17} />,
    },
    { value: "Others", label: "Others", icon: <Package size={17} /> },
  ],
};

const productCategoryOptionsByArea: Record<OpsArea, ProductCategoryValue[]> = {
  kitchen: ["Food"],
  bar: ["Beverage"],
  global: ["Others"],
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

function toCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function formatQty(value: number) {
  const safeValue = Number(value || 0);

  if (Number.isInteger(safeValue)) {
    return String(safeValue);
  }

  return String(Number(safeValue.toFixed(3)));
}

function formatCost(value: number) {
  return String(Number(Number(value || 0).toFixed(6)));
}

function calculateUnitCost(packagingAmount: string | number, packagingCost: string | number) {
  const amount = Number(packagingAmount || 0);
  const cost = Number(packagingCost || 0);

  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  if (!Number.isFinite(cost) || cost < 0) {
    return 0;
  }

  return cost / amount;
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

function getStockStatus(product: InventoryProduct, calculatedStock?: number) {
  const stockQuantity =
    typeof calculatedStock === "number"
      ? calculatedStock
      : Number(product.current_stock || 0);

  if (product.maximum_stock > 0 && stockQuantity > product.maximum_stock) {
    return {
      label: "Over Stocked",
      className: "bg-amber-50 text-amber-700",
    };
  }

  if (stockQuantity <= product.minimum_stock) {
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

function getAllowedOpsAreas(role: UserRole): OpsArea[] {
  if (role === "boh_staff") {
    return ["kitchen"];
  }

  if (role === "foh_staff") {
    return ["bar"];
  }

  return ["kitchen", "bar", "global"];
}

function normalizeOpsArea(area: OpsArea, allowedOpsAreas: OpsArea[]) {
  if (allowedOpsAreas.includes(area)) {
    return area;
  }

  return allowedOpsAreas[0] || "global";
}

function getMovementLabel(type: InventoryMovementType) {
  return movementTypes.find((item) => item.value === type)?.label || type;
}

function getMovementDirection(type: InventoryMovementType) {
  return movementTypes.find((item) => item.value === type)?.direction || "count";
}

function getMovementBalanceEffect(movement: InventoryMovement) {
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

function sortMovementsOldestFirst(movements: InventoryMovement[]) {
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

function isDuplicateInventoryError(message: string) {
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes("duplicate product") ||
    normalizedMessage.includes("duplicate key") ||
    normalizedMessage.includes("products_prevent_duplicate_active_products") ||
    normalizedMessage.includes("products_unique_active_name_per_unit_area")
  );
}

function isDuplicateSkuError(message: string) {
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes("duplicate sku") ||
    normalizedMessage.includes("products_unique_active_sku_per_unit_area")
  );
}

function getCategoryOptionsForOpsArea(area: OpsArea) {
  const allowedCategories = productCategoryOptionsByArea[area] || ["Food"];

  return productCategoryOptions.filter((category) =>
    allowedCategories.includes(category.value),
  );
}

function getDefaultCategoryForOpsArea(area: OpsArea): ProductCategoryValue {
  return productCategoryOptionsByArea[area]?.[0] || "Food";
}

function getDefaultGroupForCategory(category: ProductCategoryValue) {
  return productGroupOptions[category]?.[0]?.value || "Others";
}

function getCategoryIcon(category: ProductCategoryValue) {
  return (
    productCategoryOptions.find((item) => item.value === category)?.icon || (
      <Tags size={17} />
    )
  );
}

function getGroupIcon(group: ProductGroupValue) {
  const allGroups = Object.values(productGroupOptions).flat();

  return allGroups.find((item) => item.value === group)?.icon || (
    <Package size={17} />
  );
}

function normalizeProductCategoryForArea(
  area: OpsArea,
  value: string | null | undefined,
): ProductCategoryValue {
  const allowedCategories = productCategoryOptionsByArea[area] || ["Food"];

  if (value === "Food" || value === "Beverage" || value === "Others") {
    if (allowedCategories.includes(value)) {
      return value;
    }
  }

  return getDefaultCategoryForOpsArea(area);
}

function normalizeProductGroup(
  category: ProductCategoryValue,
  value: string | null | undefined,
): ProductGroupValue {
  const options = productGroupOptions[category];
  const match = options.find((item) => item.value === value);

  return match?.value || options[0].value;
}

export function InventoryPanel({
  role,
  selectedBrand,
  units,
  products,
  initialUnitId,
  initialOpsArea,
}: InventoryPanelProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const allowedOpsAreas = useMemo(() => getAllowedOpsAreas(role), [role]);
  const safeInitialOpsArea = normalizeOpsArea(initialOpsArea, allowedOpsAreas);
  const safeInitialUnitId =
    units.find((unit) => unit.id === initialUnitId)?.id || units[0]?.id || "";
  const safeInitialCategory = getDefaultCategoryForOpsArea(safeInitialOpsArea);
  const safeInitialGroup = getDefaultGroupForCategory(safeInitialCategory);

  const [productList, setProductList] = useState(products);
  const [movementList, setMovementList] = useState<InventoryMovement[]>([]);
  const [mode, setMode] = useState<EditMode>("create");
  const [editId, setEditId] = useState("");

  const [selectedUnitId, setSelectedUnitId] = useState(safeInitialUnitId);
  const [selectedOpsArea, setSelectedOpsArea] =
    useState<OpsArea>(safeInitialOpsArea);
  const [search, setSearch] = useState("");

  const [productName, setProductName] = useState("");
  const [productCategory, setProductCategory] =
    useState<ProductCategoryValue>(safeInitialCategory);
  const [productGroup, setProductGroup] =
    useState<ProductGroupValue>(safeInitialGroup);
  const [sku, setSku] = useState("");
  const [unit, setUnit] = useState("gram");
  const [supplierName, setSupplierName] = useState("");
  const [openingStock, setOpeningStock] = useState("0");
  const [minimumStock, setMinimumStock] = useState("0");
  const [maximumStock, setMaximumStock] = useState("0");
  const [packagingAmount, setPackagingAmount] = useState("0");
  const [packagingCost, setPackagingCost] = useState("0");
  const [expiryDate, setExpiryDate] = useState("");
  const [storageArea, setStorageArea] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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

  const [reportScope, setReportScope] = useState<ReportScope>("all");
  const [reportProductId, setReportProductId] = useState("");
  const [reportCategory, setReportCategory] =
    useState<ProductCategoryValue>(safeInitialCategory);
  const [reportGroup, setReportGroup] =
    useState<ProductGroupValue>(safeInitialGroup);
  const [reportDateFrom, setReportDateFrom] = useState("");
  const [reportDateTo, setReportDateTo] = useState("");

  const computedUnitCost = useMemo(
    () => calculateUnitCost(packagingAmount, packagingCost),
    [packagingAmount, packagingCost],
  );

  useEffect(() => {
    setProductList(products);
  }, [products]);

  useEffect(() => {
    const nextUnitId =
      units.find((unitItem) => unitItem.id === initialUnitId)?.id ||
      units[0]?.id ||
      "";

    setSelectedUnitId(nextUnitId);
  }, [initialUnitId, units]);

  useEffect(() => {
    const nextOpsArea = normalizeOpsArea(initialOpsArea, allowedOpsAreas);
    const nextCategory = getDefaultCategoryForOpsArea(nextOpsArea);
    const nextGroup = getDefaultGroupForCategory(nextCategory);

    setSelectedOpsArea(nextOpsArea);
    setProductCategory(nextCategory);
    setProductGroup(nextGroup);
    setReportCategory(nextCategory);
    setReportGroup(nextGroup);
  }, [initialOpsArea, allowedOpsAreas]);

  const selectedUnit = useMemo(
    () => units.find((item) => item.id === selectedUnitId) || null,
    [selectedUnitId, units],
  );

  const currentCategoryOptions = useMemo(
    () => getCategoryOptionsForOpsArea(selectedOpsArea),
    [selectedOpsArea],
  );

  const currentGroupOptions = useMemo(
    () => productGroupOptions[productCategory],
    [productCategory],
  );

  const reportCategoryOptions = useMemo(
    () => getCategoryOptionsForOpsArea(selectedOpsArea),
    [selectedOpsArea],
  );

  const reportGroupOptions = useMemo(
    () => productGroupOptions[reportCategory],
    [reportCategory],
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
        String(product.supplier_name || "").toLowerCase().includes(query) ||
        String(product.product_category || "").toLowerCase().includes(query) ||
        String(product.product_group || "").toLowerCase().includes(query);

      return matchesUnit && matchesArea && allowedArea && matchesSearch;
    });
  }, [allowedOpsAreas, productList, search, selectedOpsArea, selectedUnitId]);

  const selectedMovementProduct = useMemo(
    () => productList.find((product) => product.id === movementProductId) || null,
    [movementProductId, productList],
  );

  const visibleMovements = useMemo(() => {
    const visibleProductIds = visibleProducts.map((product) => product.id);

    return movementList.filter((movement) =>
      visibleProductIds.includes(movement.product_id),
    );
  }, [movementList, visibleProducts]);

  const calculatedMovementBalanceMap = useMemo(() => {
    const map = new Map<string, number>();
    const movementsByProduct = new Map<string, InventoryMovement[]>();

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

  const calculatedProductBalanceMap = useMemo(() => {
    const map = new Map<string, number>();
    const movementsByProduct = new Map<string, InventoryMovement[]>();

    movementList.forEach((movement) => {
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
  }, [movementList]);

  function getCalculatedProductBalance(product: InventoryProduct) {
    return calculatedProductBalanceMap.get(product.id) ?? 0;
  }

  function getGeneratedSkuBase(
    nextProductName: string,
    nextUnitId: string,
    nextOpsArea: OpsArea,
  ) {
    const brandCode = toCode(selectedBrand?.code || "BRAND");
    const unitCode =
      toCode(units.find((item) => item.id === nextUnitId)?.code || "UNIT") ||
      "UNIT";
    const areaCode = toCode(nextOpsArea);
    const productCode = toCode(nextProductName) || "PRODUCT";

    return `${brandCode}-${unitCode}-${areaCode}-${productCode}`;
  }

  function getNextGeneratedSku(
    nextProductName: string,
    nextUnitId: string = selectedUnitId,
    nextOpsArea: OpsArea = selectedOpsArea,
    excludedProductId: string = editId,
  ) {
    const baseSku = getGeneratedSkuBase(nextProductName, nextUnitId, nextOpsArea);

    const existingSkuSet = new Set(
      productList
        .filter(
          (product) =>
            product.id !== excludedProductId &&
            product.brand_id === selectedBrand?.id &&
            product.brand_unit_id === nextUnitId &&
            product.ops_area === nextOpsArea,
        )
        .map((product) => product.sku.toUpperCase()),
    );

    for (let index = 1; index <= 99999; index += 1) {
      const candidate = `${baseSku}-${String(index).padStart(5, "0")}`;

      if (!existingSkuSet.has(candidate)) {
        return candidate;
      }
    }

    return `${baseSku}-${Date.now()}`;
  }

  useEffect(() => {
    if (mode !== "create") {
      return;
    }

    if (!productName.trim()) {
      setSku("");
      return;
    }

    setSku(getNextGeneratedSku(productName, selectedUnitId, selectedOpsArea, ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, productName, selectedBrand?.id, selectedOpsArea, selectedUnitId, productList]);

  useEffect(() => {
    if (selectedMovementProduct) {
      setMovementUnitCost(String(selectedMovementProduct.unit_cost || 0));
    }
  }, [selectedMovementProduct]);

  const reportProducts = useMemo(() => {
    if (reportScope === "product") {
      return visibleProducts.filter((product) => product.id === reportProductId);
    }

    if (reportScope === "category") {
      return visibleProducts.filter((product) => {
        const normalizedCategory = normalizeProductCategoryForArea(
          product.ops_area,
          product.product_category,
        );

        return (
          normalizedCategory === reportCategory &&
          normalizeProductGroup(normalizedCategory, product.product_group) ===
            reportGroup
        );
      });
    }

    if (reportScope === "date") {
      const productIdsFromDate = visibleMovements
        .filter((movement) => {
          const fromMatch =
            !reportDateFrom || movement.movement_date >= reportDateFrom;
          const toMatch = !reportDateTo || movement.movement_date <= reportDateTo;

          return fromMatch && toMatch;
        })
        .map((movement) => movement.product_id);

      return visibleProducts.filter((product) =>
        productIdsFromDate.includes(product.id),
      );
    }

    return visibleProducts;
  }, [
    reportCategory,
    reportDateFrom,
    reportDateTo,
    reportGroup,
    reportProductId,
    reportScope,
    visibleMovements,
    visibleProducts,
  ]);

  const reportMovements = useMemo(() => {
    const reportProductIds = reportProducts.map((product) => product.id);

    return visibleMovements.filter((movement) => {
      const productMatch = reportProductIds.includes(movement.product_id);

      if (reportScope !== "date") {
        return productMatch;
      }

      const fromMatch = !reportDateFrom || movement.movement_date >= reportDateFrom;
      const toMatch = !reportDateTo || movement.movement_date <= reportDateTo;

      return productMatch && fromMatch && toMatch;
    });
  }, [reportDateFrom, reportDateTo, reportProducts, reportScope, visibleMovements]);

  const latestDiscrepancy = useMemo(() => {
    const latestCount = [...visibleMovements].find(
      (movement) => movement.movement_type === "stock_count",
    );

    return latestCount?.discrepancy_qty ?? null;
  }, [visibleMovements]);

  const inventoryStats = useMemo(() => {
    const lowStock = visibleProducts.filter((product) => {
      const calculatedStock = calculatedProductBalanceMap.get(product.id) ?? 0;

      return getStockStatus(product, calculatedStock).label === "Low Stock";
    }).length;

    const overStocked = visibleProducts.filter((product) => {
      const calculatedStock = calculatedProductBalanceMap.get(product.id) ?? 0;

      return getStockStatus(product, calculatedStock).label === "Over Stocked";
    }).length;

    const expiring = visibleProducts.filter((product) =>
      ["Expired", "Expiring Soon"].includes(
        getExpiryStatus(product.expiry_date).label,
      ),
    ).length;

    const value = visibleProducts.reduce((total, product) => {
      const calculatedStock = calculatedProductBalanceMap.get(product.id) ?? 0;

      return total + calculatedStock * product.unit_cost;
    }, 0);

    return {
      totalProducts: visibleProducts.length,
      lowStock,
      overStocked,
      expiring,
      value,
    };
  }, [calculatedProductBalanceMap, visibleProducts]);

  async function refreshMovements(sourceProducts = productList) {
    const productIds = sourceProducts.map((product) => product.id);

    if (productIds.length === 0) {
      setMovementList([]);
      return;
    }

    const { data, error } = await supabase
      .from("inventory_movements")
      .select(
        "id, brand_id, brand_unit_id, product_id, ops_area, movement_type, quantity, unit_cost, reference_code, notes, movement_date, balance_direction, system_balance_after, physical_count_qty, discrepancy_qty, alert_status, created_at",
      )
      .in("product_id", productIds)
      .order("movement_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      toast.error(error.message);
      return;
    }

    setMovementList((data || []) as InventoryMovement[]);
  }

  async function refreshInventoryData() {
    if (!selectedBrand?.id) {
      return;
    }

    const { data, error } = await supabase
      .from("products")
      .select(
        "id, brand_id, brand_unit_id, category_id, product_category, product_group, ops_area, product_name, sku, unit, supplier_name, opening_stock, current_stock, minimum_stock, maximum_stock, packaging_amount, packaging_cost, unit_cost, expiry_date, storage_area, is_active",
      )
      .eq("brand_id", selectedBrand.id)
      .eq("is_active", true)
      .order("product_name", { ascending: true });

    if (error) {
      toast.error(error.message);
      return;
    }

    const nextProducts = (data || []) as InventoryProduct[];

    setProductList(nextProducts);
    await refreshMovements(nextProducts);
  }

  useEffect(() => {
    refreshMovements(products);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

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

  useEffect(() => {
    if (!selectedBrand?.id) {
      return;
    }

    const channel = supabase
      .channel(`inventory-ledger-${selectedBrand.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
        },
        () => {
          refreshInventoryData();
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
          refreshInventoryData();
        },
      )
      .subscribe();

    const fallbackRefresh = window.setInterval(() => {
      refreshInventoryData();
    }, 5000);

    return () => {
      window.clearInterval(fallbackRefresh);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBrand?.id]);

  function updateInventoryUrl(nextUnitId: string, nextOpsArea: OpsArea) {
    const params = new URLSearchParams(searchParams.toString());

    if (selectedBrand?.code) {
      params.set("brand", selectedBrand.code);
    }

    if (nextUnitId) {
      params.set("unit", nextUnitId);
    }

    params.set("area", nextOpsArea);

    router.replace(`${pathname}?${params.toString()}`, {
      scroll: false,
    });
  }

  function handleUnitChange(nextUnitId: string) {
    setSelectedUnitId(nextUnitId);
    resetForm(selectedOpsArea);
    updateInventoryUrl(nextUnitId, selectedOpsArea);
  }

  function handleOpsAreaChange(nextOpsArea: OpsArea) {
    const safeArea = normalizeOpsArea(nextOpsArea, allowedOpsAreas);
    const nextCategory = getDefaultCategoryForOpsArea(safeArea);
    const nextGroup = getDefaultGroupForCategory(nextCategory);

    setSelectedOpsArea(safeArea);
    setProductCategory(nextCategory);
    setProductGroup(nextGroup);
    setReportCategory(nextCategory);
    setReportGroup(nextGroup);
    resetForm(safeArea);
    updateInventoryUrl(selectedUnitId, safeArea);
  }

  function handleProductCategoryChange(nextCategory: ProductCategoryValue) {
    const firstGroup = getDefaultGroupForCategory(nextCategory);

    setProductCategory(nextCategory);
    setProductGroup(firstGroup);
  }

  function handleReportCategoryChange(nextCategory: ProductCategoryValue) {
    const firstGroup = getDefaultGroupForCategory(nextCategory);

    setReportCategory(nextCategory);
    setReportGroup(firstGroup);
  }

  function resetForm(area: OpsArea = selectedOpsArea) {
    const nextCategory = getDefaultCategoryForOpsArea(area);
    const nextGroup = getDefaultGroupForCategory(nextCategory);

    setMode("create");
    setEditId("");
    setProductName("");
    setProductCategory(nextCategory);
    setProductGroup(nextGroup);
    setSku("");
    setUnit("gram");
    setSupplierName("");
    setOpeningStock("0");
    setMinimumStock("0");
    setMaximumStock("0");
    setPackagingAmount("0");
    setPackagingCost("0");
    setExpiryDate("");
    setStorageArea("");
  }

  function resetMovementForm() {
    setMovementType("product_in");
    setMovementQty("0");
    setPhysicalCountQty("0");
    setMovementUnitCost(String(selectedMovementProduct?.unit_cost || 0));
    setMovementReference("");
    setMovementNotes("");
    setMovementDate(todayDate());
  }

  function generateSku() {
    if (!productName.trim()) {
      toast.error("Enter a product name first. SKU is generated from the product.");
      return;
    }

    setSku(getNextGeneratedSku(productName, selectedUnitId, selectedOpsArea, editId));
  }

  function editProduct(product: InventoryProduct) {
    const nextOpsArea = normalizeOpsArea(product.ops_area, allowedOpsAreas);
    const nextCategory = normalizeProductCategoryForArea(
      nextOpsArea,
      product.product_category,
    );
    const nextGroup = normalizeProductGroup(nextCategory, product.product_group);

    setMode("edit");
    setEditId(product.id);
    setSelectedUnitId(product.brand_unit_id);
    setSelectedOpsArea(nextOpsArea);
    setProductName(product.product_name);
    setProductCategory(nextCategory);
    setProductGroup(nextGroup);
    setSku(product.sku);
    setUnit(product.unit);
    setSupplierName(product.supplier_name || "");
    setOpeningStock(String(product.opening_stock || 0));
    setMinimumStock(String(product.minimum_stock || 0));
    setMaximumStock(String(product.maximum_stock || 0));
    setPackagingAmount(String(product.packaging_amount || 0));
    setPackagingCost(String(product.packaging_cost || 0));
    setExpiryDate(product.expiry_date || "");
    setStorageArea(product.storage_area || "");
    updateInventoryUrl(product.brand_unit_id, nextOpsArea);
  }

  function getCategoryDisplay(product: InventoryProduct) {
    const category = normalizeProductCategoryForArea(
      product.ops_area,
      product.product_category,
    );
    const group = normalizeProductGroup(category, product.product_group);

    return {
      category,
      group,
    };
  }

  function getCalculatedMovementBalance(movement: InventoryMovement) {
    return calculatedMovementBalanceMap.get(movement.id) ?? null;
  }

  function downloadInventoryPdf() {
    if (reportProducts.length === 0 && reportMovements.length === 0) {
      toast.error("No inventory data available for this PDF filter.");
      return;
    }

    const selectedReportProduct = productList.find(
      (product) => product.id === reportProductId,
    );

    const reportTitle =
      reportScope === "product"
        ? `Product Report — ${
            selectedReportProduct?.product_name || "Selected Product"
          }`
        : reportScope === "category"
          ? `Category Report — ${reportCategory} / ${reportGroup}`
          : reportScope === "date"
            ? "Movement Date Report"
            : "All Inventory Report";

    const reportFilter =
      reportScope === "date"
        ? `${reportDateFrom || "Start"} to ${reportDateTo || "Today"}`
        : reportScope === "product"
          ? selectedReportProduct?.product_name || "Selected product"
          : reportScope === "category"
            ? `${reportCategory} / ${reportGroup}`
            : "All products";

    const productRows = reportProducts
      .map((product) => {
        const calculatedStock = getCalculatedProductBalance(product);
        const stockStatus = getStockStatus(product, calculatedStock);
        const expiryStatus = getExpiryStatus(product.expiry_date);
        const display = getCategoryDisplay(product);

        return `
          <tr>
            <td>${escapeHtml(product.product_name)}</td>
            <td>${escapeHtml(product.sku)}</td>
            <td>${escapeHtml(display.category)} / ${escapeHtml(display.group)}</td>
            <td>${escapeHtml(opsAreaLabels[product.ops_area])}</td>
            <td>${formatQty(product.packaging_amount || 0)} ${escapeHtml(product.unit)}</td>
            <td>${formatCurrency(product.packaging_cost || 0)}</td>
            <td>${formatCurrency(product.unit_cost || 0)}</td>
            <td>${formatQty(calculatedStock)} ${escapeHtml(product.unit)}</td>
            <td>${formatCurrency(calculatedStock * product.unit_cost)}</td>
            <td>${escapeHtml(stockStatus.label)}</td>
            <td>${escapeHtml(expiryStatus.label)}</td>
          </tr>
        `;
      })
      .join("");

    const movementRows = reportMovements
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

    const totalValue = reportProducts.reduce((total, product) => {
      const calculatedStock = getCalculatedProductBalance(product);

      return total + calculatedStock * product.unit_cost;
    }, 0);

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(reportTitle)}</title>
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
              <div class="headerTop">
                <div>
                  <div class="brand">📦 Forza Unified System</div>
                  <h1>${escapeHtml(reportTitle)}</h1>
                </div>
                <div class="badge">Inventory PDF Report</div>
              </div>
            </section>

            <section class="content">
              <div class="grid">
                <div class="card"><div class="label">Brand</div><div class="value">${escapeHtml(selectedBrand?.name || "Selected Brand")}</div></div>
                <div class="card"><div class="label">Branch</div><div class="value">${escapeHtml(selectedUnit?.name || "Selected Branch")}</div></div>
                <div class="card"><div class="label">Area</div><div class="value">${escapeHtml(opsAreaLabels[selectedOpsArea])}</div></div>
                <div class="card"><div class="label">Filter</div><div class="value">${escapeHtml(reportFilter)}</div></div>
                <div class="card"><div class="label">Products</div><div class="value">${reportProducts.length}</div></div>
                <div class="card"><div class="label">Movements</div><div class="value">${reportMovements.length}</div></div>
                <div class="card"><div class="label">Inventory Value</div><div class="value">${formatCurrency(totalValue)}</div></div>
                <div class="card"><div class="label">Generated</div><div class="value">${todayDate()}</div></div>
              </div>

              <h2>📋 Product Summary</h2>
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Category / Group</th>
                    <th>Area</th>
                    <th>Package Amount</th>
                    <th>Package Cost</th>
                    <th>Unit Cost / UOM</th>
                    <th>Calculated Qty Left</th>
                    <th>Value</th>
                    <th>Stock</th>
                    <th>Expiry</th>
                  </tr>
                </thead>
                <tbody>
                  ${productRows || `<tr><td colspan="11">No products found.</td></tr>`}
                </tbody>
              </table>

              <h2>🔁 Movement Ledger</h2>
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
                <div>Report Type: ${escapeHtml(reportTitle)}</div>
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
      toast.error("Allow popups to download the inventory PDF.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
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

    const packageAmountNumber = Number(packagingAmount || 0);
    const packageCostNumber = Number(packagingCost || 0);
    const nextUnitCost = calculateUnitCost(packageAmountNumber, packageCostNumber);

    if (!Number.isFinite(packageAmountNumber) || packageAmountNumber <= 0) {
      toast.error("Packaging amount must be greater than zero.");
      return;
    }

    if (!Number.isFinite(packageCostNumber) || packageCostNumber < 0) {
      toast.error("Packaging cost must be zero or greater.");
      return;
    }

    const normalizedProductName = normalizeText(productName);

    const duplicateProductName = productList.find(
      (product) =>
        product.is_active &&
        product.brand_id === selectedBrand.id &&
        product.brand_unit_id === selectedUnitId &&
        product.ops_area === selectedOpsArea &&
        normalizeText(product.product_name) === normalizedProductName &&
        product.id !== editId,
    );

    if (duplicateProductName) {
      toast.error("Product already exists in this branch and area.");
      return;
    }

    const nextSku =
      sku.trim() ||
      getNextGeneratedSku(productName, selectedUnitId, selectedOpsArea, editId);

    setSku(nextSku);

    setIsSaving(true);

    const payload = {
      brand_id: selectedBrand.id,
      brand_unit_id: selectedUnitId,
      category_id: null,
      product_category: productCategory,
      product_group: productGroup,
      ops_area: selectedOpsArea,
      product_name: productName.trim(),
      sku: nextSku.trim().toUpperCase(),
      unit,
      supplier_name: supplierName.trim() || null,
      opening_stock: Number(openingStock || 0),
      minimum_stock: Number(minimumStock || 0),
      maximum_stock: Number(maximumStock || 0),
      packaging_amount: packageAmountNumber,
      packaging_cost: packageCostNumber,
      unit_cost: nextUnitCost,
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
        if (isDuplicateInventoryError(error.message)) {
          toast.error("Product already exists in this branch and area.");
          return;
        }

        if (isDuplicateSkuError(error.message)) {
          toast.error("Generated SKU already exists. Generate a different SKU.");
          return;
        }

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
      .insert({
        ...payload,
        current_stock: 0,
      })
      .select(
        "id, brand_id, brand_unit_id, category_id, product_category, product_group, ops_area, product_name, sku, unit, supplier_name, opening_stock, current_stock, minimum_stock, maximum_stock, packaging_amount, packaging_cost, unit_cost, expiry_date, storage_area, is_active",
      )
      .single();

    setIsSaving(false);

    if (error) {
      if (isDuplicateInventoryError(error.message)) {
        toast.error("Product already exists in this branch and area.");
        return;
      }

      if (isDuplicateSkuError(error.message)) {
        toast.error("Generated SKU already exists. Generate a different SKU.");
        return;
      }

      toast.error(error.message);
      return;
    }

    const createdProduct = data as InventoryProduct;

    await refreshInventoryData();

    setMovementProductId(createdProduct.id);
    updateInventoryUrl(selectedUnitId, selectedOpsArea);
    toast.success(
      "Product created successfully. Unit cost is calculated from packaging cost and packaging amount.",
    );
    resetForm();
  }

  async function deleteProduct(productId: string) {
    const confirmed = window.confirm(
      "Delete this product? This cannot be undone.",
    );

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
      unit_cost: Number(selectedMovementProduct.unit_cost || 0),
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

    await refreshInventoryData();
    toast.success("Inventory movement saved successfully.");
    resetMovementForm();
  }

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-[2rem] p-6">
        <div className="grid gap-5 xl:grid-cols-[1fr_360px] xl:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-slate-400">
              Commercial Inventory Ledger
            </p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">
              {selectedBrand?.name || "Selected Brand"} Inventory
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Product setup does not create stock value. Stock and inventory
              value calculate only after Product In, Transfer In, Adjustment In,
              consumption, waste, shrinkage, transfer, or physical count
              movements. Every movement follows the product UOM and the
              automatically computed unit cost.
            </p>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white/80 p-5 shadow-sm">
            <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">
              Branch Unit
            </label>
            <select
              value={selectedUnitId}
              onChange={(event) => handleUnitChange(event.target.value)}
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
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
        <MetricCard
          label="Discrepancy"
          value={getDiscrepancyStatus(latestDiscrepancy).label}
          icon={<ClipboardList size={22} />}
        />
      </section>

      <section className="glass-panel rounded-[2rem] p-6">
        <div className="mb-5">
          <p className="text-sm font-black uppercase tracking-wide text-slate-400">
            Stock Calculation Standard
          </p>
          <h2 className="text-2xl font-black text-slate-950">
            Movement-Based Inventory Cycle
          </h2>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-black text-emerald-800">
              <ArrowUpCircle size={18} />
              Stock In
            </div>
            <p className="text-sm leading-6 text-emerald-800">
              Product In + Transfer In + Adjustment In, calculated in the
              selected product UOM.
            </p>
          </div>

          <div className="rounded-3xl border border-red-100 bg-red-50 p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-black text-red-800">
              <ArrowDownCircle size={18} />
              Stock Out
            </div>
            <p className="text-sm leading-6 text-red-800">
              Production Consumption + Sold Consumption + Waste + Shrinkage +
              Transfer Out + Adjustment Out, deducted in the selected product
              UOM.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-900">
              <ClipboardList size={18} />
              Discrepancy
            </div>
            <p className="text-sm leading-6 text-slate-600">
              Physical Count - System Remaining Quantity = Missing, Over, or On
              Track.
            </p>
          </div>
        </div>
      </section>

      <section className="glass-panel rounded-[2rem] p-6">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-slate-400">
              Product Master
            </p>
            <h2 className="text-2xl font-black text-slate-950">
              Create / Edit Product
            </h2>
            <p className="mt-2 text-sm font-bold text-slate-500">
              Select Kitchen, Bar, or Global. The category and group options
              will automatically match the selected area.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={selectedOpsArea}
              onChange={(event) =>
                handleOpsAreaChange(event.target.value as OpsArea)
              }
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
              Regenerate SKU
            </button>
          </div>
        </div>

        <form
          onSubmit={saveProduct}
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <Field label="Product Name">
            <input
              required
              value={productName}
              onChange={(event) => setProductName(event.target.value)}
              className="forza-input"
              placeholder="Example: Tomato"
            />
          </Field>

          <div className="md:col-span-2 xl:col-span-4">
            <label className="text-sm font-bold text-slate-700">Category</label>
            <div className="mt-2 grid gap-3 md:grid-cols-3">
              {currentCategoryOptions.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => handleProductCategoryChange(item.value)}
                  className={`forza-button-hover flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-black transition ${
                    productCategory === item.value
                      ? "border-slate-950 bg-slate-950 text-white shadow-xl"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 xl:col-span-4">
            <label className="text-sm font-bold text-slate-700">Group</label>
            <div className="mt-2 grid gap-3 md:grid-cols-3 xl:grid-cols-4">
              {currentGroupOptions.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setProductGroup(item.value)}
                  className={`forza-button-hover flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-black transition ${
                    productGroup === item.value
                      ? "border-emerald-700 bg-emerald-50 text-emerald-800 shadow-lg"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm md:col-span-2 xl:col-span-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
              Selected Product Classification
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-2 text-xs font-black text-white">
                {getCategoryIcon(productCategory)}
                {productCategory}
              </span>

              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700">
                {getGroupIcon(productGroup)}
                {productGroup}
              </span>

              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700">
                <Boxes size={17} />
                {opsAreaLabels[selectedOpsArea]}
              </span>
            </div>
          </div>

          <Field label="System Generated SKU">
            <input
              required
              readOnly
              value={sku}
              className="forza-input cursor-not-allowed bg-slate-100"
              placeholder="SKU generates after product name"
            />
          </Field>

          <Field label="Packaging Amount">
            <input
              required
              type="number"
              step="0.001"
              min="0"
              value={packagingAmount}
              onChange={(event) => setPackagingAmount(event.target.value)}
              className="forza-input"
              placeholder="Example: 1000"
            />
          </Field>

          <Field label="Packaging UOM">
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

          <Field label="Packaging Cost (€)">
            <input
              required
              type="number"
              step="0.0001"
              min="0"
              value={packagingCost}
              onChange={(event) => setPackagingCost(event.target.value)}
              className="forza-input"
              placeholder="Example: 20"
            />
          </Field>

          <Field label={`Auto Unit Cost per ${unit}`}>
            <input
              readOnly
              value={formatCost(computedUnitCost)}
              className="forza-input cursor-not-allowed bg-slate-100"
            />
          </Field>

          <Field label="Supplier">
            <input
              value={supplierName}
              onChange={(event) => setSupplierName(event.target.value)}
              className="forza-input"
              placeholder="Supplier name"
            />
          </Field>

          <Field label="Opening Stock Reference">
            <input
              type="number"
              step="0.001"
              value={openingStock}
              onChange={(event) => setOpeningStock(event.target.value)}
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

          <div className="rounded-3xl border border-blue-100 bg-blue-50 p-4 md:col-span-2 xl:col-span-4">
            <p className="text-xs font-black uppercase tracking-wide text-blue-700">
              Commercial Costing Rule
            </p>
            <p className="mt-2 text-sm font-bold leading-6 text-blue-800">
              Packaging Cost ÷ Packaging Amount = Auto Unit Cost per UOM. Example:
              €20 ÷ 1000 gram = €0.02 per gram. Stock quantity and value calculate
              from the movement ledger using this unit cost.
            </p>
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
                  ? "Update Product"
                  : "Create Product"}
            </button>

            {mode === "edit" ? (
              <button
                type="button"
                onClick={() => resetForm()}
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
        <div className="mb-5">
          <p className="text-sm font-black uppercase tracking-wide text-slate-400">
            Inventory Movement Entry
          </p>
          <h2 className="text-2xl font-black text-slate-950">
            Product In / Consumption / Count
          </h2>
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

          <Field
            label={`Movement Unit Cost${
              selectedMovementProduct?.unit
                ? ` / ${selectedMovementProduct.unit}`
                : ""
            }`}
          >
            <input
              readOnly
              value={formatCost(Number(movementUnitCost || 0))}
              className="forza-input cursor-not-allowed bg-slate-100"
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
              placeholder="Invoice, transfer, waste ref..."
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
                ? `${selectedMovementProduct.product_name} uses ${selectedMovementProduct.unit}. Movement quantity will be calculated in ${selectedMovementProduct.unit} at ${formatCurrency(selectedMovementProduct.unit_cost || 0)} per ${selectedMovementProduct.unit}.`
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
              Inventory PDF Export
            </p>
            <h2 className="text-2xl font-black text-slate-950">
              Download Filtered Report
            </h2>
          </div>

          <button
            type="button"
            onClick={downloadInventoryPdf}
            className="forza-button-hover inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-xl"
          >
            <Download size={18} />
            Download PDF
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Field label="PDF Scope">
            <select
              value={reportScope}
              onChange={(event) => setReportScope(event.target.value as ReportScope)}
              className="forza-input"
            >
              <option value="all">All Products</option>
              <option value="product">By Product</option>
              <option value="category">By Category / Group</option>
              <option value="date">By Movement Date</option>
            </select>
          </Field>

          <Field label="Product">
            <select
              value={reportProductId}
              onChange={(event) => setReportProductId(event.target.value)}
              disabled={reportScope !== "product"}
              className="forza-input disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <option value="">Select product</option>
              {visibleProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.product_name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Category">
            <select
              value={reportCategory}
              onChange={(event) =>
                handleReportCategoryChange(
                  event.target.value as ProductCategoryValue,
                )
              }
              disabled={reportScope !== "category"}
              className="forza-input disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              {reportCategoryOptions.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Group">
            <select
              value={reportGroup}
              onChange={(event) =>
                setReportGroup(event.target.value as ProductGroupValue)
              }
              disabled={reportScope !== "category"}
              className="forza-input disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              {reportGroupOptions.map((group) => (
                <option key={group.value} value={group.value}>
                  {group.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Date From">
            <input
              type="date"
              value={reportDateFrom}
              onChange={(event) => setReportDateFrom(event.target.value)}
              disabled={reportScope !== "date"}
              className="forza-input disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </Field>

          <Field label="Date To">
            <input
              type="date"
              value={reportDateTo}
              onChange={(event) => setReportDateTo(event.target.value)}
              disabled={reportScope !== "date"}
              className="forza-input disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </Field>
        </div>

        <p className="mt-4 text-sm font-bold text-slate-500">
          PDF uses the current branch, area, and search result. Date filter uses
          inventory movement date.
        </p>
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
              placeholder="Search product, SKU, supplier, category, group..."
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1360px] border-separate border-spacing-y-3">
            <thead>
              <tr className="text-left text-xs font-black uppercase tracking-wide text-slate-400">
                <th className="px-4">Product</th>
                <th className="px-4">Category / Group</th>
                <th className="px-4">SKU</th>
                <th className="px-4">Area</th>
                <th className="px-4">Package</th>
                <th className="px-4">Package Cost</th>
                <th className="px-4">Unit Cost / UOM</th>
                <th className="px-4">Calculated Qty Left</th>
                <th className="px-4">Value</th>
                <th className="px-4">Stock Status</th>
                <th className="px-4">Expiry</th>
                <th className="px-4">Action</th>
              </tr>
            </thead>

            <tbody>
              {visibleProducts.map((product) => {
                const calculatedStock = getCalculatedProductBalance(product);
                const stockStatus = getStockStatus(product, calculatedStock);
                const expiryStatus = getExpiryStatus(product.expiry_date);
                const display = getCategoryDisplay(product);

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
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-2">
                        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
                          {getCategoryIcon(display.category)}
                          {display.category}
                        </span>
                        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-700">
                          {getGroupIcon(display.group)}
                          {display.group}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-slate-700">
                      {product.sku}
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-slate-700">
                      {opsAreaLabels[product.ops_area]}
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-slate-700">
                      {formatQty(product.packaging_amount || 0)} {product.unit}
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-slate-700">
                      {formatCurrency(product.packaging_cost || 0)}
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-slate-700">
                      {formatCurrency(product.unit_cost || 0)} / {product.unit}
                    </td>
                    <td className="px-4 py-4 text-sm font-black text-slate-950">
                      {formatQty(calculatedStock)} {product.unit}
                    </td>
                    <td className="px-4 py-4 text-sm font-black text-slate-950">
                      {formatCurrency(calculatedStock * product.unit_cost)}
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
                    colSpan={12}
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

      <section className="glass-panel rounded-[2rem] p-6">
        <div className="mb-5">
          <p className="text-sm font-black uppercase tracking-wide text-slate-400">
            Movement History
          </p>
          <h2 className="text-2xl font-black text-slate-950">
            Latest Inventory Ledger Entries
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
                    No inventory movements found for this branch and area.
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