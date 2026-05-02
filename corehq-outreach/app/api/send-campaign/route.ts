// app/api/send-campaign/route.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

type EmailSnapshotRow = {
  id: string;
  campaign_id: string;
  brand_id: string;
  subject: string | null;
  preview_text: string | null;
  html_snapshot: string | null;
  text_snapshot: string | null;
  created_at: string | null;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function pickEnv(...keys: string[]) {
  for (const k of keys) {
    const v = process.env[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function asStringArray(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input
      .map((v) => (typeof v === "string" ? v.trim() : ""))
      .filter(Boolean);
  }
  if (typeof input === "string") {
    const v = input.trim();
    return v ? [v] : [];
  }
  return [];
}

export async function POST(req: Request) {
  try {
    const RESEND_API_KEY = pickEnv("RESEND_API_KEY");
    if (!RESEND_API_KEY) return jsonError("Missing RESEND_API_KEY env var.", 500);

    const SUPABASE_URL = pickEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = pickEnv("SUPABASE_SERVICE_ROLE_KEY");
    const SUPABASE_ANON_KEY = pickEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY");

    if (!SUPABASE_URL) return jsonError("Missing Supabase URL env var.", 500);

    const supabaseKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
    if (!supabaseKey) {
      return jsonError(
        "Missing Supabase key env var. Provide SUPABASE_SERVICE_ROLE_KEY (recommended) or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
        500
      );
    }

    const supabase = createClient(SUPABASE_URL, supabaseKey, {
      auth: { persistSession: false },
    });

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return jsonError("Invalid JSON body.");

    const campaignId =
      typeof (body as any).campaignId === "string"
        ? (body as any).campaignId.trim()
        : typeof (body as any).campaign_id === "string"
        ? (body as any).campaign_id.trim()
        : "";

    const to = asStringArray((body as any).to);

    if (!campaignId) return jsonError("campaignId is required.");
    if (!to.length) return jsonError("to is required (string or string[]).");

    const from =
      typeof (body as any).from === "string" && (body as any).from.trim()
        ? (body as any).from.trim()
        : "CoreHQ <onboarding@resend.dev>";

    const replyTo =
      typeof (body as any).replyTo === "string" && (body as any).replyTo.trim()
        ? (body as any).replyTo.trim()
        : undefined;

    const { data, error } = await supabase
      .from("emails")
      .select("id,campaign_id,brand_id,subject,preview_text,html_snapshot,text_snapshot,created_at")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<EmailSnapshotRow>();

    if (error) return jsonError(error.message || "Failed to load email snapshots.", 500);

    if (!data) {
      return jsonError(
        "No email snapshots found for this campaign. Open Preview and click “Save Snapshots” first.",
        400
      );
    }

    const subject =
      (typeof (body as any).subject === "string" && (body as any).subject.trim()
        ? (body as any).subject.trim()
        : data.subject) || "Campaign";

    const html =
      (typeof (body as any).html === "string" && (body as any).html.trim()
        ? String((body as any).html)
        : data.html_snapshot) || "";

    const text =
      (typeof (body as any).text === "string" && (body as any).text.trim()
        ? String((body as any).text)
        : data.text_snapshot) || "";

    if (!html && !text) {
      return jsonError(
        "Snapshot is missing html_snapshot/text_snapshot. Regenerate Preview and Save Snapshots again.",
        400
      );
    }

    // ✅ Phase 8 status tracking: sending
    await supabase
      .from("campaigns")
      .update({
        status: "sending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaignId);

    const resend = new Resend(RESEND_API_KEY);

    try {
      const sendRes = html
        ? await resend.emails.send({
            from,
            to,
            subject,
            ...(replyTo ? { replyTo } : {}),
            html,
            ...(text ? { text } : {}),
          })
        : await resend.emails.send({
            from,
            to,
            subject,
            ...(replyTo ? { replyTo } : {}),
            text,
          });

      // ✅ Phase 8 status tracking: sent
      await supabase
        .from("campaigns")
        .update({
          status: "sent",
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaignId);

      return NextResponse.json({
        ok: true,
        campaignId,
        to,
        resend: sendRes,
        snapshotEmailId: data.id,
        usedFrom: from,
        usedSubject: subject,
        usedMode: html ? "html" : "text",
      });
    } catch (sendError: any) {
      // ✅ Phase 8 status tracking: failed
      await supabase
        .from("campaigns")
        .update({
          status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaignId);

      return jsonError(sendError?.message || "Send failed.", 500);
    }
  } catch (e: any) {
    return jsonError(e?.message || "Unexpected server error.", 500);
  }
}