import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function pickEnv(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function pixel() {
  const transparentGif = Buffer.from(
    "R0lGODlhAQABAPAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==",
    "base64"
  );

  return new NextResponse(transparentGif, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const campaignId = (url.searchParams.get("campaign_id") || "").trim();
    const email = (url.searchParams.get("email") || "").trim();

    if (!campaignId) return pixel();

    const SUPABASE_URL = pickEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = pickEnv("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return pixel();

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
      status: "opened",
      resend_id: existingLog?.resend_id || null,
      event: "opened",
      email: email || null,
      error: null,
    });

    return pixel();
  } catch {
    return pixel();
  }
}