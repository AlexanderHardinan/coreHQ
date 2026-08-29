"use client";

import {
  type ReactNode,
  useState,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  CookingPot,
  FolderTree,
  House,
  MapPin,
  Menu,
  PackagePlus,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  ShoppingCart,
  X,
} from "lucide-react";

import LogoutButton from "@/app/logout-button";
import SwitchLocationButton from "@/app/switch-location-button";

type ActiveLocation = {
  code: "FOR" | "FUS";
  name: "Forza" | "Fusion";
};

type AppShellProps = {
  children: ReactNode;
  activeLocation: ActiveLocation;
};

type NavigationItem = {
  label: string;
  href?: string;
  icon: ReactNode;
  children?: {
    label: string;
    href: string;
    icon: ReactNode;
  }[];
};

const navigation: NavigationItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: <House size={18} />,
  },
  {
    label: "Products",
    icon: <Boxes size={18} />,
    children: [
      {
        label: "Product List",
        href: "/products",
        icon: <Boxes size={16} />,
      },
      {
        label: "Add Product",
        href: "/products/new",
        icon: <PackagePlus size={16} />,
      },
      {
        label: "Production Batch Recipes",
        href: "/recipes",
        icon: <CookingPot size={16} />,
      },
      {
        label: "Categories",
        href: "/categories",
        icon: <FolderTree size={16} />,
      },
    ],
  },
  {
    label: "Orders",
    icon: <ClipboardList size={18} />,
    children: [
      {
        label: "Normal Orders",
        href: "/orders/normal",
        icon: <ShoppingCart size={16} />,
      },
      {
        label: "Batch Production Orders",
        href: "/orders/production",
        icon: <CookingPot size={16} />,
      },
    ],
  },
];

export default function AppShell({
  children,
  activeLocation,
}: AppShellProps) {
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const [sidebarCollapsed, setSidebarCollapsed] =
    useState(false);

  const [productsOpen, setProductsOpen] =
    useState(true);

  const [ordersOpen, setOrdersOpen] =
    useState(true);

  function isActive(href: string) {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  }

  function closeMobileNavigation() {
    setMobileOpen(false);
  }

  function renderNavigation(
    mobile = false
  ) {
    return (
      <nav className="space-y-2">
        {navigation.map((item) => {
          if (
            item.label === "Products" &&
            item.children
          ) {
            const expanded =
              mobile || productsOpen;

            return (
              <div key={item.label}>
                <button
                  type="button"
                  onClick={() => {
                    setProductsOpen(
                      (current) => !current
                    );
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-950"
                >
                  <span className="flex items-center gap-3">
                    {item.icon}

                    {!sidebarCollapsed ||
                    mobile
                      ? item.label
                      : null}
                  </span>

                  {!sidebarCollapsed ||
                  mobile ? (
                    expanded ? (
                      <ChevronDown
                        size={16}
                      />
                    ) : (
                      <ChevronRight
                        size={16}
                      />
                    )
                  ) : null}
                </button>

                {expanded &&
                (!sidebarCollapsed ||
                  mobile) ? (
                  <div className="mt-1 space-y-1 pl-3">
                    {item.children.map(
                      (child) => (
                        <Link
                          key={
                            child.href
                          }
                          href={
                            child.href
                          }
                          onClick={
                            closeMobileNavigation
                          }
                          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                            isActive(
                              child.href
                            )
                              ? "bg-zinc-950 font-semibold text-white"
                              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
                          }`}
                        >
                          {
                            child.icon
                          }

                          {
                            child.label
                          }
                        </Link>
                      )
                    )}
                  </div>
                ) : null}
              </div>
            );
          }

          if (
            item.label === "Orders" &&
            item.children
          ) {
            const expanded =
              mobile || ordersOpen;

            return (
              <div key={item.label}>
                <button
                  type="button"
                  onClick={() => {
                    setOrdersOpen(
                      (current) => !current
                    );
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-950"
                >
                  <span className="flex items-center gap-3">
                    {item.icon}

                    {!sidebarCollapsed ||
                    mobile
                      ? item.label
                      : null}
                  </span>

                  {!sidebarCollapsed ||
                  mobile ? (
                    expanded ? (
                      <ChevronDown
                        size={16}
                      />
                    ) : (
                      <ChevronRight
                        size={16}
                      />
                    )
                  ) : null}
                </button>

                {expanded &&
                (!sidebarCollapsed ||
                  mobile) ? (
                  <div className="mt-1 space-y-1 pl-3">
                    {item.children.map(
                      (child) => (
                        <Link
                          key={
                            child.href
                          }
                          href={
                            child.href
                          }
                          onClick={
                            closeMobileNavigation
                          }
                          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                            isActive(
                              child.href
                            )
                              ? "bg-zinc-950 font-semibold text-white"
                              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
                          }`}
                        >
                          {
                            child.icon
                          }

                          {
                            child.label
                          }
                        </Link>
                      )
                    )}
                  </div>
                ) : null}
              </div>
            );
          }

          if (!item.href) {
            return null;
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={
                closeMobileNavigation
              }
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                isActive(item.href)
                  ? "bg-zinc-950 text-white"
                  : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
              }`}
            >
              {item.icon}

              {!sidebarCollapsed ||
              mobile
                ? item.label
                : null}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <div className="min-h-dvh bg-zinc-50 text-zinc-950">
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="flex min-h-16 items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={() =>
              setMobileOpen(true)
            }
            className="grid h-10 w-10 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-700 lg:hidden"
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-zinc-950">
              Order Me System by Forza
            </p>

            <p className="truncate text-xs text-zinc-500">
              Human and Technology
              System
            </p>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-700">
              <MapPin size={14} />

              Current Location:

              <span className="text-zinc-950">
                {activeLocation.name}
              </span>
            </div>

            <SwitchLocationButton />

            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-600">
              <ShieldCheck size={14} />

              Secure Session
            </div>

            <LogoutButton />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-zinc-100 px-4 py-2 md:hidden">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-700">
            <MapPin size={14} />

            {activeLocation.name}
          </div>

          <SwitchLocationButton />

          <LogoutButton />
        </div>
      </header>

      <div className="flex">
        <aside
          className={`sticky top-16 hidden h-[calc(100dvh-4rem)] shrink-0 border-r border-zinc-200 bg-white transition-[width] duration-200 lg:flex lg:flex-col ${
            sidebarCollapsed
              ? "w-20"
              : "w-72"
          }`}
        >
          <div className="flex items-center justify-end border-b border-zinc-100 p-3">
            <button
              type="button"
              onClick={() =>
                setSidebarCollapsed(
                  (current) =>
                    !current
                )
              }
              className="grid h-9 w-9 place-items-center rounded-xl border border-zinc-200 text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950"
              aria-label={
                sidebarCollapsed
                  ? "Expand sidebar"
                  : "Collapse sidebar"
              }
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen
                  size={18}
                />
              ) : (
                <PanelLeftClose
                  size={18}
                />
              )}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {renderNavigation()}
          </div>

          {!sidebarCollapsed ? (
            <div className="border-t border-zinc-100 p-4">
              <p className="text-xs font-semibold text-zinc-500">
                {activeLocation.name}
              </p>

              <p className="mt-1 text-[11px] text-zinc-400">
                {activeLocation.code}
              </p>
            </div>
          ) : null}
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>

      <footer className="border-t border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-2 px-4 py-5 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="font-semibold text-zinc-700">
              Order Me System by Forza
            </p>

            <p className="mt-1">
              Human and Technology System
            </p>
          </div>

          <p>
            Developed by Chef Alex
          </p>
        </div>
      </footer>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/25"
            aria-label="Close navigation"
            onClick={() =>
              setMobileOpen(false)
            }
          />

          <aside className="absolute inset-y-0 left-0 flex w-[min(88vw,330px)] flex-col bg-white shadow-2xl">
            <div className="flex min-h-16 items-center justify-between border-b border-zinc-200 px-4">
              <div>
                <p className="text-sm font-bold text-zinc-950">
                  Order Me System
                </p>

                <p className="mt-1 text-xs text-zinc-500">
                  {activeLocation.name}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setMobileOpen(
                    false
                  )
                }
                className="grid h-9 w-9 place-items-center rounded-xl border border-zinc-200 text-zinc-600"
                aria-label="Close navigation"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {renderNavigation(true)}
            </div>

            <div className="space-y-3 border-t border-zinc-200 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700">
                <MapPin size={14} />

                Current Location:
                {activeLocation.name}
              </div>

              <div className="flex flex-wrap gap-2">
                <SwitchLocationButton />

                <LogoutButton />
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}