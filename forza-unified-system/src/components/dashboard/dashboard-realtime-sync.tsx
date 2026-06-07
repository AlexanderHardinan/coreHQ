"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type DashboardRealtimeSyncProps = {
  brandId: string;
};

export function DashboardRealtimeSync({ brandId }: DashboardRealtimeSyncProps) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const refreshTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!brandId) {
      return;
    }

    function scheduleRefresh() {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }

      refreshTimerRef.current = window.setTimeout(() => {
        router.refresh();
      }, 350);
    }

    const channel = supabase
      .channel(`dashboard-realtime-${brandId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
          filter: `brand_id=eq.${brandId}`,
        },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inventory_movements",
          filter: `brand_id=eq.${brandId}`,
        },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sold_items",
          filter: `brand_id=eq.${brandId}`,
        },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "recipe_sales",
          filter: `brand_id=eq.${brandId}`,
        },
        scheduleRefresh,
      )
      .subscribe();

    const fallbackRefresh = window.setInterval(() => {
      router.refresh();
    }, 15000);

    return () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }

      window.clearInterval(fallbackRefresh);
      supabase.removeChannel(channel);
    };
  }, [brandId, router, supabase]);

  return null;
}