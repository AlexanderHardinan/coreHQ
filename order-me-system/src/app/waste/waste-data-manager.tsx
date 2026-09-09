"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import Link from "next/link";

import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  Activity,
  ArrowDownAZ,
  ArrowUpAZ,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import {
  deleteWasteEntryAction,
  type WasteListOptions,
  type WastePerformanceRecord,
  type WasteReason,
  type WasteRecord,
  type WasteUom,
} from "@/app/waste/actions";

import {
  useToast,
} from "@/components/toast-provider";

import {
  createClient,
} from "@/lib/supabase/client";

// =========================================================
// TYPES
// =========================================================

type WasteSortBy =
  NonNullable<
    WasteListOptions["sortBy"]
  >;

type WasteSortDirection =
  NonNullable<
    WasteListOptions["sortDirection"]
  >;

type WasteDataManagerProps = {
  initialWasteEntries:
    WasteRecord[];

  total: number;

  page: number;

  pageSize: number;

  totalPages: number;

  performanceData:
    WastePerformanceRecord[];

  initialSearch: string;

  initialReason:
    | WasteReason
    | "all";

  initialDateFrom:
    string;

  initialDateTo:
    string;

  initialSortBy:
    WasteSortBy;

  initialSortDirection:
    WasteSortDirection;

  locationName: string;

  locationCode:
    | "FOR"
    | "FUS";
};

type QueryChanges =
  Record<
    string,
    string | null
  >;

// =========================================================
// CONSTANTS
// =========================================================

const PAGE_SIZE_OPTIONS = [
  10,
  20,
  50,
  100,
];

const REALTIME_REFRESH_DELAY_MS =
  250;

const SORT_OPTIONS: {
  value: WasteSortBy;
  label: string;
}[] = [
  {
    value:
      "waste_date",
    label:
      "Waste Date",
  },
  {
    value:
      "product_name_snapshot",
    label:
      "Product Name",
  },
  {
    value:
      "qty",
    label:
      "Quantity",
  },
  {
    value:
      "reason",
    label:
      "Reason",
  },
  {
    value:
      "updated_at",
    label:
      "Updated Date",
  },
  {
    value:
      "created_at",
    label:
      "Created Date",
  },
];

const WASTE_REASONS: {
  value:
    | WasteReason
    | "all";
  label: string;
}[] = [
  {
    value:
      "all",
    label:
      "All Reasons",
  },
  {
    value:
      "spoiled",
    label:
      "Spoiled",
  },
  {
    value:
      "expired",
    label:
      "Expired",
  },
  {
    value:
      "bad_quality",
    label:
      "Bad quality",
  },
  {
    value:
      "guest_complaint",
    label:
      "Guest Complaint",
  },
];

// =========================================================
// QUANTITY
// =========================================================

function formatQuantity(
  value: number
): string {
  if (
    !Number.isFinite(
      value
    )
  ) {
    return "0";
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
// DATE
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

  const date =
    new Date(
      Date.UTC(
        Number(
          match[1]
        ),
        Number(
          match[2]
        ) - 1,
        Number(
          match[3]
        )
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
        "short",

      day:
        "2-digit",

      timeZone:
        "UTC",
    }
  ).format(date);
}

// =========================================================
// SHORT DATE
// =========================================================

function formatShortDate(
  value: string
): string {
  const match =
    value.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (!match) {
    return value;
  }

  const date =
    new Date(
      Date.UTC(
        Number(
          match[1]
        ),
        Number(
          match[2]
        ) - 1,
        Number(
          match[3]
        )
      )
    );

  return new Intl.DateTimeFormat(
    "en",
    {
      month:
        "short",

      day:
        "numeric",

      timeZone:
        "UTC",
    }
  ).format(date);
}

// =========================================================
// REASON LABEL
// =========================================================

function getReasonLabel(
  reason: WasteReason
): string {
  switch (
    reason
  ) {
    case "expired":
      return "Expired";

    case "bad_quality":
      return "Bad quality";

    case "guest_complaint":
      return "Guest Complaint";

    case "spoiled":
    default:
      return "Spoiled";
  }
}

// =========================================================
// REASON CLASSES
// =========================================================

function getReasonClasses(
  reason: WasteReason
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
// PERFORMANCE CHART
// =========================================================

function WastePerformanceChart({
  data,
}: {
  data:
    WastePerformanceRecord[];
}) {
  const chart =
    useMemo(
      () => {
        const dates =
          Array.from(
            new Set(
              data.map(
                (
                  row
                ) =>
                  row.waste_date
              )
            )
          ).sort();

        const width =
          900;

        const height =
          300;

        const left =
          58;

        const right =
          30;

        const top =
          26;

        const bottom =
          55;

        const plotWidth =
          width -
          left -
          right;

        const plotHeight =
          height -
          top -
          bottom;

        const maximum =
          Math.max(
            1,
            ...data.map(
              (
                row
              ) =>
                row.total_qty
            )
          );

        const uoms:
          WasteUom[] = [
            "ml",
            "gram",
            "pc",
          ];

        const colors:
          Record<
            WasteUom,
            string
          > = {
          ml:
            "#d97706",

          gram:
            "#18181b",

          pc:
            "#71717a",
        };

        const pointsByUom =
          new Map<
            WasteUom,
            {
              x: number;
              y: number;
              value: number;
              date: string;
            }[]
          >();

        for (
          const uom of
          uoms
        ) {
          const values =
            new Map<
              string,
              number
            >();

          for (
            const row of
            data
          ) {
            if (
              row.uom ===
              uom
            ) {
              values.set(
                row.waste_date,
                row.total_qty
              );
            }
          }

          const points =
            dates.map(
              (
                date,
                index
              ) => {
                const value =
                  values.get(
                    date
                  ) ??
                  0;

                const x =
                  dates.length <=
                  1
                    ? left +
                      plotWidth /
                        2
                    : left +
                      (
                        index /
                        (
                          dates.length -
                          1
                        )
                      ) *
                        plotWidth;

                const y =
                  top +
                  plotHeight -
                  (
                    value /
                    maximum
                  ) *
                    plotHeight;

                return {
                  x,
                  y,
                  value,
                  date,
                };
              }
            );

          pointsByUom.set(
            uom,
            points
          );
        }

        return {
          dates,
          width,
          height,
          left,
          right,
          top,
          bottom,
          plotWidth,
          plotHeight,
          maximum,
          uoms,
          colors,
          pointsByUom,
        };
      },
      [
        data,
      ]
    );

  if (
    chart.dates.length ===
    0
  ) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-6 text-center">
        <div>
          <Activity
            size={28}
            className="mx-auto text-zinc-300"
          />

          <p className="mt-3 text-sm font-semibold text-zinc-700">
            No Waste Performance data
          </p>

          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Waste activity will appear here after entries are
            recorded for the selected period.
          </p>
        </div>
      </div>
    );
  }

  const visibleDateIndexes =
    chart.dates.length <=
      6
      ? chart.dates.map(
          (
            _,
            index
          ) =>
            index
        )
      : Array.from(
          new Set([
            0,
            Math.round(
              (
                chart.dates.length -
                1
              ) *
                0.2
            ),
            Math.round(
              (
                chart.dates.length -
                1
              ) *
                0.4
            ),
            Math.round(
              (
                chart.dates.length -
                1
              ) *
                0.6
            ),
            Math.round(
              (
                chart.dates.length -
                1
              ) *
                0.8
            ),
            chart.dates.length -
              1,
          ])
        );

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-4">
        {chart.uoms.map(
          (
            uom
          ) => (
            <div
              key={
                uom
              }
              className="flex items-center gap-2 text-xs font-semibold text-zinc-600"
            >
              <span
                className="h-2.5 w-2.5 rounded-full shadow-sm"
                style={{
                  backgroundColor:
                    chart.colors[
                      uom
                    ],
                }}
              />

              {
                uom
              }
            </div>
          )
        )}

        <div className="ml-auto inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />

            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
          </span>

          Moving Data
        </div>
      </div>

      <div
        className="overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-b from-white to-zinc-50 p-2 shadow-inner"
        style={{
          perspective:
            "1200px",
        }}
      >
        <div
          className="origin-center transition-transform duration-500"
          style={{
            transform:
              "rotateX(7deg) translateZ(0)",

            transformStyle:
              "preserve-3d",
          }}
        >
          <svg
            viewBox={`0 0 ${chart.width} ${chart.height}`}
            className="h-auto min-h-[270px] w-full overflow-visible"
            role="img"
            aria-label="Waste Performance line chart"
          >
            <defs>
              <linearGradient
                id="waste-chart-floor"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="#ffffff"
                />

                <stop
                  offset="100%"
                  stopColor="#f4f4f5"
                />
              </linearGradient>

              <filter
                id="waste-line-shadow"
                x="-20%"
                y="-20%"
                width="140%"
                height="140%"
              >
                <feDropShadow
                  dx="0"
                  dy="5"
                  stdDeviation="5"
                  floodOpacity="0.16"
                />
              </filter>
            </defs>

            <rect
              x={
                chart.left
              }
              y={
                chart.top
              }
              width={
                chart.plotWidth
              }
              height={
                chart.plotHeight
              }
              rx="12"
              fill="url(#waste-chart-floor)"
            />

            {[
              0,
              1,
              2,
              3,
              4,
            ].map(
              (
                gridIndex
              ) => {
                const y =
                  chart.top +
                  (
                    gridIndex /
                    4
                  ) *
                    chart.plotHeight;

                const value =
                  chart.maximum *
                  (
                    1 -
                    gridIndex /
                      4
                  );

                return (
                  <g
                    key={
                      gridIndex
                    }
                  >
                    <line
                      x1={
                        chart.left
                      }
                      x2={
                        chart.left +
                        chart.plotWidth
                      }
                      y1={
                        y
                      }
                      y2={
                        y
                      }
                      stroke="#e4e4e7"
                      strokeWidth="1"
                      strokeDasharray="4 5"
                    />

                    <text
                      x={
                        chart.left -
                        10
                      }
                      y={
                        y +
                        4
                      }
                      textAnchor="end"
                      fontSize="10"
                      fill="#a1a1aa"
                    >
                      {
                        formatQuantity(
                          value
                        )
                      }
                    </text>
                  </g>
                );
              }
            )}

            {visibleDateIndexes.map(
              (
                index
              ) => {
                const date =
                  chart.dates[
                    index
                  ];

                const x =
                  chart.dates.length <=
                    1
                    ? chart.left +
                      chart.plotWidth /
                        2
                    : chart.left +
                      (
                        index /
                        (
                          chart.dates.length -
                          1
                        )
                      ) *
                        chart.plotWidth;

                return (
                  <text
                    key={
                      `${date}-${index}`
                    }
                    x={
                      x
                    }
                    y={
                      chart.height -
                      23
                    }
                    textAnchor="middle"
                    fontSize="10"
                    fill="#71717a"
                  >
                    {
                      formatShortDate(
                        date
                      )
                    }
                  </text>
                );
              }
            )}

            {chart.uoms.map(
              (
                uom
              ) => {
                const points =
                  chart.pointsByUom.get(
                    uom
                  ) ??
                  [];

                if (
                  points.length ===
                  0
                ) {
                  return null;
                }

                const path =
                  points
                    .map(
                      (
                        point,
                        index
                      ) =>
                        `${
                          index ===
                            0
                            ? "M"
                            : "L"
                        } ${point.x.toFixed(
                          2
                        )} ${point.y.toFixed(
                          2
                        )}`
                    )
                    .join(
                      " "
                    );

                const color =
                  chart.colors[
                    uom
                  ];

                return (
                  <g
                    key={
                      uom
                    }
                  >
                    <path
                      d={
                        path
                      }
                      fill="none"
                      stroke="#18181b"
                      strokeOpacity="0.08"
                      strokeWidth="8"
                      transform="translate(0 7)"
                    />

                    <path
                      d={
                        path
                      }
                      fill="none"
                      stroke={
                        color
                      }
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter="url(#waste-line-shadow)"
                    />

                    <path
                      d={
                        path
                      }
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeDasharray="10 20"
                      opacity="0.85"
                    >
                      <animate
                        attributeName="stroke-dashoffset"
                        from="0"
                        to="-60"
                        dur="1.6s"
                        repeatCount="indefinite"
                      />
                    </path>

                    {points.map(
                      (
                        point,
                        pointIndex
                      ) => (
                        <g
                          key={`${uom}-${point.date}-${pointIndex}`}
                        >
                          <circle
                            cx={
                              point.x
                            }
                            cy={
                              point.y
                            }
                            r="7"
                            fill={
                              color
                            }
                            opacity="0.12"
                          >
                            <animate
                              attributeName="r"
                              values="5;9;5"
                              dur="2.4s"
                              begin={`${pointIndex * 0.12}s`}
                              repeatCount="indefinite"
                            />

                            <animate
                              attributeName="opacity"
                              values="0.08;0.22;0.08"
                              dur="2.4s"
                              begin={`${pointIndex * 0.12}s`}
                              repeatCount="indefinite"
                            />
                          </circle>

                          <circle
                            cx={
                              point.x
                            }
                            cy={
                              point.y
                            }
                            r="3.4"
                            fill="#ffffff"
                            stroke={
                              color
                            }
                            strokeWidth="2"
                          >
                            <title>
                              {`${formatDate(
                                point.date
                              )}: ${formatQuantity(
                                point.value
                              )} ${uom}`}
                            </title>
                          </circle>
                        </g>
                      )
                    )}
                  </g>
                );
              }
            )}
          </svg>
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-5 text-zinc-400">
        Waste quantities are tracked separately by Product
        UOM. ml, gram, and pc are never combined into one
        artificial quantity.
      </p>
    </div>
  );
}

// =========================================================
// COMPONENT
// =========================================================

export default function WasteDataManager({
  initialWasteEntries,

  total,

  page,

  pageSize,

  totalPages,

  performanceData,

  initialSearch,

  initialReason,

  initialDateFrom,

  initialDateTo,

  initialSortBy,

  initialSortDirection,

  locationName,

  locationCode,
}: WasteDataManagerProps) {
  const router =
    useRouter();

  const pathname =
    usePathname();

  const searchParams =
    useSearchParams();

  const toast =
    useToast();

  // =======================================================
  // SUPABASE BROWSER CLIENT
  // =======================================================

  const supabase =
    useMemo(
      () =>
        createClient(),
      []
    );

  // =======================================================
  // REALTIME REFRESH TIMER
  // =======================================================

  const realtimeRefreshTimerRef =
    useRef<
      number | null
    >(
      null
    );

  const [
    wasteEntries,
    setWasteEntries,
  ] =
    useState<
      WasteRecord[]
    >(
      initialWasteEntries
    );

  const [
    searchValue,
    setSearchValue,
  ] =
    useState(
      initialSearch
    );

  const [
    deletingWasteId,
    setDeletingWasteId,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    isDeleting,
    startDeleteTransition,
  ] =
    useTransition();

  // =======================================================
  // SYNC SERVER DATA
  // =======================================================

  useEffect(
    () => {
      setWasteEntries(
        initialWasteEntries
      );
    },
    [
      initialWasteEntries,
    ]
  );

  useEffect(
    () => {
      setSearchValue(
        initialSearch
      );
    },
    [
      initialSearch,
    ]
  );

  // =======================================================
  // WASTE REALTIME
  // =======================================================
  //
  // Database trigger:
  //
  // public.broadcast_waste_change()
  //
  // Topics:
  //
  // order-me:waste:FOR
  // order-me:waste:FUS
  //
  // The browser receives only an invalidation signal.
  //
  // It never reads waste_entries directly.
  //
  // Actual Waste data is reloaded through the secure
  // Next.js server layer when router.refresh() runs.
  //
  // A short debounce collapses multiple database events
  // occurring inside the same operational transaction into
  // a single server refresh.
  //
  // =======================================================

  useEffect(
    () => {
      const topic =
        `order-me:waste:${locationCode}`;

      const scheduleRefresh =
        () => {
          if (
            realtimeRefreshTimerRef.current !==
            null
          ) {
            window.clearTimeout(
              realtimeRefreshTimerRef.current
            );
          }

          realtimeRefreshTimerRef.current =
            window.setTimeout(
              () => {
                realtimeRefreshTimerRef.current =
                  null;

                router.refresh();
              },
              REALTIME_REFRESH_DELAY_MS
            );
        };

      const channel =
        supabase
          .channel(
            topic
          )
          .on(
            "broadcast",
            {
              event:
                "changed",
            },
            () => {
              scheduleRefresh();
            }
          )
          .subscribe(
            (
              status
            ) => {
              if (
                status ===
                  "CHANNEL_ERROR" ||
                status ===
                  "TIMED_OUT"
              ) {
                console.error(
                  `Order Me Waste realtime channel failed: ${topic} (${status})`
                );
              }
            }
          );

      return () => {
        if (
          realtimeRefreshTimerRef.current !==
          null
        ) {
          window.clearTimeout(
            realtimeRefreshTimerRef.current
          );

          realtimeRefreshTimerRef.current =
            null;
        }

        void supabase.removeChannel(
          channel
        );
      };
    },
    [
      locationCode,
      router,
      supabase,
    ]
  );

  // =======================================================
  // QUERY UPDATE
  // =======================================================

  const updateQuery =
    useCallback(
      (
        changes:
          QueryChanges
      ) => {
        const params =
          new URLSearchParams(
            searchParams.toString()
          );

        for (
          const [
            key,
            value,
          ] of Object.entries(
            changes
          )
        ) {
          if (
            value ===
              null ||
            value ===
              ""
          ) {
            params.delete(
              key
            );
          } else {
            params.set(
              key,
              value
            );
          }
        }

        const query =
          params.toString();

        router.replace(
          query
            ? `${pathname}?${query}`
            : pathname,
          {
            scroll:
              false,
          }
        );
      },
      [
        pathname,
        router,
        searchParams,
      ]
    );

  // =======================================================
  // DEBOUNCED SEARCH
  // =======================================================

  useEffect(
    () => {
      const normalized =
        searchValue
          .trim()
          .replace(
            /\s+/g,
            " "
          );

      if (
        normalized ===
        initialSearch
      ) {
        return;
      }

      const timeout =
        window.setTimeout(
          () => {
            updateQuery({
              search:
                normalized ||
                null,

              page:
                "1",
            });
          },
          350
        );

      return () => {
        window.clearTimeout(
          timeout
        );
      };
    },
    [
      initialSearch,
      searchValue,
      updateQuery,
    ]
  );

  // =======================================================
  // PDF URL
  // =======================================================

  const pdfUrl =
    useMemo(
      () => {
        const params =
          new URLSearchParams();

        if (
          initialSearch
        ) {
          params.set(
            "search",
            initialSearch
          );
        }

        if (
          initialReason !==
          "all"
        ) {
          params.set(
            "reason",
            initialReason
          );
        }

        if (
          initialDateFrom
        ) {
          params.set(
            "dateFrom",
            initialDateFrom
          );
        }

        if (
          initialDateTo
        ) {
          params.set(
            "dateTo",
            initialDateTo
          );
        }

        const query =
          params.toString();

        return query
          ? `/api/waste/pdf?${query}`
          : "/api/waste/pdf";
      },
      [
        initialDateFrom,
        initialDateTo,
        initialReason,
        initialSearch,
      ]
    );

  // =======================================================
  // REASON FILTER
  // =======================================================

  function handleReasonChange(
    value:
      | WasteReason
      | "all"
  ) {
    updateQuery({
      reason:
        value ===
        "all"
          ? null
          : value,

      page:
        "1",
    });
  }

  // =======================================================
  // DATE FILTER
  // =======================================================

  function handleDateFromChange(
    value: string
  ) {
    updateQuery({
      dateFrom:
        value ||
        null,

      page:
        "1",
    });
  }

  function handleDateToChange(
    value: string
  ) {
    updateQuery({
      dateTo:
        value ||
        null,

      page:
        "1",
    });
  }

  // =======================================================
  // SORT
  // =======================================================

  function handleSortByChange(
    value:
      WasteSortBy
  ) {
    updateQuery({
      sortBy:
        value,

      page:
        "1",
    });
  }

  function toggleSortDirection() {
    updateQuery({
      sortDirection:
        initialSortDirection ===
        "asc"
          ? "desc"
          : "asc",

      page:
        "1",
    });
  }

  // =======================================================
  // PAGE SIZE
  // =======================================================

  function handlePageSizeChange(
    value: number
  ) {
    updateQuery({
      pageSize:
        String(
          value
        ),

      page:
        "1",
    });
  }

  // =======================================================
  // PAGINATION
  // =======================================================

  function goToPage(
    nextPage: number
  ) {
    if (
      nextPage <
        1 ||
      (
        totalPages >
          0 &&
        nextPage >
          totalPages
      )
    ) {
      return;
    }

    updateQuery({
      page:
        String(
          nextPage
        ),
    });
  }

  // =======================================================
  // RESET FILTERS
  // =======================================================

  function resetFilters() {
    setSearchValue(
      ""
    );

    router.replace(
      pathname,
      {
        scroll:
          false,
      }
    );
  }

  // =======================================================
  // DELETE CONFIRMATION
  // =======================================================

  function requestDelete(
    wasteId: string
  ) {
    if (
      isDeleting
    ) {
      return;
    }

    setDeletingWasteId(
      wasteId
    );
  }

  function cancelDelete() {
    if (
      isDeleting
    ) {
      return;
    }

    setDeletingWasteId(
      null
    );
  }

  // =======================================================
  // DELETE
  // =======================================================

  function confirmDelete(
    waste:
      WasteRecord
  ) {
    if (
      isDeleting
    ) {
      return;
    }

    startDeleteTransition(
      async () => {
        const loadingToast =
          toast.deleting(
            "Deleting Waste Entry",
            `${waste.product_name_snapshot} · ${formatQuantity(
              waste.qty
            )} ${waste.uom_snapshot}`
          );

        const result =
          await deleteWasteEntryAction(
            waste.id
          );

        toast.dismissToast(
          loadingToast
        );

        if (
          !result.success
        ) {
          setDeletingWasteId(
            null
          );

          toast.error(
            "Unable to Delete Waste",
            result.message
          );

          return;
        }

        setWasteEntries(
          (
            current
          ) =>
            current.filter(
              (
                item
              ) =>
                item.id !==
                waste.id
            )
        );

        setDeletingWasteId(
          null
        );

        toast.success(
          "Waste Entry Deleted",
          result.message
        );

        if (
          wasteEntries.length ===
            1 &&
          page >
            1
        ) {
          updateQuery({
            page:
              String(
                page -
                1
              ),
          });

          return;
        }

        router.refresh();
      }
    );
  }

  // =======================================================
  // RANGE INFORMATION
  // =======================================================

  const rangeStart =
    total ===
      0
      ? 0
      : (
          page -
          1
        ) *
          pageSize +
        1;

  const rangeEnd =
    total ===
      0
      ? 0
      : Math.min(
          page *
            pageSize,
          total
        );

  const hasActiveFilters =
    Boolean(
      initialSearch ||
        initialReason !==
          "all" ||
        initialDateFrom ||
        initialDateTo ||
        initialSortBy !==
          "waste_date" ||
        initialSortDirection !==
          "desc" ||
        pageSize !==
          20
    );

  // =======================================================
  // UI
  // =======================================================

  return (
    <div className="space-y-6">
      {/* ===================================================
          PERFORMANCE
      =================================================== */}

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Activity
                size={18}
                className="text-amber-700"
                aria-hidden="true"
              />

              <h2 className="text-base font-bold text-zinc-950">
                Waste Performance Data
              </h2>
            </div>

            <p className="mt-1 text-sm text-zinc-500">
              Waste movement by date for {
                locationName
              }.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-600">
            {
              locationCode
            }
          </div>
        </div>

        <WastePerformanceChart
          data={
            performanceData
          }
        />
      </section>

      {/* ===================================================
          TOOLBAR
      =================================================== */}

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-bold text-zinc-950">
                Waste Records
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Search, filter, export, and manage recorded
                Product waste.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <a
                href={
                  pdfUrl
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
              >
                <Download
                  size={16}
                  aria-hidden="true"
                />

                Export PDF
              </a>

              <Link
                href="/waste/new"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                <Plus
                  size={17}
                  aria-hidden="true"
                />

                Add Waste
              </Link>
            </div>
          </div>

          <div className="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_180px_170px_170px_180px_auto]">
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
                aria-hidden="true"
              />

              <input
                type="search"
                value={
                  searchValue
                }
                onChange={(
                  event
                ) =>
                  setSearchValue(
                    event.target.value
                  )
                }
                placeholder="Search Product, SKU, Category"
                className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-10 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400"
              />

              {searchValue ? (
                <button
                  type="button"
                  onClick={() =>
                    setSearchValue(
                      ""
                    )
                  }
                  className="absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                  aria-label="Clear search"
                >
                  <X
                    size={14}
                  />
                </button>
              ) : null}
            </div>

            <select
              value={
                initialReason
              }
              onChange={(
                event
              ) =>
                handleReasonChange(
                  event.target.value as
                    | WasteReason
                    | "all"
                )
              }
              className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 outline-none transition focus:border-zinc-400"
              aria-label="Waste reason filter"
            >
              {WASTE_REASONS.map(
                (
                  reason
                ) => (
                  <option
                    key={
                      reason.value
                    }
                    value={
                      reason.value
                    }
                  >
                    {
                      reason.label
                    }
                  </option>
                )
              )}
            </select>

            <label className="relative">
              <CalendarDays
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />

              <input
                type="date"
                value={
                  initialDateFrom
                }
                onChange={(
                  event
                ) =>
                  handleDateFromChange(
                    event.target.value
                  )
                }
                className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-2 text-xs font-medium text-zinc-700 outline-none transition focus:border-zinc-400"
                aria-label="Waste date from"
              />
            </label>

            <label className="relative">
              <CalendarDays
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />

              <input
                type="date"
                value={
                  initialDateTo
                }
                onChange={(
                  event
                ) =>
                  handleDateToChange(
                    event.target.value
                  )
                }
                className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-2 text-xs font-medium text-zinc-700 outline-none transition focus:border-zinc-400"
                aria-label="Waste date to"
              />
            </label>

            <select
              value={
                initialSortBy
              }
              onChange={(
                event
              ) =>
                handleSortByChange(
                  event.target.value as
                    WasteSortBy
                )
              }
              className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 outline-none transition focus:border-zinc-400"
              aria-label="Sort Waste Data"
            >
              {SORT_OPTIONS.map(
                (
                  option
                ) => (
                  <option
                    key={
                      option.value
                    }
                    value={
                      option.value
                    }
                  >
                    {
                      option.label
                    }
                  </option>
                )
              )}
            </select>

            <button
              type="button"
              onClick={
                toggleSortDirection
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
              aria-label="Toggle sort direction"
            >
              {initialSortDirection ===
              "asc" ? (
                <ArrowUpAZ
                  size={16}
                />
              ) : (
                <ArrowDownAZ
                  size={16}
                />
              )}

              <span className="xl:hidden">
                {initialSortDirection ===
                "asc"
                  ? "Ascending"
                  : "Descending"}
              </span>
            </button>
          </div>

          {hasActiveFilters ? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={
                  resetFilters
                }
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 transition hover:text-zinc-950"
              >
                <X
                  size={14}
                />

                Reset filters
              </button>
            </div>
          ) : null}
        </div>
      </section>

      {/* ===================================================
          DESKTOP TABLE
      =================================================== */}

      <section className="hidden overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm lg:block">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="border-b border-zinc-200 bg-zinc-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Date
                </th>

                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-zinc-500">
                  SKU
                </th>

                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Product
                </th>

                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Category
                </th>

                <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Qty
                </th>

                <th className="px-5 py-3 text-center text-xs font-bold uppercase tracking-wide text-zinc-500">
                  UOM
                </th>

                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Reason
                </th>

                <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-100">
              {wasteEntries.length ===
              0 ? (
                <tr>
                  <td
                    colSpan={
                      8
                    }
                    className="px-6 py-16 text-center"
                  >
                    <Trash2
                      size={28}
                      className="mx-auto text-zinc-300"
                    />

                    <p className="mt-3 text-sm font-semibold text-zinc-700">
                      No Waste Data found
                    </p>

                    <p className="mt-1 text-xs text-zinc-500">
                      Add a Waste entry or adjust your filters.
                    </p>
                  </td>
                </tr>
              ) : (
                wasteEntries.map(
                  (
                    waste
                  ) => {
                    const confirmingDelete =
                      deletingWasteId ===
                      waste.id;

                    return (
                      <tr
                        key={
                          waste.id
                        }
                        className="transition hover:bg-zinc-50/70"
                      >
                        <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-zinc-700">
                          {
                            formatDate(
                              waste.waste_date
                            )
                          }
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-xs font-semibold text-zinc-500">
                          {
                            waste.sku_snapshot
                          }
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-bold text-zinc-950">
                            {
                              waste.product_name_snapshot
                            }
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm text-zinc-600">
                          {
                            waste.category_name_snapshot
                          }
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-bold text-zinc-950">
                          {
                            formatQuantity(
                              waste.qty
                            )
                          }
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-center text-xs font-bold uppercase text-zinc-600">
                          {
                            waste.uom_snapshot
                          }
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${getReasonClasses(
                              waste.reason
                            )}`}
                          >
                            {
                              getReasonLabel(
                                waste.reason
                              )
                            }
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          {confirmingDelete ? (
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  confirmDelete(
                                    waste
                                  )
                                }
                                disabled={
                                  isDeleting
                                }
                                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-red-600 px-3 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isDeleting ? (
                                  <Loader2
                                    size={14}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <Trash2
                                    size={14}
                                  />
                                )}

                                Confirm
                              </button>

                              <button
                                type="button"
                                onClick={
                                  cancelDelete
                                }
                                disabled={
                                  isDeleting
                                }
                                className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-1">
                              <Link
                                href={`/waste/${waste.id}`}
                                className="grid h-9 w-9 place-items-center rounded-xl text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950"
                                aria-label="View Waste entry"
                              >
                                <Eye
                                  size={16}
                                />
                              </Link>

                              <Link
                                href={`/waste/${waste.id}/edit`}
                                className="grid h-9 w-9 place-items-center rounded-xl text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950"
                                aria-label="Edit Waste entry"
                              >
                                <Pencil
                                  size={16}
                                />
                              </Link>

                              <button
                                type="button"
                                onClick={() =>
                                  requestDelete(
                                    waste.id
                                  )
                                }
                                className="grid h-9 w-9 place-items-center rounded-xl text-zinc-500 transition hover:bg-red-50 hover:text-red-700"
                                aria-label="Delete Waste entry"
                              >
                                <Trash2
                                  size={16}
                                />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  }
                )
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ===================================================
          MOBILE / TABLET
      =================================================== */}

      <section className="space-y-3 lg:hidden">
        {wasteEntries.length ===
        0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-12 text-center shadow-sm">
            <Trash2
              size={28}
              className="mx-auto text-zinc-300"
            />

            <p className="mt-3 text-sm font-semibold text-zinc-700">
              No Waste Data found
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              Add a Waste entry or adjust your filters.
            </p>
          </div>
        ) : (
          wasteEntries.map(
            (
              waste
            ) => {
              const confirmingDelete =
                deletingWasteId ===
                waste.id;

              return (
                <article
                  key={
                    waste.id
                  }
                  className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-zinc-950">
                        {
                          waste.product_name_snapshot
                        }
                      </p>

                      <p className="mt-1 text-xs font-semibold text-zinc-400">
                        {
                          waste.sku_snapshot
                        }
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${getReasonClasses(
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

                  <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-zinc-50 p-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                        Date
                      </p>

                      <p className="mt-1 text-xs font-semibold text-zinc-700">
                        {
                          formatDate(
                            waste.waste_date
                          )
                        }
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                        Waste Qty
                      </p>

                      <p className="mt-1 text-xs font-bold text-zinc-950">
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

                    <div className="col-span-2">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                        Category
                      </p>

                      <p className="mt-1 text-xs font-semibold text-zinc-700">
                        {
                          waste.category_name_snapshot
                        }
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    {confirmingDelete ? (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            confirmDelete(
                              waste
                            )
                          }
                          disabled={
                            isDeleting
                          }
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-red-600 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          {isDeleting ? (
                            <Loader2
                              size={14}
                              className="animate-spin"
                            />
                          ) : (
                            <Trash2
                              size={14}
                            />
                          )}

                          Confirm Delete
                        </button>

                        <button
                          type="button"
                          onClick={
                            cancelDelete
                          }
                          disabled={
                            isDeleting
                          }
                          className="h-10 rounded-xl border border-zinc-200 bg-white text-xs font-semibold text-zinc-600 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        <Link
                          href={`/waste/${waste.id}`}
                          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white text-xs font-semibold text-zinc-600"
                        >
                          <Eye
                            size={14}
                          />

                          View
                        </Link>

                        <Link
                          href={`/waste/${waste.id}/edit`}
                          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white text-xs font-semibold text-zinc-600"
                        >
                          <Pencil
                            size={14}
                          />

                          Edit
                        </Link>

                        <button
                          type="button"
                          onClick={() =>
                            requestDelete(
                              waste.id
                            )
                          }
                          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-red-100 bg-red-50 text-xs font-semibold text-red-700"
                        >
                          <Trash2
                            size={14}
                          />

                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            }
          )
        )}
      </section>

      {/* ===================================================
          PAGINATION
      =================================================== */}

      <section className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs text-zinc-500">
            Showing{" "}
            <span className="font-bold text-zinc-700">
              {
                rangeStart
              }
            </span>
            {" - "}
            <span className="font-bold text-zinc-700">
              {
                rangeEnd
              }
            </span>
            {" of "}
            <span className="font-bold text-zinc-700">
              {
                total
              }
            </span>
          </p>

          <select
            value={
              pageSize
            }
            onChange={(
              event
            ) =>
              handlePageSizeChange(
                Number(
                  event.target.value
                )
              )
            }
            className="h-9 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-600 outline-none"
            aria-label="Waste entries per page"
          >
            {PAGE_SIZE_OPTIONS.map(
              (
                size
              ) => (
                <option
                  key={
                    size
                  }
                  value={
                    size
                  }
                >
                  {size} per page
                </option>
              )
            )}
          </select>
        </div>

        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <button
            type="button"
            onClick={() =>
              goToPage(
                page -
                1
              )
            }
            disabled={
              page <=
              1
            }
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft
              size={14}
            />

            Previous
          </button>

          <span className="px-2 text-xs font-semibold text-zinc-500">
            Page{" "}
            {
              totalPages ===
                0
                ? 0
                : page
            }{" "}
            of{" "}
            {
              totalPages
            }
          </span>

          <button
            type="button"
            onClick={() =>
              goToPage(
                page +
                1
              )
            }
            disabled={
              totalPages ===
                0 ||
              page >=
                totalPages
            }
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next

            <ChevronRight
              size={14}
            />
          </button>
        </div>
      </section>
    </div>
  );
}