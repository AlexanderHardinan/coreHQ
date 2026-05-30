export type UserRole = "boh_staff" | "foh_staff" | "manager" | "super_admin";

export type ModuleKey =
  | "dashboard"
  | "kitchen_ops"
  | "bar_ops"
  | "inventory"
  | "recipe_maker"
  | "payroll_budget"
  | "operational_budget"
  | "sales_performance"
  | "reports"
  | "settings"
  | "users";

export type TriggerStatus =
  | "over_budget"
  | "on_budget"
  | "over_stocked"
  | "low_stock"
  | "inventory_discrepancy"
  | "on_track"
  | "expiring_soon"
  | "expired"
  | "safe";

export type DateFilterMode = "day" | "week" | "month" | "year" | "custom";