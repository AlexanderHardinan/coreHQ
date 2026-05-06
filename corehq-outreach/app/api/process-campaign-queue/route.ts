// app/api/process-campaign-queue/route.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { getSenderByBrand } from "../../../src/lib/emailSender";

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
  recipient_name: string | null;
  status: string;
  attempts: number;
};

type SnapshotRow = {
  id: string;
  subject: string | null;
  html_snapshot: string | null;
  text_snapshot: string | null;
};

type CampaignRow = {
  id: string;
  brand_id: string | null;
};

type BrandRow = {
  id: string;
  name: string | null;
  from_name: string | null;
  signature_company: string | null;
};

type ContactRow = {
  email: string | null;
  name: string | null;
};

type Sender = {
  from: string;
  replyTo: string;
};

type PersonalizationData = {
  name: string;
  email: string;
  brand: string;
  company: string;
};

function safeText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function firstNameOnly(name: string) {
  const clean = name.trim();
  if (!clean) return "";
  return clean.split(/\s+/)[0] || clean;
}

function replacePlaceholders(value: string, data: PersonalizationData) {
  return value
    .replaceAll("{{name}}", data.name || data.email)
    .replaceAll("{{first_name}}", firstNameOnly(data.name) || data.email)
    .replaceAll("{{email}}", data.email)
    .replaceAll("{{brand}}", data.brand)
    .replaceAll("{{company}}", data.company || data.brand);
}

async function processQueue() {
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

    const BATCH_SIZE = 20;
    const MAX_ATTEMPTS = 3;

    const { data: queue, error: qErr } = await supabase
      .from("campaign_queue")
      .select("id,campaign_id,email_snapshot_id,recipient_email,recipient_name,status,attempts")
      .in("status", ["queued", "failed"])
      .lt("attempts", MAX_ATTEMPTS)
      .order("attempts", { ascending: true })
      .limit(BATCH_SIZE);

    if (qErr) {
      return NextResponse.json({ ok: false, error: qErr.message }, { status: 500 });
    }

    if (!queue || queue.length === 0) {
      return NextResponse.json({ ok: true, processed: 0, retried: 0, failed: 0 });
    }

    let processed = 0;
    let retried = 0;
    let failed = 0;

    const senderCache = new Map<string, Sender>();
    const campaignCache = new Map<string, CampaignRow | null>();
    const brandCache = new Map<string, BrandRow | null>();
    const contactCache = new Map<string, ContactRow | null>();

    for (const job of queue as QueueRow[]) {
      const nextAttempts = job.attempts + 1;
      const isRetry = job.status === "failed";

      try {
        if (!job.email_snapshot_id) throw new Error("Missing snapshot");

        const { data: snap } = await supabase
          .from("emails")
          .select("id,subject,html_snapshot,text_snapshot")
          .eq("id", job.email_snapshot_id)
          .single<SnapshotRow>();

        if (!snap) throw new Error("Snapshot not found");

        let campaignRow = campaignCache.get(job.campaign_id);

        if (!campaignCache.has(job.campaign_id)) {
          const { data, error } = await supabase
            .from("campaigns")
            .select("id,brand_id")
            .eq("id", job.campaign_id)
            .maybeSingle<CampaignRow>();

          if (error) throw new Error(error.message);

          campaignRow = data || null;
          campaignCache.set(job.campaign_id, campaignRow);
        }

        let sender = senderCache.get(job.campaign_id);

        if (!sender) {
          sender = await getSenderByBrand(campaignRow?.brand_id || null);
          senderCache.set(job.campaign_id, sender);
        }

        let brand: BrandRow | null = null;

        if (campaignRow?.brand_id) {
          brand = brandCache.get(campaignRow.brand_id) || null;

          if (!brandCache.has(campaignRow.brand_id)) {
            const { data } = await supabase
              .from("brands")
              .select("id,name,from_name,signature_company")
              .eq("id", campaignRow.brand_id)
              .maybeSingle<BrandRow>();

            brand = data || null;
            brandCache.set(campaignRow.brand_id, brand);
          }
        }

        const contactKey = job.recipient_email.toLowerCase();
        let contact = contactCache.get(contactKey) || null;

        if (!contactCache.has(contactKey)) {
          const { data } = await supabase
            .from("contacts")
            .select("email,name")
            .eq("email", job.recipient_email)
            .maybeSingle<ContactRow>();

          contact = data || null;
          contactCache.set(contactKey, contact);
        }

        const personalization: PersonalizationData = {
          name: safeText(job.recipient_name) || safeText(contact?.name),
          email: job.recipient_email,
          brand: safeText(brand?.name) || "CoreHQ",
          company: safeText(brand?.signature_company) || "CoreHQ",
        };

        const subject = replacePlaceholders(snap.subject || "Campaign", personalization);
        const html = replacePlaceholders(snap.html_snapshot || "", personalization);
        const text = replacePlaceholders(snap.text_snapshot || "", personalization);

        // ✅ FIXED: FORCE REPLY-TO
        const FORCED_REPLY_TO = "media@corehq.company";

        const sendRes = html
          ? await resend.emails.send({
            from: sender.from,
            to: [job.recipient_email],
            subject,
            replyTo: FORCED_REPLY_TO,
            html,
            ...(text ? { text } : {}),
          })
        : await resend.emails.send({
           from: sender.from,
           to: [job.recipient_email],
           subject,
           replyTo: FORCED_REPLY_TO,
           text,
         });

        await supabase
          .from("campaign_queue")
          .update({
            status: "sent",
            attempts: nextAttempts,
            sent_at: new Date().toISOString(),
            error: null,
          })
          .eq("id", job.id);

        processed++;
        if (isRetry) retried++;
      } catch (err: any) {
        const finalStatus = nextAttempts >= MAX_ATTEMPTS ? "failed_permanent" : "failed";

        await supabase
          .from("campaign_queue")
          .update({
            status: finalStatus,
            attempts: nextAttempts,
            error: err?.message || "Send failed",
          })
          .eq("id", job.id);

        failed++;
      }
    }

    return NextResponse.json({ ok: true, processed, retried, failed });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}

export async function GET() {
  return processQueue();
}

export async function POST() {
  return processQueue();
}