// app/api/send-campaign/route.ts
import { NextResponse } from "next/server";
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

type ContactRow = {
  email: string;
  name: string | null;
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
    return input.map((v) => (typeof v === "string" ? v.trim() : "")).filter(Boolean);
  }

  if (typeof input === "string") {
    return input
      .split(/[\n,;]+/g)
      .map((v) => v.trim())
      .filter(Boolean);
  }

  return [];
}

function uniqueEmails(input: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const email of input) {
    const clean = email.trim();
    const key = clean.toLowerCase();

    if (!clean || seen.has(key)) continue;

    seen.add(key);
    out.push(clean);
  }

  return out;
}

export async function POST(req: Request) {
  try {
    const SUPABASE_URL = pickEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = pickEnv("SUPABASE_SERVICE_ROLE_KEY");
    const SUPABASE_ANON_KEY = pickEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY");

    if (!SUPABASE_URL) return jsonError("Missing Supabase URL env var.", 500);

    const supabaseKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
    if (!supabaseKey) return jsonError("Missing Supabase key env var.", 500);

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

    const recipients = uniqueEmails(asStringArray((body as any).to));

    if (!campaignId) return jsonError("campaignId is required.");
    if (!recipients.length) return jsonError("to is required.");

    // ✅ LOAD SNAPSHOT
    const { data, error } = await supabase
      .from("emails")
      .select("id,campaign_id,brand_id,subject,preview_text,html_snapshot,text_snapshot,created_at")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<EmailSnapshotRow>();

    if (error) return jsonError(error.message || "Failed to load snapshot.", 500);
    if (!data) {
      return jsonError("No email snapshot found. Save snapshot first.", 400);
    }

    // ✅ LOAD CONTACT NAMES (KEY FIX)
    const { data: contacts } = await supabase
      .from("contacts")
      .select("email,name")
      .in("email", recipients);

    const contactMap = new Map<string, string>();

    (contacts || []).forEach((c: ContactRow) => {
      if (c.email) {
        contactMap.set(c.email.toLowerCase(), c.name || "");
      }
    });

    // ✅ BUILD QUEUE WITH NAME INCLUDED
    const queueRows = recipients.map((email) => ({
      campaign_id: campaignId,
      email_snapshot_id: data.id,
      recipient_email: email,
      recipient_name: contactMap.get(email.toLowerCase()) || "",
      status: "queued",
      attempts: 0,
      error: null,
    }));

    const { error: queueError } = await supabase.from("campaign_queue").insert(queueRows);

    if (queueError) {
      return jsonError(queueError.message || "Queue insert failed.", 500);
    }

    await supabase
      .from("campaigns")
      .update({
        status: "scheduled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaignId);

    return NextResponse.json({
      ok: true,
      campaignId,
      queued: recipients.length,
    });
  } catch (e: any) {
    return jsonError(e?.message || "Unexpected server error.", 500);
  }
}