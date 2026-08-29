import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Box,
  CalendarDays,
  Hash,
  Layers3,
  MapPin,
  Package,
  Pencil,
  Ruler,
  Tag,
} from "lucide-react";

import {
  getProductById,
} from "@/app/products/actions";

import AppShell from "@/components/app-shell";

import {
  requireOperationalSession,
} from "@/lib/auth/require-operational-session";

// =========================================================
// TYPES
// =========================================================

type ProductViewPageProps = {
  params: Promise<{
    id: string;
  }>;
};

// =========================================================
// FORMATTERS
// =========================================================

function formatQuantity(
  value: number
): string {
  if (
    !Number.isFinite(value)
  ) {
    return "—";
  }

  return new Intl.NumberFormat(
    "en-US",
    {
      maximumFractionDigits: 4,
    }
  ).format(value);
}

function formatDateTime(
  value: string
): string {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en",
    {
      year: "numeric",
      month: "long",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
}

// =========================================================
// PAGE
// =========================================================

export default async function ProductViewPage({
  params,
}: ProductViewPageProps) {
  // =======================================================
  // VERIFY OPERATIONAL SESSION
  // =======================================================

  const activeLocation =
    await requireOperationalSession();

  // =======================================================
  // READ PRODUCT ID
  // =======================================================

  const {
    id,
  } = await params;

  // =======================================================
  // LOAD LOCATION-SCOPED PRODUCT
  // =======================================================

  const product =
    await getProductById(
      id
    );

  if (!product) {
    notFound();
  }

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
              <Package
                size={17}
                className="text-amber-700"
                aria-hidden="true"
              />

              <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">
                Product Management
              </p>
            </div>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950">
              Product Details
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              Review the complete operational details for this
              product.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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

            <span
              className={`inline-flex rounded-full px-4 py-2 text-xs font-semibold ${
                product.is_active
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-zinc-100 text-zinc-500"
              }`}
            >
              {product.is_active
                ? "Active"
                : "Inactive"}
            </span>
          </div>
        </section>

        {/* =================================================
            PRODUCT IDENTITY
        ================================================= */}

        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 p-5 sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-zinc-950 text-white">
                  <Package
                    size={24}
                    aria-hidden="true"
                  />
                </div>

                <div className="min-w-0">
                  <h2 className="truncate text-xl font-bold text-zinc-950">
                    {product.name}
                  </h2>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 px-2.5 py-1.5 font-mono text-xs font-bold text-zinc-700">
                      <Hash
                        size={13}
                        aria-hidden="true"
                      />

                      {product.sku}
                    </span>

                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800">
                      <Tag
                        size={13}
                        aria-hidden="true"
                      />

                      {product.category_name}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                <Link
                  href="/products"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                >
                  <ArrowLeft
                    size={16}
                    aria-hidden="true"
                  />

                  Back
                </Link>

                <Link
                  href={`/products/${product.id}/edit`}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
                >
                  <Pencil
                    size={15}
                    aria-hidden="true"
                  />

                  Edit Product
                </Link>
              </div>
            </div>
          </div>

          {/* =================================================
              DETAILS GRID
          ================================================= */}

          <div className="grid gap-px bg-zinc-200 sm:grid-cols-2 xl:grid-cols-4">
            {/* ===============================================
                SKU
            =============================================== */}

            <div className="bg-white p-5 sm:p-6">
              <div className="flex items-center gap-2 text-zinc-400">
                <Hash
                  size={16}
                  aria-hidden="true"
                />

                <p className="text-xs font-bold uppercase tracking-[0.12em]">
                  SKU
                </p>
              </div>

              <p className="mt-3 break-all font-mono text-sm font-bold text-zinc-950">
                {product.sku}
              </p>

              <p className="mt-1 text-xs text-zinc-400">
                System generated
              </p>
            </div>

            {/* ===============================================
                CATEGORY
            =============================================== */}

            <div className="bg-white p-5 sm:p-6">
              <div className="flex items-center gap-2 text-zinc-400">
                <Tag
                  size={16}
                  aria-hidden="true"
                />

                <p className="text-xs font-bold uppercase tracking-[0.12em]">
                  Category
                </p>
              </div>

              <p className="mt-3 text-sm font-bold text-zinc-950">
                {product.category_name}
              </p>

              <p className="mt-1 text-xs text-zinc-400">
                Product classification
              </p>
            </div>

            {/* ===============================================
                LOCATION
            =============================================== */}

            <div className="bg-white p-5 sm:p-6">
              <div className="flex items-center gap-2 text-zinc-400">
                <MapPin
                  size={16}
                  aria-hidden="true"
                />

                <p className="text-xs font-bold uppercase tracking-[0.12em]">
                  Location
                </p>
              </div>

              <p className="mt-3 text-sm font-bold text-zinc-950">
                {activeLocation.name}
              </p>

              <p className="mt-1 text-xs text-zinc-400">
                {activeLocation.code}
              </p>
            </div>

            {/* ===============================================
                STATUS
            =============================================== */}

            <div className="bg-white p-5 sm:p-6">
              <div className="flex items-center gap-2 text-zinc-400">
                <Box
                  size={16}
                  aria-hidden="true"
                />

                <p className="text-xs font-bold uppercase tracking-[0.12em]">
                  Status
                </p>
              </div>

              <div className="mt-3">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                    product.is_active
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  {product.is_active
                    ? "Active"
                    : "Inactive"}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================
            QUANTITY + PACKAGING
        ================================================= */}

        <div className="grid gap-6 xl:grid-cols-2">
          {/* ===============================================
              PRODUCT QUANTITY
          =============================================== */}

          <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-200 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-zinc-100 text-zinc-700">
                  <Ruler
                    size={18}
                    aria-hidden="true"
                  />
                </div>

                <div>
                  <h2 className="text-base font-bold text-zinc-950">
                    Product Quantity
                  </h2>

                  <p className="mt-1 text-sm text-zinc-500">
                    Base amount and measurement unit.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-px bg-zinc-200">
              <div className="bg-white p-5 sm:p-6">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-400">
                  Amount QTY
                </p>

                <p className="mt-3 text-2xl font-bold tracking-tight text-zinc-950">
                  {formatQuantity(
                    product.amount_qty
                  )}
                </p>
              </div>

              <div className="bg-white p-5 sm:p-6">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-400">
                  UOM
                </p>

                <p className="mt-3 text-2xl font-bold tracking-tight text-zinc-950">
                  {product.uom}
                </p>
              </div>
            </div>
          </section>

          {/* ===============================================
              PACKAGING
          =============================================== */}

          <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-200 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-zinc-100 text-zinc-700">
                  <Layers3
                    size={18}
                    aria-hidden="true"
                  />
                </div>

                <div>
                  <h2 className="text-base font-bold text-zinc-950">
                    Packaging
                  </h2>

                  <p className="mt-1 text-sm text-zinc-500">
                    Ordering and packaging configuration.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-px bg-zinc-200">
              <div className="bg-white p-5 sm:p-6">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-400">
                  Packaging Size
                </p>

                <p className="mt-3 text-2xl font-bold tracking-tight text-zinc-950">
                  {formatQuantity(
                    product.packaging_size_amount
                  )}
                </p>
              </div>

              <div className="bg-white p-5 sm:p-6">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-400">
                  Packaging UOM
                </p>

                <p className="mt-3 text-2xl font-bold capitalize tracking-tight text-zinc-950">
                  {product.packaging_uom}
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* =================================================
            RECORD INFORMATION
        ================================================= */}

        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-zinc-100 text-zinc-700">
                <CalendarDays
                  size={18}
                  aria-hidden="true"
                />
              </div>

              <div>
                <h2 className="text-base font-bold text-zinc-950">
                  Record Information
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  System timestamps for this product record.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-px bg-zinc-200 sm:grid-cols-2">
            <div className="bg-white p-5 sm:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-400">
                Created
              </p>

              <p className="mt-3 text-sm font-semibold text-zinc-800">
                {formatDateTime(
                  product.created_at
                )}
              </p>
            </div>

            <div className="bg-white p-5 sm:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-400">
                Last Updated
              </p>

              <p className="mt-3 text-sm font-semibold text-zinc-800">
                {formatDateTime(
                  product.updated_at
                )}
              </p>
            </div>
          </div>
        </section>

        {/* =================================================
            BOTTOM ACTIONS
        ================================================= */}

        <section className="flex flex-col-reverse gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-end sm:p-6">
          <Link
            href="/products"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
          >
            <ArrowLeft
              size={16}
              aria-hidden="true"
            />

            Back to Product List
          </Link>

          <Link
            href={`/products/${product.id}/edit`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            <Pencil
              size={16}
              aria-hidden="true"
            />

            Edit Product
          </Link>
        </section>
      </div>
    </AppShell>
  );
}