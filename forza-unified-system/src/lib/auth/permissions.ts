export type UserRole = "boh_staff" | "foh_staff" | "manager" | "super_admin";

export type AppModule = {
  title: string;
  href: string;
  description: string;
  icon: string;
};

export const roleLabels: Record<UserRole, string> = {
  boh_staff: "BOH Staff",
  foh_staff: "FOH Staff",
  manager: "Manager",
  super_admin: "Super Admin",
};

const allModules: AppModule[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    description: "Executive overview, alerts, analytics, and trigger status.",
    icon: "LayoutDashboard",
  },
  {
    title: "Kitchen Ops",
    href: "/kitchen-ops",
    description: "Delivery, production, sold items, SKU, stock, and balance.",
    icon: "ChefHat",
  },
  {
    title: "Bar Ops",
    href: "/bar-ops",
    description: "Bar delivery, bottle balance, production, and realtime stock.",
    icon: "GlassWater",
  },
  {
    title: "Inventory",
    href: "/inventory",
    description: "Stock count, discrepancy, expiry, and inventory health.",
    icon: "Boxes",
  },
  {
    title: "Recipe Maker",
    href: "/recipe-maker",
    description: "Recipe costing, batch yield, ingredients, and margins.",
    icon: "ClipboardList",
  },
  {
    title: "Payroll Budget",
    href: "/payroll-budget",
    description: "FOH, BOH, Management, Support, and payroll variance.",
    icon: "Users",
  },
  {
    title: "Operational Budget",
    href: "/operational-budget",
    description: "Food, beverage, utilities, maintenance, and operating costs.",
    icon: "WalletCards",
  },
  {
    title: "Sales Performance",
    href: "/sales-performance",
    description: "Daily, weekly, monthly, yearly, and custom sales analytics.",
    icon: "TrendingUp",
  },
  {
    title: "Reports",
    href: "/reports",
    description: "PDF, CSV, filtered reports, headers, and footers.",
    icon: "BarChart3",
  },
  {
    title: "Settings",
    href: "/settings",
    description: "System settings, units, categories, alerts, and preferences.",
    icon: "Settings",
  },
  {
    title: "Users",
    href: "/users",
    description: "Super Admin only user creation, roles, and permissions.",
    icon: "ShieldCheck",
  },
];

export function getAllowedModules(role: UserRole): AppModule[] {
  if (role === "super_admin") {
    return allModules;
  }

  if (role === "manager") {
    return allModules.filter(
      (module) =>
        module.href !== "/payroll-budget" && module.href !== "/users",
    );
  }

  if (role === "boh_staff") {
    return allModules.filter((module) =>
      ["/dashboard", "/kitchen-ops"].includes(module.href),
    );
  }

  if (role === "foh_staff") {
    return allModules.filter((module) =>
      ["/dashboard", "/bar-ops"].includes(module.href),
    );
  }

  return [];
}

export function canAccessPath(role: UserRole, pathname: string): boolean {
  const allowedModules = getAllowedModules(role);

  return allowedModules.some((module) => {
    if (module.href === "/dashboard") {
      return pathname === "/dashboard";
    }

    return pathname === module.href || pathname.startsWith(`${module.href}/`);
  });
}