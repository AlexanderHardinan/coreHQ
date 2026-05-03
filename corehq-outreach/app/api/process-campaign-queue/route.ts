import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

function pickEnv(...keys: string[]) {
  for (const k of keys) {
    const v = process.env[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

type QueueRow = {
  id: string;
  campaign_id: string;
  email_snapshot_id: string | null;
  recipient_email: string;
  status: string;
  attempts: number;
};

type SnapshotRow = {
  id: string;
  subject: string | null;
  html_snapshot: string | null;
  text_snapshot: string | null;
};

export async function POST() {
  try {
    const RESEND_API_KEY = pickEnv("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return NextResponse.json({ ok: false, error: "Missing RESEND_API_KEY" }, { status: 500 });
    }

    const SUPABASE_URL = pickEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = pickEnv("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ ok: false, error: "Missing Supabase env" }, { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const resend = new Resend(RESEND_API_KEY);

    // batch size control (safe for rate limits)
    const BATCH_SIZE = 20;

    const { data: queue, error: qErr } = await supabase
      .from("campaign_queue")
      .select("id,campaign_id,email_snapshot_id,recipient_email,status,attempts")
      .eq("status", "queued")
      .limit(BATCH_SIZE);

    if (qErr) {
      return NextResponse.json({ ok: false, error: qErr.message }, { status: 500 });
    }

    if (!queue || queue.length === 0) {
      return NextResponse.json({ ok: true, processed: 0 });
    }

    let processed = 0;

    for (const job of queue as QueueRow[]) {
      try {
        if (!job.email_snapshot_id) {
          throw new Error("Missing snapshot");
        }

        const { data: snap } = await supabase
          .from("emails")
          .select("id,subject,html_snapshot,text_snapshot")
          .eq("id", job.email_snapshot_id)
          .single<SnapshotRow>();

        if (!snap) throw new Error("Snapshot not found");

        const subject = snap.subject || "Campaign";
        const html = snap.html_snapshot || "";
        const text = snap.text_snapshot || "";

        if (!html && !text) throw new Error("Empty email content");

        const sendRes = html
          ? await resend.emails.send({
              from: "CoreHQ <onboarding@resend.dev>",
              to: [job.recipient_email],
              subject,
              html,
              ...(text ? { text } : {}),
            })
          : await resend.emails.send({
              from: "CoreHQ <onboarding@resend.dev>",
              to: [job.recipient_email],
              subject,
              text,
            });

        await supabase
          .from("campaign_queue")
          .update({
            status: "sent",
            attempts: job.attempts + 1,
            sent_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        await supabase.from("campaign_logs").insert({
          campaign_id: job.campaign_id,
          email_snapshot_id: job.email_snapshot_id,
          recipients: [job.recipient_email],
          status: "sent",
          resend_id: (sendRes as any)?.data?.id || null,
          event: "sent",
          email: job.recipient_email,
          error: null,
        });

        processed++;
      } catch (err: any) {
        await supabase
          .from("campaign_queue")
          .update({
            status: "failed",
            attempts: job.attempts + 1,
            error: err?.message || "Send failed",
          })
          .eq("id", job.id);

        await supabase.from("campaign_logs").insert({
          campaign_id: job.campaign_id,
          email_snapshot_id: job.email_snapshot_id,
          recipients: [job.recipient_email],
          status: "failed",
          resend_id: null,
          event: "failed",
          email: job.recipient_email,
          error: err?.message || "Send failed",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      processed,
      batchSize: queue.length,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Worker failed" },
      { status: 500 }
    );
  }
}