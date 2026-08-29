"use client";

import {
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  RefreshCcw,
} from "lucide-react";

import {
  clearLocationAction,
} from "@/app/actions/location";

export default function SwitchLocationButton() {
  const router = useRouter();

  const [
    isPending,
    startTransition,
  ] = useTransition();

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(
    null
  );

  function handleSwitchLocation() {
    if (isPending) {
      return;
    }

    setErrorMessage(null);

    startTransition(async () => {
      const result =
        await clearLocationAction();

      if (!result.success) {
        if (
          result.message
            .toLowerCase()
            .includes(
              "session has expired"
            )
        ) {
          router.replace("/login");
          router.refresh();
          return;
        }

        setErrorMessage(
          result.message
        );

        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={
          handleSwitchLocation
        }
        disabled={isPending}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <>
            <Loader2
              size={14}
              className="animate-spin"
              aria-hidden="true"
            />

            Switching...
          </>
        ) : (
          <>
            <RefreshCcw
              size={14}
              aria-hidden="true"
            />

            Switch Location
          </>
        )}
      </button>

      {errorMessage ? (
        <p
          className="max-w-56 text-xs font-medium text-red-600"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}