import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function pickEnv(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const campaignId = (url.searchParams.get("campaign_id") || "").trim();
    const email = (url.searchParams.get("email") || "").trim();
    const target = (url.searchParams.get("url") || "").trim();

    if (!campaignId || !target) {
      return NextResponse.redirect("https://corehq.io", 302);
    }

    const SUPABASE_URL = pickEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = pickEnv("SUPABASE_SERVICE_ROLE_KEY");

    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      });

      const { data: existingLog } = await supabase
        .from("campaign_logs")
        .select("email_snapshot_id,recipients,resend_id")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      await supabase.from("campaign_logs").insert({
        campaign_id: campaignId,
        email_snapshot_id: existingLog?.email_snapshot_id || null,
        recipients: existingLog?.recipients || [],
        status: "clicked",
        resend_id: existingLog?.resend_id || null,
        event: "clicked",
        email: email || null,
        clicked_url: target,
        error: null,
      });
    }

    return NextResponse.redirect(target, 302);
  } catch {
    return NextResponse.redirect("https://corehq.io", 302);
  }
}