import { notFound } from "next/navigation";
import {
  Hash,
  MapPin,
  Pencil,
} from "lucide-react";

import {
  getCategories,
} from "@/app/categories/actions";

import {
  getProductById,
} from "@/app/products/actions";

import ProductForm from "@/app/products/product-form";

import AppShell from "@/components/app-shell";

import {
  requireOperationalSession,
} from "@/lib/auth/require-operational-session";

// =========================================================
// TYPES
// =========================================================

type EditProductPageProps = {
  params: Promise<{
    id: string;
  }>;
};

// =========================================================
// PAGE
// =========================================================

export default async function EditProductPage({
  params,
}: EditProductPageProps) {
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
  // LOAD CURRENT LOCATION CATEGORIES
  // =======================================================

  const categories =
    await getCategories();

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
                Product Management
              </p>
            </div>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950">
              Edit Product
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              Update the operational details for{" "}
              <span className="font-semibold text-zinc-700">
                {product.name}
              </span>
              . The product SKU and operational location
              remain permanently protected.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* =============================================
                SKU
            ============================================= */}

            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 font-mono text-xs font-semibold text-zinc-700 shadow-sm">
              <Hash
                size={14}
                aria-hidden="true"
              />

              {product.sku}
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
            EDIT FORM
        ================================================= */}

        <ProductForm
          mode="edit"
          categories={
            categories
          }
          product={
            product
          }
        />
      </div>
    </AppShell>
  );
}