export type UserRole = "boh_staff" | "foh_staff" | "manager" | "super_admin";

export type AppModule = {
  title: string;
  href: string;
  description: string;
  icon: string;
  superAdminOnly?: boolean;
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
    description: "Private command center for authorized brand operations.",
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
    description: "Department payroll budgets and variance tracking.",
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
    description: "Protected sales performance workspace for authorized users.",
    icon: "TrendingUp",
  },
  {
    title: "Reports",
    href: "/reports",
    description: "Private PDF, CSV, filtered reports, headers, and footers.",
    icon: "BarChart3",
  },
  {
    title: "Brand Management",
    href: "/brand-management",
    description: "Super Admin brand, unit, group, and category control.",
    icon: "Building2",
    superAdminOnly: true,
  },
  {
    title: "Settings",
    href: "/settings",
    description: "System settings, alert thresholds, and preferences.",
    icon: "Settings",
  },
  {
    title: "Users",
    href: "/users",
    description: "Super Admin only user creation, roles, and permissions.",
    icon: "ShieldCheck",
    superAdminOnly: true,
  },
  {
    title: "Profile",
    href: "/profile",
    description: "User profile, account details, and avatar upload.",
    icon: "UserCircle2",
  },
];

const bohStaffAllowedPaths = [
  "/kitchen-ops",
  "/inventory",
  "/recipe-maker",
  "/profile",
];

const fohStaffAllowedPaths = [
  "/bar-ops",
  "/inventory",
  "/sales-performance",
  "/profile",
];

export function getAllowedModules(role: UserRole): AppModule[] {
  if (role === "super_admin") {
    return allModules;
  }

  if (role === "manager") {
    return allModules.filter(
      (module) =>
        module.href !== "/payroll-budget" &&
        module.href !== "/users" &&
        !module.superAdminOnly,
    );
  }

  if (role === "boh_staff") {
    return allModules.filter((module) =>
      bohStaffAllowedPaths.includes(module.href),
    );
  }

  if (role === "foh_staff") {
    return allModules.filter((module) =>
      fohStaffAllowedPaths.includes(module.href),
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