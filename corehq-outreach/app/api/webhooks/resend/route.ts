import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function pickEnv(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function getEventType(payload: any) {
  return (
    payload?.type ||
    payload?.event ||
    payload?.data?.type ||
    payload?.data?.event ||
    ""
  );
}

function getResendId(payload: any) {
  return (
    payload?.data?.email_id ||
    payload?.data?.id ||
    payload?.email_id ||
    payload?.id ||
    ""
  );
}

function getEmail(payload: any) {
  return (
    payload?.data?.to?.[0] ||
    payload?.data?.email ||
    payload?.to?.[0] ||
    payload?.email ||
    null
  );
}

export async function POST(req: Request) {
  try {
    const SUPABASE_URL = pickEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = pickEnv("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { ok: false, error: "Missing Supabase server env vars." },
        { status: 500 }
      );
    }

    const payload = await req.json().catch(() => null);
    if (!payload) {
      return NextResponse.json(
        { ok: false, error: "Invalid webhook payload." },
        { status: 400 }
      );
    }

    const event = getEventType(payload);
    const resendId = getResendId(payload);
    const email = getEmail(payload);

    if (!resendId) {
      return NextResponse.json(
        { ok: false, error: "Missing Resend email id." },
        { status: 400 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data: existingLog } = await supabase
      .from("campaign_logs")
      .select("campaign_id,email_snapshot_id,recipients")
      .eq("resend_id", resendId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { error } = await supabase.from("campaign_logs").insert({
      campaign_id: existingLog?.campaign_id || null,
      email_snapshot_id: existingLog?.email_snapshot_id || null,
      recipients: existingLog?.recipients || [],
      status: event || "webhook",
      resend_id: resendId,
      event,
      email,
      error: null,
    });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      resend_id: resendId,
      event,
      email,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Webhook failed." },
      { status: 500 }
    );
  }
}