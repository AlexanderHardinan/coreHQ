import {
  notFound,
} from "next/navigation";

import {
  ClipboardList,
  MapPin,
  Pencil,
} from "lucide-react";

import {
  getNormalOrderById,
  getNormalOrderProductOptions,
} from "@/app/orders/normal/actions";

import NormalOrderForm from "@/app/orders/normal/normal-order-form";

import AppShell from "@/components/app-shell";

import {
  requireOperationalSession,
} from "@/lib/auth/require-operational-session";

// =========================================================
// TYPES
// =========================================================

type EditNormalOrderPageProps = {
  params: Promise<{
    id: string;
  }>;
};

// =========================================================
// PAGE
// =========================================================

export default async function EditNormalOrderPage({
  params,
}: EditNormalOrderPageProps) {
  // =======================================================
  // VERIFY OPERATIONAL SESSION
  // =======================================================

  const activeLocation =
    await requireOperationalSession();

  // =======================================================
  // READ ORDER ID
  // =======================================================

  const {
    id,
  } = await params;

  // =======================================================
  // LOAD LOCATION-SCOPED NORMAL ORDER
  // =======================================================

  const order =
    await getNormalOrderById(
      id
    );

  if (!order) {
    notFound();
  }

  // =======================================================
  // LOAD CURRENT LOCATION ACTIVE PRODUCTS
  // =======================================================
  //
  // The NormalOrderForm also preserves the Products already
  // attached to the saved order through its historical
  // Product snapshots.
  //
  // New Product selections come from the current active
  // Product catalog for the trusted location.
  // =======================================================

  const productOptions =
    await getNormalOrderProductOptions();

  // =======================================================
  // PAGE
  // =======================================================

  return (
    <AppShell
      activeLocation={
        activeLocation
      }
    >
      <div className="space-y-6">
        {/* =================================================
            PAGE HEADER
        ================================================= */}

        <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Pencil
                size={17}
                className="text-amber-700"
                aria-hidden="true"
              />

              <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">
                Order Management
              </p>
            </div>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950">
              Edit Normal Order
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              Update the Order Date, Ordered By, status,
              Product selection, On Hand quantities, and
              Order Request quantities for{" "}
              <span className="font-mono font-semibold text-zinc-700">
                {order.order_number}
              </span>
              .
            </p>
          </div>

          {/* =================================================
              HEADER INFORMATION
          ================================================= */}

          <div className="flex flex-wrap items-center gap-2">
            {/* =============================================
                ORDER NUMBER
            ============================================= */}

            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 shadow-sm">
              <ClipboardList
                size={14}
                aria-hidden="true"
              />

              <span className="font-mono">
                {order.order_number}
              </span>
            </div>

            {/* =============================================
                LOCATION
            ============================================= */}

            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 shadow-sm">
              <MapPin
                size={14}
                aria-hidden="true"
              />

              {activeLocation.name}

              <span className="text-zinc-400">
                {activeLocation.code}
              </span>
            </div>
          </div>
        </section>

        {/* =================================================
            EDIT NORMAL ORDER FORM
        ================================================= */}

        <NormalOrderForm
          mode="edit"
          initialProductOptions={
            productOptions
          }
          order={
            order
          }
        />
      </div>
    </AppShell>
  );
}