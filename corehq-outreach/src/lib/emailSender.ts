// src/lib/emailSender.ts

import { createClient } from "@supabase/supabase-js";

function pickEnv(...keys: string[]) {
  for (const k of keys) {
    const v = process.env[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

export async function getSenderByBrand(brandId?: string | null) {
  const DEFAULT_FROM = "CoreHQ <hello@corehq.company>";

  try {
    if (!brandId) {
      return {
        from: DEFAULT_FROM,
        replyTo: "support@corehq.company",
      };
    }

    const SUPABASE_URL = pickEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL");
    const SERVICE_KEY = pickEnv("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return {
        from: DEFAULT_FROM,
        replyTo: "support@corehq.company",
      };
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase
      .from("brands")
      .select("name, from_name, sender_email, reply_to_email")
      .eq("id", brandId)
      .maybeSingle();

    if (error || !data) {
      return {
        from: DEFAULT_FROM,
        replyTo: "support@corehq.company",
      };
    }

    const fromName = (data.from_name || data.name || "CoreHQ").trim();
    const senderEmail = (data.sender_email || "").trim();
    const replyTo = (data.reply_to_email || "support@corehq.company").trim();

    const isSafe =
      senderEmail.endsWith("@corehq.company") ||
      senderEmail.endsWith("@resend.dev");

    const finalFrom = senderEmail && isSafe ? `${fromName} <${senderEmail}>` : DEFAULT_FROM;

    return {
      from: finalFrom,
      replyTo,
    };
  } catch {
    return {
      from: DEFAULT_FROM,
      replyTo: "support@corehq.company",
    };
  }
}