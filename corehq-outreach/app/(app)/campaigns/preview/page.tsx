"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../../../src/lib/supabaseClient";

type ToastKind = "success" | "error" | "info";

type ContactRow = {
  id: string;
  name: string | null;
  email: string | null;
};

type BrandRow = {
  id: string;
  name: string | null;
  from_name: string | null;
  sender_email: string | null;
  reply_to_email: string | null;
  footer_text: string | null;
  accent_color: string | null;
  logo_url: string | null;
  signature_title: string | null;
  signature_company: string | null;
  signature_website: string | null;
  signature_phone: string | null;
  signature_address: string | null;
  signature_disclaimer: string | null;
};

type CampaignRow = {
  id: string;
  brand_id: string | null;
  name: string | null;
  subject: string | null;
  preview_text: string | null;
  html_body: string | null;
  featured_url: string | null;
  primary_banner_url: string | null;
  cta_primary_text: string | null;
  cta_primary_url: string | null;
  cta_secondary_text: string | null;
  cta_secondary_url: string | null;
  extra_banner_url_1: string | null;
  extra_banner_url_2: string | null;
  youtube_url: string | null;
  footer_text: string | null;
  compliance_text: string | null;
  unsubscribe_url: string | null;
};

function safeText(v: any) {
  return typeof v === "string" ? v : "";
}

function escHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeUrlOrEmpty(v: string | null | undefined) {
  return (v || "").trim();
}

function replaceTemplateTokens(value: string) {
  return value
    .replaceAll("{{name}}", "Alex")
    .replaceAll("{{email}}", "alex@example.com")
    .replaceAll("{{company}}", "The Globe")
    .replaceAll("{{country}}", "Thailand");
}

function htmlToPlainText(value: string) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function tryGetYouTubeId(url: string) {
  const u = url.trim();
  if (!u) return "";

  const mShort = u.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/);
  if (mShort?.[1]) return mShort[1];

  const mV = u.match(/[?&]v=([a-zA-Z0-9_-]{6,})/);
  if (mV?.[1]) return mV[1];

  const mEmbed = u.match(/\/embed\/([a-zA-Z0-9_-]{6,})/);
  if (mEmbed?.[1]) return mEmbed[1];

  return "";
}

function getBrandName(brand: BrandRow | null) {
  return safeText(brand?.name) || "CoreHQ Brand";
}

function buildFromValue(brand: BrandRow | null, fallback: string) {
  const fromName = safeText(brand?.from_name) || getBrandName(brand);
  const senderEmail = safeText(brand?.sender_email);

  if (fromName && senderEmail) return `${fromName} <${senderEmail}>`;

  return fallback.trim() || "CoreHQ <hello@corehq.company>";
}

function InlineToast({
  open,
  kind,
  message,
}: {
  open: boolean;
  kind: ToastKind;
  message: string;
}) {
  const accent = useMemo(() => {
    if (kind === "success") return "rgba(34,197,94,1)";
    if (kind === "error") return "rgba(239,68,68,1)";
    return "rgba(59,130,246,1)";
  }, [kind]);

  return (
    <div
      className={`toast ${open ? "toastOpen" : "toastClose"}`}
      style={{ ["--toastAccent" as any]: accent }}
      role="status"
      aria-live="polite"
    >
      <div className="toastBar" />
      <div className="toastBody">
        <div className="toastDot" />
        <div className="toastText">{message}</div>
      </div>
    </div>
  );
}

function buildBrandSignatureHtml(brand: BrandRow | null, campaignFooter: string) {
  const logo = normalizeUrlOrEmpty(brand?.logo_url);
  const fromName = safeText(brand?.from_name) || getBrandName(brand) || "CoreHQ";
  const title = safeText(brand?.signature_title) || "Outreach Team";
  const company = safeText(brand?.signature_company) || getBrandName(brand);
  const website = normalizeUrlOrEmpty(brand?.signature_website);
  const phone = safeText(brand?.signature_phone);
  const address = safeText(brand?.signature_address);
  const brandFooter = safeText(brand?.footer_text);
  const disclaimer = safeText(brand?.signature_disclaimer);
  const accent = safeText(brand?.accent_color) || "#3B82F6";
  const footer = campaignFooter || brandFooter;

  return `<tr>
    <td style="padding:20px 18px 18px 18px;font-family:Arial,Helvetica,sans-serif;">
      <div style="border-top:1px solid #1F2937;margin-top:8px;padding-top:18px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr>
            ${
              logo
                ? `<td width="82" valign="top" style="padding-right:14px;">
                    <img src="${escHtml(logo)}" alt="${escHtml(
                    fromName
                  )}" width="68" style="width:68px;max-width:68px;height:auto;display:block;border-radius:12px;border:1px solid #1F2937;" />
                  </td>`
                : ""
            }
            <td valign="top" style="border-left:4px solid ${escHtml(accent)};padding-left:12px;">
              <div style="font-size:15px;line-height:1.4;color:#FFFFFF;font-weight:900;">
                ${escHtml(fromName)}
              </div>
              <div style="margin-top:3px;font-size:12px;line-height:1.5;color:#D1D5DB;">
                ${escHtml(title)}${company ? ` · ${escHtml(company)}` : ""}
              </div>
              ${
                website
                  ? `<div style="margin-top:8px;font-size:12px;line-height:1.6;">
                      <a href="${escHtml(website)}" style="color:#60A5FA;text-decoration:none;font-weight:800;">${escHtml(
                      website
                    )}</a>
                    </div>`
                  : ""
              }
              ${
                phone
                  ? `<div style="margin-top:4px;font-size:12px;line-height:1.6;color:#D1D5DB;">${escHtml(
                      phone
                    )}</div>`
                  : ""
              }
              ${
                address
                  ? `<div style="margin-top:4px;font-size:12px;line-height:1.6;color:#9CA3AF;">${escHtml(
                      address
                    )}</div>`
                  : ""
              }
            </td>
          </tr>
        </table>

        ${
          footer
            ? `<div style="margin-top:14px;font-size:12px;line-height:1.6;color:#D1D5DB;white-space:pre-wrap;">${escHtml(
                footer
              )}</div>`
            : ""
        }

        ${
          disclaimer
            ? `<div style="margin-top:10px;font-size:11px;line-height:1.6;color:#9CA3AF;white-space:pre-wrap;">${escHtml(
                disclaimer
              )}</div>`
            : ""
        }
      </div>
    </td>
  </tr>`;
}

function buildBrandSignatureText(brand: BrandRow | null, campaignFooter: string) {
  const fromName = safeText(brand?.from_name) || getBrandName(brand) || "CoreHQ";
  const title = safeText(brand?.signature_title) || "Outreach Team";
  const company = safeText(brand?.signature_company) || getBrandName(brand);
  const website = normalizeUrlOrEmpty(brand?.signature_website);
  const phone = safeText(brand?.signature_phone);
  const address = safeText(brand?.signature_address);
  const brandFooter = safeText(brand?.footer_text);
  const disclaimer = safeText(brand?.signature_disclaimer);
  const footer = campaignFooter || brandFooter;

  const lines: string[] = [];

  lines.push("");
  lines.push("--");
  lines.push(fromName);
  lines.push(company ? `${title} · ${company}` : title);

  if (website) lines.push(website);
  if (phone) lines.push(phone);
  if (address) lines.push(address);
  if (footer) {
    lines.push("");
    lines.push(footer);
  }
  if (disclaimer) {
    lines.push("");
    lines.push(disclaimer);
  }

  return lines.join("\n");
}

function buildEmailHtml(c: CampaignRow, brand: BrandRow | null, appOrigin: string) {
  const brandName = getBrandName(brand);
  const brandLogo = normalizeUrlOrEmpty(brand?.logo_url);
  const accent = safeText(brand?.accent_color) || "#3B82F6";

  const subject = safeText(c.subject) || "Campaign";
  const preview = safeText(c.preview_text);
  const htmlBody = replaceTemplateTokens(safeText(c.html_body));
  const featuredUrl = normalizeUrlOrEmpty(c.featured_url);
  const banner = normalizeUrlOrEmpty(c.primary_banner_url);

  const cta1Text = safeText(c.cta_primary_text);
  const cta1Url = normalizeUrlOrEmpty(c.cta_primary_url);
  const cta2Text = safeText(c.cta_secondary_text);
  const cta2Url = normalizeUrlOrEmpty(c.cta_secondary_url);

  const extra1 = normalizeUrlOrEmpty(c.extra_banner_url_1);
  const extra2 = normalizeUrlOrEmpty(c.extra_banner_url_2);

  const ytUrl = normalizeUrlOrEmpty(c.youtube_url);
  const ytId = tryGetYouTubeId(ytUrl);
  const ytThumb = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : "";

  const campaignFooter = safeText(c.footer_text);
  const compliance = safeText(c.compliance_text);
  const unsub = normalizeUrlOrEmpty(c.unsubscribe_url);

  const preheader = preview ? escHtml(preview) : escHtml(`New offer from ${brandName}`);

  const openPixelUrl = `${appOrigin}/api/track/open?campaign_id=${encodeURIComponent(c.id)}`;
  const openPixel = `<img src="${escHtml(
    openPixelUrl
  )}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;opacity:0;overflow:hidden;" />`;

  const buttonStyle =
    "display:inline-block;padding:12px 16px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;";
  const btnPrimary = buttonStyle + `background:${escHtml(accent)};color:#ffffff;`;
  const btnSecondary =
    buttonStyle + "background:#111827;color:#ffffff;border:1px solid #374151;";

  const wrapStart = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#0B0B0B;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;visibility:hidden;">
    ${preheader}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#0B0B0B;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;background:#0F1115;border:1px solid #1F2937;border-radius:14px;overflow:hidden;">
          ${
            brandLogo
              ? `<tr>
                  <td style="padding:18px 18px 0 18px;font-family:Arial,Helvetica,sans-serif;">
                    <img src="${escHtml(brandLogo)}" alt="${escHtml(
                  brandName
                )}" width="160" style="width:auto;max-width:160px;max-height:56px;height:auto;display:block;border:0;outline:none;text-decoration:none;" />
                  </td>
                </tr>`
              : ""
          }
          <tr>
            <td style="padding:18px 18px 10px 18px;font-family:Arial,Helvetica,sans-serif;color:#ffffff;">
              <div style="font-size:12px;color:#9CA3AF;font-weight:700;letter-spacing:0.3px;text-transform:uppercase;">
                ${escHtml(brandName)}
              </div>
              <div style="font-size:20px;line-height:1.25;margin-top:8px;font-weight:900;">
                ${escHtml(subject)}
              </div>
              ${
                preview
                  ? `<div style="margin-top:8px;font-size:14px;line-height:1.6;color:#D1D5DB;">
                      ${escHtml(preview)}
                    </div>`
                  : ""
              }
            </td>
          </tr>`;

  const bannerBlock = banner
    ? `<tr>
         <td style="padding:0 18px 0 18px;">
           <img src="${escHtml(banner)}" alt="" width="604" style="width:100%;max-width:604px;height:auto;border-radius:12px;display:block;border:1px solid #1F2937;" />
         </td>
       </tr>`
    : "";

  const bodyBlock = htmlBody
    ? `<tr>
         <td style="padding:16px 18px 0 18px;font-family:Arial,Helvetica,sans-serif;color:#D1D5DB;font-size:14px;line-height:1.65;">
           ${htmlBody}
         </td>
       </tr>`
    : "";

  const featuredBlock = featuredUrl
    ? `<tr>
         <td style="padding:14px 18px 0 18px;font-family:Arial,Helvetica,sans-serif;color:#D1D5DB;">
           <div style="font-size:14px;line-height:1.6;">
             Featured link:
             <a href="${escHtml(featuredUrl)}" style="color:#60A5FA;text-decoration:none;font-weight:700;">${escHtml(
               featuredUrl
             )}</a>
           </div>
         </td>
       </tr>`
    : "";

  const ctaBlock =
    cta1Text && cta1Url
      ? `<tr>
           <td style="padding:18px 18px 0 18px;font-family:Arial,Helvetica,sans-serif;">
             <a href="${escHtml(cta1Url)}" style="${btnPrimary}">${escHtml(cta1Text)}</a>
             ${
               cta2Text && cta2Url
                 ? `<span style="display:inline-block;width:10px;"></span>
                    <a href="${escHtml(cta2Url)}" style="${btnSecondary}">${escHtml(cta2Text)}</a>`
                 : ""
             }
           </td>
         </tr>`
      : "";

  const extraBanners = [extra1, extra2].filter(Boolean);
  const extraBlock = extraBanners.length
    ? `<tr>
         <td style="padding:16px 18px 0 18px;">
           ${extraBanners
             .map(
               (u) => `
                 <div style="margin-top:10px;">
                   <img src="${escHtml(u)}" alt="" width="604" style="width:100%;max-width:604px;height:auto;border-radius:12px;display:block;border:1px solid #1F2937;" />
                 </div>`
             )
             .join("")}
         </td>
       </tr>`
    : "";

  const youtubeBlock =
    ytUrl && ytThumb
      ? `<tr>
           <td style="padding:16px 18px 0 18px;font-family:Arial,Helvetica,sans-serif;">
             <div style="font-size:13px;color:#9CA3AF;font-weight:800;text-transform:uppercase;letter-spacing:0.3px;margin-bottom:8px;">
               Video preview
             </div>
             <a href="${escHtml(ytUrl)}" style="text-decoration:none;">
               <img src="${escHtml(ytThumb)}" alt="Watch on YouTube" width="604"
                 style="width:100%;max-width:604px;height:auto;border-radius:12px;display:block;border:1px solid #1F2937;" />
             </a>
             <div style="margin-top:8px;font-size:13px;color:#D1D5DB;line-height:1.55;">
               <a href="${escHtml(ytUrl)}" style="color:#60A5FA;text-decoration:none;font-weight:800;">Open YouTube</a>
             </div>
           </td>
         </tr>`
      : "";

  const signatureBlock = buildBrandSignatureHtml(brand, campaignFooter);

  const complianceBlock =
    compliance || unsub
      ? `<tr>
         <td style="padding:0 18px 18px 18px;font-family:Arial,Helvetica,sans-serif;">
           ${
             compliance
               ? `<div style="font-size:11px;line-height:1.6;color:#9CA3AF;white-space:pre-wrap;">${escHtml(
                   compliance
                 )}</div>`
               : ""
           }
           ${
             unsub
               ? `<div style="margin-top:12px;font-size:12px;line-height:1.6;color:#9CA3AF;">
                    <a href="${escHtml(
                      unsub
                    )}" style="color:#60A5FA;text-decoration:none;font-weight:800;">Unsubscribe</a>
                  </div>`
               : ""
           }
         </td>
       </tr>`
      : "";

  const wrapEnd = `
          <tr>
            <td style="padding:14px 18px 18px 18px;font-family:Arial,Helvetica,sans-serif;color:#6B7280;font-size:11px;line-height:1.6;">
              Sent via CoreHQ Company
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  ${openPixel}
</body>
</html>`;

  return (
    wrapStart +
    bannerBlock +
    bodyBlock +
    featuredBlock +
    ctaBlock +
    extraBlock +
    youtubeBlock +
    signatureBlock +
    complianceBlock +
    wrapEnd
  );
}

function buildEmailText(c: CampaignRow, brand: BrandRow | null) {
  const lines: string[] = [];
  const brandName = getBrandName(brand);
  const subject = safeText(c.subject) || "Campaign";
  const preview = safeText(c.preview_text);
  const htmlBody = replaceTemplateTokens(safeText(c.html_body));
  const bodyText = htmlToPlainText(htmlBody);

  lines.push(`${brandName}`);
  lines.push(subject);

  if (preview) {
    lines.push("");
    lines.push(preview);
  }

  if (bodyText) {
    lines.push("");
    lines.push(bodyText);
  }

  const featuredUrl = normalizeUrlOrEmpty(c.featured_url);
  if (featuredUrl) {
    lines.push("");
    lines.push(`Featured: ${featuredUrl}`);
  }

  const cta1Text = safeText(c.cta_primary_text);
  const cta1Url = normalizeUrlOrEmpty(c.cta_primary_url);
  const cta2Text = safeText(c.cta_secondary_text);
  const cta2Url = normalizeUrlOrEmpty(c.cta_secondary_url);

  if (cta1Text && cta1Url) {
    lines.push("");
    lines.push(`CTA: ${cta1Text} — ${cta1Url}`);
  }

  if (cta2Text && cta2Url) {
    lines.push(`CTA: ${cta2Text} — ${cta2Url}`);
  }

  const extra1 = normalizeUrlOrEmpty(c.extra_banner_url_1);
  const extra2 = normalizeUrlOrEmpty(c.extra_banner_url_2);
  const extras = [extra1, extra2].filter(Boolean);

  if (extras.length) {
    lines.push("");
    lines.push("Extra banners:");
    extras.forEach((u) => lines.push(`- ${u}`));
  }

  const ytUrl = normalizeUrlOrEmpty(c.youtube_url);
  if (ytUrl) {
    lines.push("");
    lines.push(`Video: ${ytUrl}`);
  }

  lines.push(buildBrandSignatureText(brand, safeText(c.footer_text)));

  const compliance = safeText(c.compliance_text);
  const unsub = normalizeUrlOrEmpty(c.unsubscribe_url);

  if (compliance) {
    lines.push("");
    lines.push("Compliance:");
    lines.push(compliance);
  }

  if (unsub) {
    lines.push("");
    lines.push(`Unsubscribe: ${unsub}`);
  }

  return lines.join("\n");
}

function parseRecipients(input: string) {
  const raw = input
    .split(/[\n,;]+/g)
    .map((s) => s.trim())
    .filter(Boolean);

  const uniq: string[] = [];
  const seen = new Set<string>();

  for (const e of raw) {
    const k = e.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      uniq.push(e);
    }
  }

  return uniq;
}

function appendRecipient(current: string, email: string) {
  const clean = email.trim();
  if (!clean) return current;

  const existing = parseRecipients(current).map((item) => item.toLowerCase());
  if (existing.includes(clean.toLowerCase())) return current;

  return current.trim() ? `${current.trim()}\n${clean}` : clean;
}

export default function CampaignPreviewPage() {
  const params = useSearchParams();
  const campaignId = (params.get("id") || "").trim();

  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<CampaignRow | null>(null);
  const [brand, setBrand] = useState<BrandRow | null>(null);
  const [brandName, setBrandName] = useState<string>("(brand)");

  const [html, setHtml] = useState<string>("");
  const [text, setText] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const SEND_TO_KEY = "corehq.preview.sendTo";
  const SEND_FROM_KEY = "corehq.preview.sendFrom";
  const SEND_REPLYTO_KEY = "corehq.preview.replyTo";

  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [selectedContactEmail, setSelectedContactEmail] = useState("");

  const [sendToInput, setSendToInput] = useState("");
  const [sendFrom, setSendFrom] = useState("CoreHQ <hello@corehq.company>");
  const [sendReplyTo, setSendReplyTo] = useState("support@corehq.company");

  const [sending, setSending] = useState(false);
  const [sendingNow, setSendingNow] = useState(false);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastKind, setToastKind] = useState<ToastKind>("info");
  const [toastMsg, setToastMsg] = useState("");
  const toastTimer = useRef<number | null>(null);

  const showToast = (kind: ToastKind, msg: string) => {
    setToastKind(kind);
    setToastMsg(msg);
    setToastOpen(true);

    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastOpen(false), 2400);
  };

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    try {
      const t = window.localStorage.getItem(SEND_TO_KEY);
      const f = window.localStorage.getItem(SEND_FROM_KEY);
      const r = window.localStorage.getItem(SEND_REPLYTO_KEY);

      if (typeof t === "string") setSendToInput(t);
      if (typeof f === "string" && f.trim()) setSendFrom(f);
      if (typeof r === "string") setSendReplyTo(r);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(SEND_TO_KEY, sendToInput);
    } catch {}
  }, [sendToInput]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SEND_FROM_KEY, sendFrom);
    } catch {}
  }, [sendFrom]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SEND_REPLYTO_KEY, sendReplyTo);
    } catch {}
  }, [sendReplyTo]);

  useEffect(() => {
    const loadContacts = async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("id,name,email")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setContacts(((data as unknown) as ContactRow[]).filter((contact) => !!contact.email));
      }
    };

    loadContacts();
  }, []);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (!campaignId) {
        setLoading(false);
        showToast("error", "Missing campaign id. Use /campaigns/preview?id=...");
        return;
      }

      setLoading(true);

      try {
        const { data, error } = await supabase
          .from("campaigns")
          .select(
            [
              "id",
              "brand_id",
              "name",
              "subject",
              "preview_text",
              "html_body",
              "featured_url",
              "primary_banner_url",
              "cta_primary_text",
              "cta_primary_url",
              "cta_secondary_text",
              "cta_secondary_url",
              "extra_banner_url_1",
              "extra_banner_url_2",
              "youtube_url",
              "footer_text",
              "compliance_text",
              "unsubscribe_url",
            ].join(",")
          )
          .eq("id", campaignId)
          .single();

        if (error) throw new Error(error.message || "Failed to load campaign.");

        const row = ((data as unknown) || ({} as CampaignRow)) as CampaignRow;
        if (!row?.id) throw new Error("Campaign row missing id.");

        let loadedBrand: BrandRow | null = null;

        if (row.brand_id) {
          const { data: b, error: bErr } = await supabase
            .from("brands")
            .select(
              [
                "id",
                "name",
                "from_name",
                "sender_email",
                "reply_to_email",
                "footer_text",
                "accent_color",
                "logo_url",
                "signature_title",
                "signature_company",
                "signature_website",
                "signature_phone",
                "signature_address",
                "signature_disclaimer",
              ].join(",")
            )
            .eq("id", row.brand_id)
            .maybeSingle();

          if (!bErr && b) {
            loadedBrand = (b as unknown) as BrandRow;
          }
        }

        const nextBrandName = getBrandName(loadedBrand);
        const appOrigin = window.location.origin;
        const emailHtml = buildEmailHtml(row, loadedBrand, appOrigin);
        const emailText = buildEmailText(row, loadedBrand);

        if (!mounted) return;

        setCampaign(row);
        setBrand(loadedBrand);
        setBrandName(nextBrandName);
        setHtml(emailHtml);
        setText(emailText);

        if (loadedBrand) {
          setSendFrom(buildFromValue(loadedBrand, "CoreHQ <hello@corehq.company>"));
          setSendReplyTo(safeText(loadedBrand.reply_to_email) || "support@corehq.company");
        }
      } catch (e: any) {
        if (!mounted) return;
        showToast("error", e?.message || "Load failed.");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    run();

    return () => {
      mounted = false;
    };
  }, [campaignId]);

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showToast("success", `${label} copied.`);
    } catch {
      showToast("error", `Copy failed (${label}).`);
    }
  };

  const addSelectedContact = () => {
    if (!selectedContactEmail) {
      showToast("error", "Select a contact first.");
      return;
    }

    setSendToInput((current) => appendRecipient(current, selectedContactEmail));
    setSelectedContactEmail("");
    showToast("success", "Contact added to Send To.");
  };

  const saveSnapshots = async () => {
    if (!campaign?.id) {
      showToast("error", "No campaign loaded.");
      return;
    }

    if (!campaign.brand_id) {
      showToast("error", "Campaign brand_id is missing. Edit this campaign and select the correct brand first.");
      return;
    }

    if (!brand) {
      showToast("error", "Brand settings were not loaded. Check campaign brand_id and Brand Settings.");
      return;
    }

    setSaving(true);

    try {
      const freshHtml = buildEmailHtml(campaign, brand, window.location.origin);
      const freshText = buildEmailText(campaign, brand);

      const payload = {
        campaign_id: campaign.id,
        brand_id: campaign.brand_id,
        subject: campaign.subject || null,
        preview_text: campaign.preview_text || null,
        html_snapshot: freshHtml,
        text_snapshot: freshText,
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("emails").insert(payload);
      if (error) throw new Error(error.message || "Failed to save snapshots.");

      setHtml(freshHtml);
      setText(freshText);

      showToast("success", "Snapshots saved with latest brand signature.");
    } catch (e: any) {
      showToast("error", e?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const sendCampaign = async () => {
    if (!campaignId) {
      showToast("error", "Missing campaign id.");
      return;
    }

    const to = parseRecipients(sendToInput);

    if (!to.length) {
      showToast("error", "Add at least one recipient email in Send To.");
      return;
    }

    const from = buildFromValue(brand, sendFrom);
    const replyTo = safeText(brand?.reply_to_email) || (sendReplyTo || "").trim();

    setSending(true);

    try {
      const res = await fetch("/api/send-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          to,
          from,
          ...(replyTo ? { replyTo } : {}),
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        const msg =
          (json && typeof json.error === "string" && json.error) ||
          `Send failed (HTTP ${res.status}).`;
        throw new Error(msg);
      }

      showToast("success", `Queued ${to.length} recipient(s).`);
    } catch (e: any) {
      showToast("error", e?.message || "Send failed.");
    } finally {
      setSending(false);
    }
  };

  const sendNowCampaign = async () => {
    if (!campaignId) {
      showToast("error", "Missing campaign id.");
      return;
    }

    const to = parseRecipients(sendToInput);

    if (!to.length) {
      showToast("error", "Add at least one recipient email in Send To.");
      return;
    }

    const from = buildFromValue(brand, sendFrom);
    const replyTo = safeText(brand?.reply_to_email) || (sendReplyTo || "").trim();

    setSendingNow(true);

    try {
      const queueRes = await fetch("/api/send-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          to,
          from,
          ...(replyTo ? { replyTo } : {}),
        }),
      });

      const queueJson = await queueRes.json().catch(() => null);

      if (!queueRes.ok || !queueJson?.ok) {
        const msg =
          (queueJson && typeof queueJson.error === "string" && queueJson.error) ||
          `Queue failed (HTTP ${queueRes.status}).`;
        throw new Error(msg);
      }

      const workerRes = await fetch("/api/process-campaign-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const workerJson = await workerRes.json().catch(() => null);

      if (!workerRes.ok || !workerJson?.ok) {
        const msg =
          (workerJson && typeof workerJson.error === "string" && workerJson.error) ||
          `Worker failed (HTTP ${workerRes.status}).`;
        throw new Error(msg);
      }

      showToast(
        "success",
        `Queued ${to.length}. Sent ${workerJson.processed || 0} email(s).`
      );
    } catch (e: any) {
      showToast("error", e?.message || "Send Now failed.");
    } finally {
      setSendingNow(false);
    }
  };

  return (
    <div className="page">
      <style>{`
        .page{
          min-height: calc(100vh - 64px);
          display:flex;
          align-items:flex-start;
          justify-content:center;
          padding: 28px 16px;
        }

        .wrap{
          width:100%;
          max-width: 1320px;
        }

        .card{
          width:100%;
          border-radius:18px;
          padding:24px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.10);
          box-shadow:
            0 20px 80px rgba(0,0,0,0.55),
            inset 0 1px 0 rgba(255,255,255,0.08);
          backdrop-filter: blur(14px);
          position:relative;
          overflow:hidden;
          transform: translateY(10px);
          opacity: 0;
          animation: cardIn 650ms cubic-bezier(.2,.9,.2,1) forwards;
        }

        .shine{
          position:absolute;
          inset:-40%;
          background: conic-gradient(from 180deg, transparent, rgba(255,255,255,0.10), transparent);
          filter: blur(18px);
          animation: spin 10s linear infinite;
          opacity: 0.45;
          pointer-events:none;
        }

        .top{
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap: 16px;
          flex-wrap: wrap;
        }

        .title{
          margin:0;
          font-size:18px;
          font-weight:900;
          letter-spacing: 0.2px;
        }

        .meta{
          margin: 8px 0 0 0;
          font-size: 13px;
          color: rgba(255,255,255,0.68);
          line-height: 1.6;
        }

        .actions{
          display:flex;
          align-items:center;
          gap: 10px;
          flex-wrap: wrap;
          justify-content:flex-end;
        }

        .btn{
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.92);
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 850;
          letter-spacing: 0.2px;
          cursor: pointer;
          transition: transform 140ms ease, background 140ms ease, border-color 140ms ease, opacity 140ms ease;
          user-select:none;
          text-decoration:none;
          display:inline-flex;
          align-items:center;
          justify-content:center;
        }

        .btn:hover{
          transform: translateY(-1px);
          background: rgba(255,255,255,0.12);
          border-color: rgba(255,255,255,0.22);
        }

        .btn:active{ transform: translateY(0px); }

        .btnPrimary{
          border: 0;
          background: linear-gradient(135deg, rgba(59,130,246,1), rgba(168,85,247,1));
          box-shadow: 0 16px 40px rgba(59,130,246,0.14);
        }

        .btnPrimary:hover{
          box-shadow: 0 22px 48px rgba(168,85,247,0.16);
        }

        .btn:disabled{
          cursor:not-allowed;
          opacity: 0.55;
        }

        .grid{
          margin-top: 16px;
          display:grid;
          grid-template-columns: minmax(520px, 0.95fr) minmax(520px, 1.05fr);
          gap: 24px;
          align-items:start;
        }

        .panel{
          min-width:0;
          border-radius:16px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(0,0,0,0.28);
          padding: 16px;
        }

        .panelTitle{
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.24px;
          color: rgba(255,255,255,0.86);
          text-transform: uppercase;
          margin: 0 0 10px 0;
        }

        .iframeWrap{
          width:100%;
          min-width:0;
          border-radius: 14px;
          overflow:hidden;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(0,0,0,0.25);
        }

        iframe{
          width: 100%;
          min-width: 360px;
          height: 640px;
          border: 0;
          background: #fff;
        }

        .code{
          width:100%;
          min-height: 220px;
          max-height: 520px;
          overflow:auto;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(0,0,0,0.38);
          color: rgba(255,255,255,0.90);
          padding: 10px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size: 12px;
          line-height: 1.5;
          white-space: pre;
        }

        .row{
          display:flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }

        .hint{
          margin-top: 12px;
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(0,0,0,0.22);
          color: rgba(255,255,255,0.70);
          font-size: 12px;
          line-height: 1.55;
        }

        .field{
          display:flex;
          flex-direction:column;
          gap: 8px;
          margin-bottom: 10px;
        }

        .label{
          font-size: 12px;
          color: rgba(255,255,255,0.70);
          font-weight: 800;
          letter-spacing: 0.2px;
        }

        .input, .textarea, .select{
          width:100%;
          padding: 11px 12px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(0,0,0,0.38);
          color: rgba(255,255,255,0.92);
          outline: none;
          transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
        }

        .input:focus, .textarea:focus, .select:focus{
          border-color: rgba(59,130,246,0.55);
          box-shadow: 0 0 0 4px rgba(59,130,246,0.16);
          transform: translateY(-1px);
        }

        .textarea{
          min-height: 92px;
          resize: vertical;
        }

        .contactRow{
          display:flex;
          gap:10px;
          align-items:center;
        }

        .contactRow .select{
          flex:1;
        }

        .toast{
          position: fixed;
          right: 16px;
          bottom: 16px;
          width: min(360px, calc(100vw - 32px));
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(10,10,10,0.78);
          backdrop-filter: blur(14px);
          box-shadow: 0 20px 70px rgba(0,0,0,0.55);
          overflow:hidden;
          transform: translateY(10px);
          opacity: 0;
          pointer-events:none;
          z-index: 9999;
        }

        .toastOpen{
          animation: toastIn 260ms cubic-bezier(.2,.9,.2,1) forwards;
          pointer-events:auto;
        }

        .toastClose{
          animation: toastOut 220ms ease forwards;
          pointer-events:none;
        }

        .toastBar{ height: 3px; background: var(--toastAccent); }

        .toastBody{ display:flex; gap: 10px; padding: 10px 12px; align-items:flex-start; }

        .toastDot{
          margin-top: 3px;
          height: 9px;
          width: 9px;
          border-radius: 999px;
          background: var(--toastAccent);
          box-shadow: 0 0 0 4px color-mix(in srgb, var(--toastAccent) 25%, transparent);
          flex: 0 0 auto;
        }

        .toastText{ font-size: 12px; color: rgba(255,255,255,0.88); line-height: 1.45; }

        @keyframes cardIn{
          from{ transform: translateY(14px) scale(0.98); opacity: 0; }
          to{ transform: translateY(0px) scale(1); opacity: 1; }
        }

        @keyframes spin{
          from{ transform: rotate(0deg); }
          to{ transform: rotate(360deg); }
        }

        @keyframes toastIn{
          from{ transform: translateY(10px); opacity: 0; }
          to{ transform: translateY(0px); opacity: 1; }
        }

        @keyframes toastOut{
          from{ transform: translateY(0px); opacity: 1; }
          to{ transform: translateY(10px); opacity: 0; }
        }

        @media (max-width: 1180px){
          .grid{ grid-template-columns: 1fr; }
          iframe{ height: 560px; min-width:0; }
        }

        @media (max-width: 640px){
          .contactRow{ flex-direction:column; align-items:stretch; }
        }

        @media (prefers-reduced-motion: reduce){
          .card, .shine, .toastOpen, .toastClose { animation: none !important; }
          .card{ opacity: 1; transform: none; }
          .btn, .input, .textarea, .select{ transition: none !important; }
          .toast{ opacity: 1; transform:none; }
        }
      `}</style>

      <InlineToast open={toastOpen} kind={toastKind} message={toastMsg} />

      <div className="wrap">
        <div className="card">
          <div className="shine" />

          <div className="top">
            <div>
              <h1 className="title">Campaign Preview</h1>
              <p className="meta">
                {campaignId ? (
                  <>
                    Campaign ID: <b>{campaignId}</b> • Brand: <b>{brandName}</b>
                  </>
                ) : (
                  <>Missing campaign id query param.</>
                )}
              </p>
            </div>

            <div className="actions">
              <Link className="btn" href="/campaigns">
                ← Back
              </Link>
              <button className="btn" onClick={() => copy(html, "HTML")} disabled={!html || loading}>
                Copy HTML
              </button>
              <button className="btn" onClick={() => copy(text, "Text")} disabled={!text || loading}>
                Copy Text
              </button>
              <button
                className="btn btnPrimary"
                onClick={saveSnapshots}
                disabled={loading || saving || !campaign}
                title="Inserts latest html_snapshot + text_snapshot into emails table"
              >
                {saving ? "Saving…" : "Save Snapshots"}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="hint">Loading campaign and generating preview…</div>
          ) : !campaign ? (
            <div className="hint">
              No campaign loaded. Ensure the URL is:
              <br />
              <b>/campaigns/preview?id=&lt;campaign_id&gt;</b>
            </div>
          ) : (
            <>
              <div className="grid">
                <div className="panel">
                  <p className="panelTitle">Rendered email preview</p>
                  <div className="iframeWrap">
                    <iframe
                      title="Email preview"
                      sandbox="allow-popups allow-popups-to-escape-sandbox"
                      srcDoc={html}
                    />
                  </div>
                </div>

                <div className="panel">
                  <p className="panelTitle">Send Campaign</p>

                  <div className="field">
                    <label className="label" htmlFor="contact_select">
                      Add Contact
                    </label>
                    <div className="contactRow">
                      <select
                        id="contact_select"
                        className="select"
                        value={selectedContactEmail}
                        onChange={(e) => setSelectedContactEmail(e.target.value)}
                      >
                        <option value="">
                          {contacts.length ? "Select contact email" : "No contacts found"}
                        </option>
                        {contacts.map((contact) => (
                          <option key={contact.id} value={contact.email || ""}>
                            {(contact.name || "Unnamed Contact") + " — " + (contact.email || "")}
                          </option>
                        ))}
                      </select>
                      <button
                        className="btn"
                        type="button"
                        onClick={addSelectedContact}
                        disabled={!selectedContactEmail}
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  <div className="field">
                    <label className="label" htmlFor="send_to">
                      Send To (comma / newline separated)
                    </label>
                    <textarea
                      id="send_to"
                      className="textarea"
                      value={sendToInput}
                      onChange={(e) => setSendToInput(e.target.value)}
                      placeholder={"test@example.com\nsecond@example.com"}
                    />
                  </div>

                  <div className="field">
                    <label className="label" htmlFor="send_from">
                      From
                    </label>
                    <input
                      id="send_from"
                      className="input"
                      value={sendFrom}
                      onChange={(e) => setSendFrom(e.target.value)}
                      placeholder="CoreHQ <hello@corehq.company>"
                      autoComplete="off"
                    />
                  </div>

                  <div className="field">
                    <label className="label" htmlFor="reply_to">
                      Reply-To (optional)
                    </label>
                    <input
                      id="reply_to"
                      className="input"
                      value={sendReplyTo}
                      onChange={(e) => setSendReplyTo(e.target.value)}
                      placeholder="support@corehq.company"
                      autoComplete="off"
                      inputMode="email"
                    />
                  </div>

                  <div className="row">
                    <button
                      className="btn btnPrimary"
                      onClick={sendNowCampaign}
                      disabled={sendingNow || sending || !campaignId}
                      title="Queues recipients and immediately runs the worker"
                    >
                      {sendingNow ? "Sending Now…" : "Send Now"}
                    </button>

                    <button
                      className="btn btnPrimary"
                      onClick={sendCampaign}
                      disabled={sending || sendingNow || !campaignId}
                      title="Queues latest saved snapshots for worker processing"
                    >
                      {sending ? "Sending…" : "Send Campaign"}
                    </button>

                    <button className="btn" onClick={() => copy(text, "Text")} disabled={!text}>
                      Copy Text
                    </button>
                    <button className="btn" onClick={() => copy(html, "HTML")} disabled={!html}>
                      Copy HTML
                    </button>
                  </div>

                  <p className="panelTitle" style={{ marginTop: 14 }}>
                    Plain text
                  </p>
                  <pre className="code">{text}</pre>

                  <p className="panelTitle" style={{ marginTop: 14 }}>
                    HTML source
                  </p>
                  <pre className="code">{html}</pre>
                </div>
              </div>

              <div className="hint">
                Notes:
                <br />• Brand logo, accent color, signature, and footer are injected directly from Brand Settings.
                <br />• Save Snapshots now rebuilds from the latest loaded brand settings before inserting.
                <br />• Campaign footer overrides brand footer only when campaign footer has content.
                <br />• Select a contact and click <b>Add</b> to place the email into Send To.
                <br />• After changing Brand Settings, open Preview again and click <b>Save Snapshots</b>.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}