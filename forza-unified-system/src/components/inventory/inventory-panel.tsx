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
type ProductMainCategory = "food" | "beverage" | "others";

const opsAreaLabels: Record<OpsArea, string> = {
  kitchen: "Kitchen",
  bar: "Bar",
  global: "Global",
};

const unitOptions = ["gram", "ml", "pc", "bottle"];

const productMainCategories: {
  value: ProductMainCategory;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "food",
    label: "Food",
    icon: <ClipboardList size={16} />,
  },
  {
    value: "beverage",
    label: "Beverage",
    icon: <GlassWater size={16} />,
  },
  {
    value: "others",
    label: "Others",
    icon: <Tags size={16} />,
  },
];

const productGroupOptions: Record<
  ProductMainCategory,
  {
    value: string;
    label: string;
    icon: React.ReactNode;
    aliases?: string[];
  }[]
> = {
  food: [
    {
      value: "seafood",
      label: "Seafood",
      icon: <Fish size={16} />,
      aliases: ["sea food", "fish", "seafoods"],
    },
    {
      value: "meat",
      label: "Meat",
      icon: <Beef size={16} />,
      aliases: ["beef", "pork", "chicken", "meats"],
    },
    {
      value: "dairy",
      label: "Dairy",
      icon: <Milk size={16} />,
      aliases: ["milk", "cheese", "cream"],
    },
    {
      value: "dry-goods",
      label: "Dry Goods",
      icon: <Wheat size={16} />,
      aliases: ["dry good", "drygoods", "dry"],
    },
    {
      value: "vegetables",
      label: "Vegetables",
      icon: <Carrot size={16} />,
      aliases: ["vegetable", "veg"],
    },
    {
      value: "fruits",
      label: "Fruits",
      icon: <Apple size={16} />,
      aliases: ["fruit"],
    },
  ],
  beverage: [
    {
      value: "beer",
      label: "Beer",
      icon: <Beer size={16} />,
    },
    {
      value: "wine",
      label: "Wine",
      icon: <Wine size={16} />,
    },
    {
      value: "softdrink",
      label: "Softdrink",
      icon: <CupSoda size={16} />,
      aliases: ["soft drink", "soft drinks", "soda"],
    },
    {
      value: "water",
      label: "Water",
      icon: <Droplets size={16} />,
    },
    {
      value: "dry-good",
      label: "Dry Good",
      icon: <Package size={16} />,
      aliases: ["dry goods", "drygoods", "dry"],
    },
    {
      value: "fruit",
      label: "Fruit",
      icon: <Apple size={16} />,
      aliases: ["fruits"],
    },
    {
      value: "vegetable",
      label: "Vegetable",
      icon: <Carrot size={16} />,
      aliases: ["vegetables", "veg"],
    },
  ],
  others: [
    {
      value: "others",
      label: "Others",
      icon: <Package size={16} />,
      aliases: ["other", "miscellaneous", "misc"],
    },
  ],
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

function normalizeCategoryName(value: string) {
  return normalizeText(value)
    .replaceAll("&", "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

function getStockStatus(product: InventoryProduct) {
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

function getGroupOptionByName(name: string) {
  const normalizedName = normalizeCategoryName(name);

  for (const [mainCategory, groupOptions] of Object.entries(
    productGroupOptions,
  ) as [
    ProductMainCategory,
    {
      value: string;
      label: string;
      icon: React.ReactNode;
      aliases?: string[];
    }[],
  ][]) {
    const matchedGroup = groupOptions.find((group) => {
      const normalizedLabel = normalizeCategoryName(group.label);
      const normalizedAliases = (group.aliases || []).map((alias) =>
        normalizeCategoryName(alias),
      );

      return (
        normalizedLabel === normalizedName ||
        group.value === normalizedName ||
        normalizedAliases.includes(normalizedName)
      );
    });

    if (matchedGroup) {
      return {
        mainCategory,
        group: matchedGroup,
      };
    }
  }

  return {
    mainCategory: "others" as ProductMainCategory,
    group: productGroupOptions.others[0],
  };
}

function getMainCategoryForCategoryId(
  categoryId: string,
  categories: InventoryCategory[],
): ProductMainCategory {
  const category = categories.find((item) => item.id === categoryId);

  if (!category) {
    return "food";
  }

  return getGroupOptionByName(category.name).mainCategory;
}

function getGroupIconByCategoryName(name: string) {
  return getGroupOptionByName(name).group.icon;
}

function getMainCategoryLabel(category: ProductMainCategory) {
  return (
    productMainCategories.find((item) => item.value === category)?.label ||
    "Food"
  );
}

export function InventoryPanel({
  role,
  selectedBrand,
  units,
  categories,
  products,
  initialUnitId,
  initialOpsArea,
}: InventoryPanelProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const allowedOpsAreas = getAllowedOpsAreas(role);
  const safeInitialOpsArea = normalizeOpsArea(initialOpsArea, allowedOpsAreas);
  const safeInitialUnitId =
    units.find((unit) => unit.id === initialUnitId)?.id || units[0]?.id || "";

  const [productList, setProductList] = useState(products);
  const [movementList, setMovementList] = useState<InventoryMovement[]>([]);
  const [mode, setMode] = useState<EditMode>("create");
  const [editId, setEditId] = useState("");

  const [selectedUnitId, setSelectedUnitId] = useState(safeInitialUnitId);
  const [selectedOpsArea, setSelectedOpsArea] =
    useState<OpsArea>(safeInitialOpsArea);
  const [search, setSearch] = useState("");

  const [productName, setProductName] = useState("");
  const [mainCategory, setMainCategory] =
    useState<ProductMainCategory>("food");
  const [categoryId, setCategoryId] = useState("");
  const [sku, setSku] = useState("");
  const [unit, setUnit] = useState("gram");
  const [supplierName, setSupplierName] = useState("");
  const [openingStock, setOpeningStock] = useState("0");
  const [minimumStock, setMinimumStock] = useState("0");
  const [maximumStock, setMaximumStock] = useState("0");
  const [unitCost, setUnitCost] = useState("0");
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
  const [reportCategoryId, setReportCategoryId] = useState("");
  const [reportDateFrom, setReportDateFrom] = useState("");
  const [reportDateTo, setReportDateTo] = useState("");

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
    setSelectedOpsArea(normalizeOpsArea(initialOpsArea, allowedOpsAreas));
  }, [initialOpsArea, allowedOpsAreas]);

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

  const categoryGroupOptions = useMemo(() => {
    const selectedGroups = productGroupOptions[mainCategory];

    return selectedGroups.map((group) => {
      const matchingCategory = visibleCategories.find((category) => {
        const normalizedCategory = normalizeCategoryName(category.name);
        const normalizedLabel = normalizeCategoryName(group.label);
        const normalizedAliases = (group.aliases || []).map((alias) =>
          normalizeCategoryName(alias),
        );

        return (
          normalizedCategory === normalizedLabel ||
          normalizedCategory === group.value ||
          normalizedAliases.includes(normalizedCategory)
        );
      });

      return {
        ...group,
        categoryId: matchingCategory?.id || "",
        isAvailable: Boolean(matchingCategory?.id),
      };
    });
  }, [mainCategory, visibleCategories]);

  const selectedCategoryOption = useMemo(
    () => categoryGroupOptions.find((group) => group.categoryId === categoryId),
    [categoryGroupOptions, categoryId],
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

  const reportProducts = useMemo(() => {
    if (reportScope === "product") {
      return visibleProducts.filter((product) => product.id === reportProductId);
    }

    if (reportScope === "category") {
      return visibleProducts.filter(
        (product) => product.category_id === reportCategoryId,
      );
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
    reportCategoryId,
    reportDateFrom,
    reportDateTo,
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

  async function refreshProducts() {
    if (!selectedBrand?.id) {
      return;
    }

    const { data, error } = await supabase
      .from("products")
      .select(
        "id, brand_id, brand_unit_id, category_id, ops_area, product_name, sku, unit, supplier_name, opening_stock, current_stock, minimum_stock, maximum_stock, unit_cost, expiry_date, storage_area, is_active",
      )
      .eq("brand_id", selectedBrand.id)
      .eq("is_active", true)
      .order("product_name", { ascending: true });

    if (error) {
      toast.error(error.message);
      return;
    }

    setProductList((data || []) as InventoryProduct[]);
  }

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
      .limit(150);

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
        "id, brand_id, brand_unit_id, category_id, ops_area, product_name, sku, unit, supplier_name, opening_stock, current_stock, minimum_stock, maximum_stock, unit_cost, expiry_date, storage_area, is_active",
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

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBrand?.id]);

  useEffect(() => {
    if (!categoryId) {
      return;
    }

    const categoryStillVisible = categoryGroupOptions.some(
      (group) => group.categoryId === categoryId,
    );

    if (!categoryStillVisible) {
      setCategoryId("");
    }
  }, [categoryGroupOptions, categoryId]);

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
    resetForm();
    updateInventoryUrl(nextUnitId, selectedOpsArea);
  }

  function handleOpsAreaChange(nextOpsArea: OpsArea) {
    const safeArea = normalizeOpsArea(nextOpsArea, allowedOpsAreas);

    setSelectedOpsArea(safeArea);
    setCategoryId("");
    resetForm();
    updateInventoryUrl(selectedUnitId, safeArea);
  }

  function handleMainCategoryChange(nextCategory: ProductMainCategory) {
    setMainCategory(nextCategory);
    setCategoryId("");
  }

  function resetForm() {
    setMode("create");
    setEditId("");
    setProductName("");
    setMainCategory("food");
    setCategoryId("");
    setSku("");
    setUnit("gram");
    setSupplierName("");
    setOpeningStock("0");
    setMinimumStock("0");
    setMaximumStock("0");
    setUnitCost("0");
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
    const brandCode = selectedBrand?.code || "BRAND";
    const unitCode = selectedUnit?.code || "UNIT";
    const areaCode = selectedOpsArea.toUpperCase();
    const category = visibleCategories.find((item) => item.id === categoryId);
    const categoryCode = category ? toCode(category.name) : toCode(mainCategory);

    const existingCount =
      productList.filter((product) => {
        const productCategoryId = product.category_id || "";
        const activeCategoryId = categoryId || "";

        return (
          product.brand_unit_id === selectedUnitId &&
          product.ops_area === selectedOpsArea &&
          productCategoryId === activeCategoryId
        );
      }).length + 1;

    const nextNumber = String(existingCount).padStart(5, "0");

    setSku(`${brandCode}-${unitCode}-${areaCode}-${categoryCode}-${nextNumber}`);
  }

  function editProduct(product: InventoryProduct) {
    const detectedMainCategory = getMainCategoryForCategoryId(
      product.category_id || "",
      categories,
    );

    setMode("edit");
    setEditId(product.id);
    setSelectedUnitId(product.brand_unit_id);
    setSelectedOpsArea(product.ops_area);
    setProductName(product.product_name);
    setMainCategory(detectedMainCategory);
    setCategoryId(product.category_id || "");
    setSku(product.sku);
    setUnit(product.unit);
    setSupplierName(product.supplier_name || "");
    setOpeningStock(String(product.opening_stock || 0));
    setMinimumStock(String(product.minimum_stock || 0));
    setMaximumStock(String(product.maximum_stock || 0));
    setUnitCost(String(product.unit_cost || 0));
    setExpiryDate(product.expiry_date || "");
    setStorageArea(product.storage_area || "");
    updateInventoryUrl(product.brand_unit_id, product.ops_area);
  }

  function getCategoryName(categoryIdValue: string | null) {
    if (!categoryIdValue) {
      return "No category";
    }

    return (
      categories.find((category) => category.id === categoryIdValue)?.name ||
      "No category"
    );
  }

  function downloadInventoryPdf() {
    if (reportProducts.length === 0 && reportMovements.length === 0) {
      toast.error("No inventory data available for this PDF filter.");
      return;
    }

    const selectedReportProduct = productList.find(
      (product) => product.id === reportProductId,
    );
    const selectedReportCategory = categories.find(
      (category) => category.id === reportCategoryId,
    );

    const reportTitle =
      reportScope === "product"
        ? `Product Report — ${
            selectedReportProduct?.product_name || "Selected Product"
          }`
        : reportScope === "category"
          ? `Category Report — ${
              selectedReportCategory?.name || "Selected Category"
            }`
          : reportScope === "date"
            ? "Movement Date Report"
            : "All Inventory Report";

    const reportFilter =
      reportScope === "date"
        ? `${reportDateFrom || "Start"} to ${reportDateTo || "Today"}`
        : reportScope === "product"
          ? selectedReportProduct?.product_name || "Selected product"
          : reportScope === "category"
            ? selectedReportCategory?.name || "Selected category"
            : "All products";

    const productRows = reportProducts
      .map((product) => {
        const stockStatus = getStockStatus(product);
        const expiryStatus = getExpiryStatus(product.expiry_date);

        return `
          <tr>
            <td>${escapeHtml(product.product_name)}</td>
            <td>${escapeHtml(product.sku)}</td>
            <td>${escapeHtml(getCategoryName(product.category_id))}</td>
            <td>${escapeHtml(opsAreaLabels[product.ops_area])}</td>
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

    const movementRows = reportMovements
      .slice(0, 200)
      .map((movement) => {
        const product = productList.find((item) => item.id === movement.product_id);
        const direction = getMovementDirection(movement.movement_type);

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
              movement.system_balance_after === null
                ? "-"
                : formatQty(movement.system_balance_after)
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

    const totalValue = reportProducts.reduce(
      (total, product) => total + product.current_stock * product.unit_cost,
      0,
    );

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
                    <th>System Balance</th>
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

  async function createOpeningStockMovement(product: InventoryProduct) {
    const openingQty = Number(openingStock || 0);

    if (openingQty <= 0) {
      return;
    }

    const { error } = await supabase.from("inventory_movements").insert({
      brand_id: product.brand_id,
      brand_unit_id: product.brand_unit_id,
      product_id: product.id,
      ops_area: product.ops_area,
      movement_type: "opening_stock",
      quantity: openingQty,
      unit_cost: product.unit_cost,
      reference_code: `OPENING-STOCK:${product.id}`,
      notes: "Opening stock created from product setup.",
      movement_date: todayDate(),
    });

    if (error) {
      toast.error(error.message);
    }
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

    if (!categoryId) {
      toast.error("Select a product group.");
      return;
    }

    if (!sku.trim()) {
      toast.error("SKU is required. Generate or enter a SKU.");
      return;
    }

    const normalizedProductName = normalizeText(productName);
    const normalizedSku = normalizeText(sku);

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
      toast.error("Product already exists. Use the existing product instead.");
      return;
    }

    const duplicateSku = productList.find(
      (product) =>
        product.is_active &&
        product.brand_id === selectedBrand.id &&
        product.brand_unit_id === selectedUnitId &&
        product.ops_area === selectedOpsArea &&
        normalizeText(product.sku) === normalizedSku &&
        product.id !== editId,
    );

    if (duplicateSku) {
      toast.error("SKU already exists. Generate a different SKU.");
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
        if (isDuplicateInventoryError(error.message)) {
          toast.error("Product already exists. Use the existing product instead.");
          return;
        }

        if (isDuplicateSkuError(error.message)) {
          toast.error("SKU already exists. Generate a different SKU.");
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
        "id, brand_id, brand_unit_id, category_id, ops_area, product_name, sku, unit, supplier_name, opening_stock, current_stock, minimum_stock, maximum_stock, unit_cost, expiry_date, storage_area, is_active",
      )
      .single();

    setIsSaving(false);

    if (error) {
      if (isDuplicateInventoryError(error.message)) {
        toast.error("Product already exists. Use the existing product instead.");
        return;
      }

      if (isDuplicateSkuError(error.message)) {
        toast.error("SKU already exists. Generate a different SKU.");
        return;
      }

      toast.error(error.message);
      return;
    }

    const createdProduct = data as InventoryProduct;

    await createOpeningStockMovement(createdProduct);
    await refreshInventoryData();

    setMovementProductId(createdProduct.id);
    updateInventoryUrl(selectedUnitId, selectedOpsArea);
    toast.success("Product created successfully.");
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
              Opening stock plus product in and transfer in, less production,
              sold consumption, waste, shrinkage, and transfer out equals the
              system remaining quantity. Duplicate product names are blocked per
              brand, branch, and area to protect recipe costing and ingredient
              deduction.
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
              Opening Stock + Product In + Transfer In + Adjustment In
            </p>
          </div>

          <div className="rounded-3xl border border-red-100 bg-red-50 p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-black text-red-800">
              <ArrowDownCircle size={18} />
              Stock Out
            </div>
            <p className="text-sm leading-6 text-red-800">
              Production Consumption + Sold Consumption + Waste + Shrinkage +
              Transfer Out + Adjustment Out
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
              Generate SKU
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

          <Field label="Category">
            <select
              value={mainCategory}
              onChange={(event) =>
                handleMainCategoryChange(
                  event.target.value as ProductMainCategory,
                )
              }
              className="forza-input"
            >
              {productMainCategories.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Group">
            <select
              required
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="forza-input"
            >
              <option value="">Select group</option>
              {categoryGroupOptions.map((group) => (
                <option
                  key={group.value}
                  value={group.categoryId}
                  disabled={!group.isAvailable}
                >
                  {group.label}
                  {!group.isAvailable ? " — create category first" : ""}
                </option>
              ))}
            </select>
          </Field>

          <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
              Category Preview
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-2 text-xs font-black text-white">
                {
                  productMainCategories.find(
                    (item) => item.value === mainCategory,
                  )?.icon
                }
                {getMainCategoryLabel(mainCategory)}
              </span>

              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700">
                {selectedCategoryOption?.icon || <Tags size={16} />}
                {selectedCategoryOption?.label || "No group selected"}
              </span>
            </div>

            {categoryGroupOptions.some((group) => !group.isAvailable) ? (
              <p className="mt-3 text-xs font-bold leading-5 text-amber-700">
                Some groups are disabled because the matching Inventory Category
                does not exist yet for this branch and area.
              </p>
            ) : null}
          </div>

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

          <Field label="Unit Cost (€)">
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
              <option value="category">By Category</option>
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

          <Field label="Category / Group">
            <select
              value={reportCategoryId}
              onChange={(event) => setReportCategoryId(event.target.value)}
              disabled={reportScope !== "category"}
              className="forza-input disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <option value="">Select group</option>
              {visibleCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
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
              placeholder="Search product, SKU, supplier..."
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1240px] border-separate border-spacing-y-3">
            <thead>
              <tr className="text-left text-xs font-black uppercase tracking-wide text-slate-400">
                <th className="px-4">Product</th>
                <th className="px-4">Category / Group</th>
                <th className="px-4">SKU</th>
                <th className="px-4">Area</th>
                <th className="px-4">Actual Qty Left</th>
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
                const productCategoryName = getCategoryName(product.category_id);
                const productMainCategory = product.category_id
                  ? getMainCategoryForCategoryId(product.category_id, categories)
                  : "others";

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
                          {
                            productMainCategories.find(
                              (item) => item.value === productMainCategory,
                            )?.icon
                          }
                          {getMainCategoryLabel(productMainCategory)}
                        </span>
                        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-700">
                          {getGroupIconByCategoryName(productCategoryName)}
                          {productCategoryName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-slate-700">
                      {product.sku}
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-slate-700">
                      {opsAreaLabels[product.ops_area]}
                    </td>
                    <td className="px-4 py-4 text-sm font-black text-slate-950">
                      {formatQty(product.current_stock)} {product.unit}
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
                <th className="px-4">System Balance</th>
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
                    <td className="px-4 py-4 text-sm font-bold text-slate-700">
                      {movement.system_balance_after === null
                        ? "-"
                        : formatQty(movement.system_balance_after)}
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