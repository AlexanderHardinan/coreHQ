"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  Info,
  Loader2,
  PencilLine,
  Save,
  Trash2,
  X,
} from "lucide-react";

export type ToastType =
  | "success"
  | "error"
  | "warning"
  | "info"
  | "saving"
  | "deleting"
  | "updating";

export type ToastInput = {
  title: string;
  message?: string;
  type?: ToastType;
  duration?: number;
};

type ToastRecord = Required<
  Pick<
    ToastInput,
    "title" | "type"
  >
> & {
  id: number;
  message?: string;
  duration: number;
};

type ToastContextValue = {
  showToast: (
    input: ToastInput
  ) => number;
  dismissToast: (
    id: number
  ) => void;
  success: (
    title: string,
    message?: string
  ) => number;
  error: (
    title: string,
    message?: string
  ) => number;
  warning: (
    title: string,
    message?: string
  ) => number;
  info: (
    title: string,
    message?: string
  ) => number;
  saving: (
    title?: string,
    message?: string
  ) => number;
  deleting: (
    title?: string,
    message?: string
  ) => number;
  updating: (
    title?: string,
    message?: string
  ) => number;
};

const DEFAULT_DURATION = 4200;

const ToastContext =
  createContext<ToastContextValue | null>(
    null
  );

function ToastIcon({
  type,
}: {
  type: ToastType;
}) {
  if (type === "success") {
    return (
      <CheckCircle2
        size={19}
        aria-hidden="true"
      />
    );
  }

  if (type === "error") {
    return (
      <CircleAlert
        size={19}
        aria-hidden="true"
      />
    );
  }

  if (type === "warning") {
    return (
      <AlertTriangle
        size={19}
        aria-hidden="true"
      />
    );
  }

  if (type === "saving") {
    return (
      <Save
        size={18}
        aria-hidden="true"
      />
    );
  }

  if (type === "deleting") {
    return (
      <Trash2
        size={18}
        aria-hidden="true"
      />
    );
  }

  if (type === "updating") {
    return (
      <PencilLine
        size={18}
        aria-hidden="true"
      />
    );
  }

  return (
    <Info
      size={19}
      aria-hidden="true"
    />
  );
}

function isLoadingToast(
  type: ToastType
) {
  return (
    type === "saving" ||
    type === "deleting" ||
    type === "updating"
  );
}

export function ToastProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [toasts, setToasts] =
    useState<ToastRecord[]>([]);

  const nextIdRef =
    useRef(1);

  const timeoutRefs =
    useRef<
      Map<
        number,
        ReturnType<
          typeof setTimeout
        >
      >
    >(new Map());

  const dismissToast =
    useCallback(
      (id: number) => {
        const timeout =
          timeoutRefs.current.get(
            id
          );

        if (timeout) {
          clearTimeout(timeout);
          timeoutRefs.current.delete(
            id
          );
        }

        setToasts((current) =>
          current.filter(
            (toast) =>
              toast.id !== id
          )
        );
      },
      []
    );

  const showToast =
    useCallback(
      (
        input: ToastInput
      ) => {
        const id =
          nextIdRef.current++;

        const type =
          input.type ??
          "info";

        const duration =
          input.duration ??
          DEFAULT_DURATION;

        const toast: ToastRecord =
          {
            id,
            title:
              input.title,
            message:
              input.message,
            type,
            duration,
          };

        setToasts((current) => [
          ...current,
          toast,
        ]);

        if (
          duration > 0 &&
          !isLoadingToast(
            type
          )
        ) {
          const timeout =
            setTimeout(() => {
              dismissToast(
                id
              );
            }, duration);

          timeoutRefs.current.set(
            id,
            timeout
          );
        }

        return id;
      },
      [dismissToast]
    );

  const value =
    useMemo<ToastContextValue>(
      () => ({
        showToast,

        dismissToast,

        success: (
          title,
          message
        ) =>
          showToast({
            title,
            message,
            type: "success",
          }),

        error: (
          title,
          message
        ) =>
          showToast({
            title,
            message,
            type: "error",
            duration: 6000,
          }),

        warning: (
          title,
          message
        ) =>
          showToast({
            title,
            message,
            type: "warning",
            duration: 5200,
          }),

        info: (
          title,
          message
        ) =>
          showToast({
            title,
            message,
            type: "info",
          }),

        saving: (
          title = "Saving",
          message
        ) =>
          showToast({
            title,
            message,
            type: "saving",
            duration: 0,
          }),

        deleting: (
          title =
            "Deleting",
          message
        ) =>
          showToast({
            title,
            message,
            type: "deleting",
            duration: 0,
          }),

        updating: (
          title =
            "Updating",
          message
        ) =>
          showToast({
            title,
            message,
            type: "updating",
            duration: 0,
          }),
      }),
      [
        dismissToast,
        showToast,
      ]
    );

  return (
    <ToastContext.Provider
      value={value}
    >
      {children}

      <div
        className="pointer-events-none fixed inset-x-0 top-4 z-[10000] flex flex-col items-center gap-3 px-4 sm:left-auto sm:right-5 sm:top-5 sm:w-[380px] sm:items-stretch sm:px-0"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map(
          (toast) => {
            const loading =
              isLoadingToast(
                toast.type
              );

            return (
              <div
                key={
                  toast.id
                }
                className="pointer-events-auto w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_18px_55px_rgba(24,24,27,0.14)]"
                role={
                  toast.type ===
                    "error"
                    ? "alert"
                    : "status"
                }
              >
                <div className="flex gap-3 p-4">
                  <div
                    className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                      toast.type ===
                      "success"
                        ? "bg-emerald-50 text-emerald-700"
                        : toast.type ===
                            "error"
                          ? "bg-red-50 text-red-700"
                          : toast.type ===
                              "warning"
                            ? "bg-amber-50 text-amber-700"
                            : loading
                              ? "bg-zinc-950 text-white"
                              : "bg-zinc-100 text-zinc-700"
                    }`}
                  >
                    {loading ? (
                      <Loader2
                        size={18}
                        className="animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <ToastIcon
                        type={
                          toast.type
                        }
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-zinc-950">
                      {
                        toast.title
                      }
                    </p>

                    {toast.message ? (
                      <p className="mt-1 text-sm leading-5 text-zinc-500">
                        {
                          toast.message
                        }
                      </p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      dismissToast(
                        toast.id
                      )
                    }
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-800"
                    aria-label="Dismiss notification"
                  >
                    <X
                      size={16}
                    />
                  </button>
                </div>

                {!loading &&
                toast.duration >
                  0 ? (
                  <div className="h-1 bg-zinc-100">
                    <div
                      className={`h-full origin-left animate-[toastProgress_linear_forwards] ${
                        toast.type ===
                        "success"
                          ? "bg-emerald-500"
                          : toast.type ===
                              "error"
                            ? "bg-red-500"
                            : toast.type ===
                                "warning"
                              ? "bg-amber-500"
                              : "bg-zinc-500"
                      }`}
                      style={{
                        animationDuration:
                          `${toast.duration}ms`,
                      }}
                    />
                  </div>
                ) : null}
              </div>
            );
          }
        )}
      </div>

      <style>{`
        @keyframes toastProgress {
          from {
            transform: scaleX(1);
          }

          to {
            transform: scaleX(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          [class*="animate-[toastProgress"] {
            animation: none !important;
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context =
    useContext(
      ToastContext
    );

  if (!context) {
    throw new Error(
      "useToast must be used inside ToastProvider."
    );
  }

  return context;
}