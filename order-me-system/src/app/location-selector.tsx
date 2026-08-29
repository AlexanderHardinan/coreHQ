"use client";

import {
  useActionState,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Loader2,
  MapPin,
} from "lucide-react";

import {
  selectLocationAction,
  type SelectLocationActionResult,
} from "@/app/actions/location";

type LocationCode = "FOR" | "FUS";

type LocationOption = {
  code: LocationCode;
  name: "Forza" | "Fusion";
  description: string;
};

const LOCATIONS: LocationOption[] = [
  {
    code: "FOR",
    name: "Forza",
    description:
      "Enter the Forza operational workspace.",
  },
  {
    code: "FUS",
    name: "Fusion",
    description:
      "Enter the Fusion operational workspace.",
  },
];

const INITIAL_STATE: SelectLocationActionResult | null =
  null;

export default function LocationSelector() {
  const router = useRouter();

  const [selectedCode, setSelectedCode] =
    useState<LocationCode | null>(null);

  const [state, formAction, isPending] =
    useActionState(
      selectLocationAction,
      INITIAL_STATE
    );

  useEffect(() => {
    if (!state?.success) {
      return;
    }

    router.refresh();
  }, [router, state]);

  return (
    <div className="w-full">
      <div className="grid gap-4 sm:grid-cols-2">
        {LOCATIONS.map((location) => {
          const isSelecting =
            isPending &&
            selectedCode === location.code;

          const isSelected =
            state?.success &&
            state.locationCode ===
              location.code;

          return (
            <form
              key={location.code}
              action={formAction}
              onSubmit={() => {
                setSelectedCode(
                  location.code
                );
              }}
              className="h-full"
            >
              <input
                type="hidden"
                name="locationCode"
                value={location.code}
              />

              <button
                type="submit"
                disabled={isPending}
                className="group flex h-full min-h-56 w-full flex-col rounded-2xl border border-zinc-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
              >
                <div className="mb-8 flex w-full items-center justify-between">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-zinc-100 text-zinc-900 transition group-hover:bg-zinc-950 group-hover:text-white">
                    {isSelecting ? (
                      <Loader2
                        size={20}
                        className="animate-spin"
                        aria-hidden="true"
                      />
                    ) : isSelected ? (
                      <Check
                        size={20}
                        aria-hidden="true"
                      />
                    ) : (
                      <MapPin
                        size={20}
                        aria-hidden="true"
                      />
                    )}
                  </div>

                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">
                    {location.code}
                  </span>
                </div>

                <h2 className="text-xl font-bold text-zinc-950">
                  {location.name}
                </h2>

                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  {location.description}
                </p>

                <div className="mt-auto pt-6">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-900">
                    {isSelecting
                      ? "Selecting..."
                      : isSelected
                        ? "Selected"
                        : `Select ${location.name}`}
                  </span>
                </div>
              </button>
            </form>
          );
        })}
      </div>

      <div
        className="mt-5 min-h-6 text-center"
        aria-live="polite"
      >
        {state && !state.success ? (
          <p className="text-sm font-medium text-red-600">
            {state.message}
          </p>
        ) : null}

        {state?.success ? (
          <p className="text-sm font-medium text-emerald-700">
            {state.locationName} selected.
          </p>
        ) : null}
      </div>
    </div>
  );
}