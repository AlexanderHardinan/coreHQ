import Link from "next/link";

import {
  notFound,
} from "next/navigation";

import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  MapPin,
  Package,
  Pencil,
  Tag,
  Trash2,
} from "lucide-react";

import {
  getWasteEntryById,
  type WasteReason,
} from "@/app/waste/actions";

import AppShell from "@/components/app-shell";

import {
  requireOperationalSession,
} from "@/lib/auth/require-operational-session";

// =========================================================
// TYPES
// =========================================================

type WasteViewPageProps = {
  params: Promise<{
    id: string;
  }>;
};

// =========================================================
// FORMAT QUANTITY
// =========================================================

function formatQuantity(
  value: number
): string {
  if (
    !Number.isFinite(
      value
    )
  ) {
    return "—";
  }

  return new Intl.NumberFormat(
    "en-US",
    {
      minimumFractionDigits:
        0,

      maximumFractionDigits:
        4,
    }
  ).format(value);
}

// =========================================================
// FORMAT DATE
// =========================================================

function formatDate(
  value: string
): string {
  const match =
    value.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (!match) {
    return value;
  }

  const year =
    Number(
      match[1]
    );

  const month =
    Number(
      match[2]
    );

  const day =
    Number(
      match[3]
    );

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en",
    {
      year:
        "numeric",

      month:
        "long",

      day:
        "2-digit",

      timeZone:
        "UTC",
    }
  ).format(date);
}

// =========================================================
// FORMAT DATE TIME
// =========================================================

function formatDateTime(
  value: string
): string {
  const date =
    new Date(
      value
    );

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
      year:
        "numeric",

      month:
        "long",

      day:
        "2-digit",

      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  ).format(date);
}

// =========================================================
// REASON LABEL
// =========================================================

function getReasonLabel(
  reason:
    WasteReason
): string {
  switch (
    reason
  ) {
    case "spoilage":
      return "SPOILAGE — РАСИПУВАЊЕ";

    case "expired":
      return "EXPIRED — ИСТЕЧЕН РОК";

    case "preparation_waste":
      return "PREPARATION WASTE — ОТПАД ОД ПОДГОТОВКА";

    case "excessive_trimming":
      return "EXCESSIVE TRIMMING — ПРЕКУМЕРНО ОТСЕКУВАЊЕ";

    case "overproduction":
      return "OVERPRODUCTION — ПРЕКУМЕРНО ПРОИЗВОДСТВО";

    case "cooking_error":
      return "COOKING ERROR — ГРЕШКА ПРИ ГОТВЕЊЕ";

    case "wrong_order":
      return "WRONG ORDER — ПОГРЕШНА НАРАЧКА";

    case "damage":
      return "DAMAGE — ОШТЕТУВАЊЕ";

    case "plate_waste":
      return "PLATE WASTE — ОТПАД ОД ЧИНИЈА";

    case "staff_meal":
      return "STAFF MEAL — ОБРОК ЗА ВРАБОТЕНИ";

    case "spoiled":
      return "SPOILAGE — РАСИПУВАЊЕ";

    case "bad_quality":
      return "Bad quality (Legacy)";

    case "guest_complaint":
      return "Guest Complaint (Legacy)";

    default:
      return reason;
  }
}

// =========================================================
// REASON CLASSES
// =========================================================

function getReasonClasses(
  reason:
    WasteReason
): string {
  switch (
    reason
  ) {
    case "expired":
      return "border-orange-200 bg-orange-50 text-orange-700";

    case "bad_quality":
      return "border-yellow-200 bg-yellow-50 text-yellow-800";

    case "guest_complaint":
      return "border-red-200 bg-red-50 text-red-700";

    case "spoiled":
    default:
      return "border-zinc-200 bg-zinc-100 text-zinc-700";
  }
}

// =========================================================
// PAGE
// =========================================================

export default async function WasteViewPage({
  params,
}: WasteViewPageProps) {
  // =======================================================
  // VERIFY OPERATIONAL SESSION
  // =======================================================

  const activeLocation =
    await requireOperationalSession();

  // =======================================================
  // READ WASTE ID
  // =======================================================

  const {
    id,
  } =
    await params;

  // =======================================================
  // LOAD LOCATION-SCOPED WASTE ENTRY
  // =======================================================

  const waste =
    await getWasteEntryById(
      id
    );

  if (!waste) {
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
              <Trash2
                size={17}
                className="text-amber-700"
                aria-hidden="true"
              />

              <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">
                Operational Waste Control
              </p>
            </div>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950">
              Waste Entry Details
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              Review the complete historical Waste record for
              the current operational location.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* =============================================
                LOCATION
            ============================================= */}

            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 shadow-sm">
              <MapPin
                size={14}
                aria-hidden="true"
              />

              {
                activeLocation.name
              }

              <span className="text-zinc-400">
                {
                  activeLocation.code
                }
              </span>
            </div>

            {/* =============================================
                REASON
            ============================================= */}

            <span
              className={`inline-flex rounded-full border px-4 py-2 text-xs font-bold ${getReasonClasses(
                waste.reason
              )}`}
            >
              {
                getReasonLabel(
                  waste.reason
                )
              }
            </span>
          </div>
        </section>

        {/* =================================================
            PRIMARY DETAILS
        ================================================= */}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {/* ===============================================
              DATE
          =============================================== */}

          <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-zinc-400">
              <CalendarDays
                size={16}
                aria-hidden="true"
              />

              <p className="text-[10px] font-bold uppercase tracking-[0.12em]">
                Waste Date
              </p>
            </div>

            <p className="mt-3 text-sm font-bold text-zinc-950">
              {
                formatDate(
                  waste.waste_date
                )
              }
            </p>
          </article>

          {/* ===============================================
              PRODUCT
          =============================================== */}

          <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-zinc-400">
              <Package
                size={16}
                aria-hidden="true"
              />

              <p className="text-[10px] font-bold uppercase tracking-[0.12em]">
                Product
              </p>
            </div>

            <p className="mt-3 text-sm font-bold text-zinc-950">
              {
                waste.product_name_snapshot
              }
            </p>
          </article>

          {/* ===============================================
              QUANTITY
          =============================================== */}

          <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-zinc-400">
              <Trash2
                size={16}
                aria-hidden="true"
              />

              <p className="text-[10px] font-bold uppercase tracking-[0.12em]">
                Waste Qty
              </p>
            </div>

            <p className="mt-3 text-sm font-bold text-zinc-950">
              {
                formatQuantity(
                  waste.qty
                )
              }{" "}
              <span className="uppercase">
                {
                  waste.uom_snapshot
                }
              </span>
            </p>
          </article>

          {/* ===============================================
              REASON
          =============================================== */}

          <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-zinc-400">
              <Tag
                size={16}
                aria-hidden="true"
              />

              <p className="text-[10px] font-bold uppercase tracking-[0.12em]">
                Reason
              </p>
            </div>

            <p className="mt-3 text-sm font-bold text-zinc-950">
              {
                getReasonLabel(
                  waste.reason
                )
              }
            </p>
          </article>
        </section>

        {/* =================================================
            PRODUCT INFORMATION
        ================================================= */}

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <h2 className="text-base font-bold text-zinc-950">
              Product Information
            </h2>

            <p className="mt-1 text-sm leading-6 text-zinc-500">
              Historical Product information recorded with
              this Waste entry.
            </p>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {/* =============================================
                SKU
            ============================================= */}

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                SKU
              </p>

              <p className="mt-2 font-mono text-sm font-bold text-zinc-800">
                {
                  waste.sku_snapshot
                }
              </p>
            </div>

            {/* =============================================
                PRODUCT NAME
            ============================================= */}

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                Product Name
              </p>

              <p className="mt-2 text-sm font-semibold text-zinc-800">
                {
                  waste.product_name_snapshot
                }
              </p>
            </div>

            {/* =============================================
                CATEGORY
            ============================================= */}

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                Category
              </p>

              <p className="mt-2 text-sm font-semibold text-zinc-800">
                {
                  waste.category_name_snapshot
                }
              </p>
            </div>

            {/* =============================================
                UOM
            ============================================= */}

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                UOM
              </p>

              <div className="mt-2">
                <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-bold uppercase text-zinc-700">
                  {
                    waste.uom_snapshot
                  }
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================
            WASTE RECORD
        ================================================= */}

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-bold text-zinc-950">
            Waste Record
          </h2>

          <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                Waste Date
              </p>

              <p className="mt-2 text-sm font-semibold text-zinc-800">
                {
                  formatDate(
                    waste.waste_date
                  )
                }
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                Quantity
              </p>

              <p className="mt-2 text-sm font-semibold text-zinc-800">
                {
                  formatQuantity(
                    waste.qty
                  )
                }{" "}
                {
                  waste.uom_snapshot
                }
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                Reason
              </p>

              <div className="mt-2">
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getReasonClasses(
                    waste.reason
                  )}`}
                >
                  {
                    getReasonLabel(
                      waste.reason
                    )
                  }
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================
            SYSTEM INFORMATION
        ================================================= */}

        <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Clock3
              size={16}
              className="text-zinc-400"
              aria-hidden="true"
            />

            <h2 className="text-sm font-bold text-zinc-800">
              Record Information
            </h2>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                Created
              </p>

              <p className="mt-2 text-xs font-semibold text-zinc-600">
                {
                  formatDateTime(
                    waste.created_at
                  )
                }
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                Last Updated
              </p>

              <p className="mt-2 text-xs font-semibold text-zinc-600">
                {
                  formatDateTime(
                    waste.updated_at
                  )
                }
              </p>
            </div>
          </div>
        </section>

        {/* =================================================
            ACTIONS
        ================================================= */}

        <section className="flex flex-col-reverse gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-end sm:p-6">
          <Link
            href="/waste"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
          >
            <ArrowLeft
              size={16}
              aria-hidden="true"
            />

            Back to Waste Data
          </Link>

          <Link
            href={`/waste/${waste.id}/edit`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            <Pencil
              size={16}
              aria-hidden="true"
            />

            Edit Waste
          </Link>
        </section>
      </div>
    </AppShell>
  );
}