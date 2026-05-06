"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../../src/lib/supabaseClient";

type ToastKind = "success" | "error" | "info";

type BrandRow = {
  id: string;
  name: string;
  slug: string | null;
};

type SegmentRow = {
  id: string;
  name: string;
  brand_id: string;
  rules: any;
  created_at: string | null;
};

type TemplateRow = {
  id: string;
  name: string | null;
  subject: string | null;
  html_body: string | null;
  created_at: string | null;
};

type ContactRow = {
  id: string;
  name: string | null;
  email: string | null;
  company: string | null;
  country: string | null;
  created_at: string | null;
};

type CampaignEditRow = {
  id: string;
  brand_id: string | null;
  name: string | null;
  subject: string | null;
  preview_text: string | null;
  scheduled_at: string | null;
  status: string | null;
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

function toDatetimeLocal(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  const pad = (n: number) => String(n).padStart(2, "0");

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function parseRecipients(input: string) {
  const raw = input
    .split(/[\n,;]+/g)
    .map((s) => s.trim())
    .filter(Boolean);

  const uniq: string[] = [];
  const seen = new Set<string>();

  for (const email of raw) {
    const key = email.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      uniq.push(email);
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

function removeRecipient(current: string, email: string) {
  const target = email.trim().toLowerCase();
  return parseRecipients(current)
    .filter((item) => item.toLowerCase() !== target)
    .join("\n");
}

export default function NewCampaignPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const BRAND_STORAGE_KEY = "corehq.activeBrand";
  const PREVIEW_SEND_TO_KEY = "corehq.preview.sendTo";
  const editId = (searchParams.get("id") || "").trim();

  const [activeBrand, setActiveBrand] = useState<string>("(loading brand…)");
  const [campaignId, setCampaignId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");

  const [featuredUrl, setFeaturedUrl] = useState("");
  const [primaryBannerUrl, setPrimaryBannerUrl] = useState("");

  const [ctaPrimaryText, setCtaPrimaryText] = useState("");
  const [ctaPrimaryUrl, setCtaPrimaryUrl] = useState("");
  const [ctaSecondaryText, setCtaSecondaryText] = useState("");
  const [ctaSecondaryUrl, setCtaSecondaryUrl] = useState("");

  const [extraBannerUrl1, setExtraBannerUrl1] = useState("");
  const [extraBannerUrl2, setExtraBannerUrl2] = useState("");

  const [youtubeUrl, setYoutubeUrl] = useState("");

  const [footerText, setFooterText] = useState("");
  const [complianceText, setComplianceText] = useState("");
  const [unsubscribeUrl, setUnsubscribeUrl] = useState("");

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadingCampaign, setLoadingCampaign] = useState(false);

  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [brandId, setBrandId] = useState("");
  const [segments, setSegments] = useState<SegmentRow[]>([]);
  const [segmentId, setSegmentId] = useState("");
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [builderLoading, setBuilderLoading] = useState(false);

  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [selectedContactEmail, setSelectedContactEmail] = useState("");
  const [sendToInput, setSendToInput] = useState("");

  const [toastOpen, setToastOpen] = useState(false);
  const [toastKind, setToastKind] = useState<ToastKind>("info");
  const [toastMsg, setToastMsg] = useState("");
  const toastTimer = useRef<number | null>(null);

  const selectedTemplate = useMemo(() => {
    return templates.find((template) => template.id === templateId) || null;
  }, [templates, templateId]);

  const selectedContactEmails = useMemo(() => {
    return parseRecipients(sendToInput);
  }, [sendToInput]);

  const templatePreviewSubject = useMemo(() => {
    return (selectedTemplate?.subject || "")
      .replaceAll("{{name}}", "Alex")
      .replaceAll("{{email}}", "alex@example.com")
      .replaceAll("{{company}}", "The Globe")
      .replaceAll("{{country}}", "Thailand");
  }, [selectedTemplate]);

  const templatePreviewBody = useMemo(() => {
    return (selectedTemplate?.html_body || "")
      .replaceAll("{{name}}", "Alex")
      .replaceAll("{{email}}", "alex@example.com")
      .replaceAll("{{company}}", "The Globe")
      .replaceAll("{{country}}", "Thailand");
  }, [selectedTemplate]);

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
      const saved = window.localStorage.getItem(BRAND_STORAGE_KEY);
      if (saved && typeof saved === "string") setActiveBrand(saved);
      else setActiveBrand("Tipsy — CoreHQ");
    } catch {
      setActiveBrand("Tipsy — CoreHQ");
    }

    const onBrand = (e: Event) => {
      const ce = e as CustomEvent<{ brand?: string }>;
      if (ce?.detail?.brand) setActiveBrand(ce.detail.brand);
    };

    window.addEventListener("corehq:brand", onBrand as any);
    return () => window.removeEventListener("corehq:brand", onBrand as any);
  }, []);

  useEffect(() => {
    try {
      const savedRecipients = window.localStorage.getItem(PREVIEW_SEND_TO_KEY);
      if (typeof savedRecipients === "string") setSendToInput(savedRecipients);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(PREVIEW_SEND_TO_KEY, sendToInput);
    } catch {}
  }, [sendToInput]);

  useEffect(() => {
    const loadBuilderData = async () => {
      setBuilderLoading(true);

      const [brandRes, templateRes] = await Promise.all([
        supabase.from("brands").select("id,name,slug").order("name", { ascending: true }),
        supabase
          .from("templates")
          .select("id,name,subject,html_body,created_at")
          .order("created_at", { ascending: false }),
      ]);

      setBuilderLoading(false);

      if (brandRes.error) {
        showToast("error", brandRes.error.message || "Failed to load brands.");
      } else {
        const nextBrands = ((brandRes.data ?? []) as unknown) as BrandRow[];
        setBrands(nextBrands);

        if (!brandId && !editId && nextBrands.length > 0) {
          setBrandId(nextBrands[0].id);
        }
      }

      if (templateRes.error) {
        setTemplates([]);
      } else {
        setTemplates(((templateRes.data ?? []) as unknown) as TemplateRow[]);
      }
    };

    loadBuilderData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const loadContacts = async () => {
      setContactsLoading(true);

      const { data, error } = await supabase
        .from("contacts")
        .select("id,name,email,company,country,created_at")
        .order("created_at", { ascending: false });

      setContactsLoading(false);

      if (error) {
        setContacts([]);
        showToast("error", error.message || "Failed to load contacts.");
        return;
      }

      const nextContacts = (((data ?? []) as unknown) as ContactRow[]).filter(
        (contact) => !!contact.email
      );

      setContacts(nextContacts);
    };

    loadContacts();
  }, []);

  useEffect(() => {
    if (!editId) return;

    const loadCampaign = async () => {
      setLoadingCampaign(true);

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
              "scheduled_at",
              "status",
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
          .eq("id", editId)
          .single();

        if (error) throw new Error(error.message || "Failed to load campaign.");

        const row = (data as unknown) as CampaignEditRow;

        setCampaignId(row.id);
        setBrandId(row.brand_id || "");
        setName(row.name || "");
        setSubject(row.subject || "");
        setPreviewText(row.preview_text || "");
        setHtmlBody(row.html_body || "");
        setScheduleAt(toDatetimeLocal(row.scheduled_at));
        setFeaturedUrl(row.featured_url || "");
        setPrimaryBannerUrl(row.primary_banner_url || "");
        setCtaPrimaryText(row.cta_primary_text || "");
        setCtaPrimaryUrl(row.cta_primary_url || "");
        setCtaSecondaryText(row.cta_secondary_text || "");
        setCtaSecondaryUrl(row.cta_secondary_url || "");
        setExtraBannerUrl1(row.extra_banner_url_1 || "");
        setExtraBannerUrl2(row.extra_banner_url_2 || "");
        setYoutubeUrl(row.youtube_url || "");
        setFooterText(row.footer_text || "");
        setComplianceText(row.compliance_text || "");
        setUnsubscribeUrl(row.unsubscribe_url || "");
      } catch (e: any) {
        showToast("error", e?.message || "Failed to load campaign.");
      } finally {
        setLoadingCampaign(false);
      }
    };

    loadCampaign();
  }, [editId]);

  useEffect(() => {
    const loadSegments = async () => {
      if (!brandId) {
        setSegments([]);
        setSegmentId("");
        return;
      }

      const { data, error } = await supabase
        .from("segments")
        .select("id,name,brand_id,rules,created_at")
        .eq("brand_id", brandId)
        .order("created_at", { ascending: false });

      if (error) {
        setSegments([]);
        setSegmentId("");
        return;
      }

      const nextSegments = ((data ?? []) as unknown) as SegmentRow[];
      setSegments(nextSegments);
      setSegmentId((current) =>
        nextSegments.some((segment) => segment.id === current) ? current : ""
      );
    };

    loadSegments();
  }, [brandId]);

  useEffect(() => {
    if (!selectedTemplate) return;

    if (selectedTemplate.subject) {
      setSubject(selectedTemplate.subject);
    }

    if (selectedTemplate.html_body) {
      setHtmlBody(selectedTemplate.html_body);
    }
  }, [selectedTemplate]);

  function normalizeBrandCandidates(brandLabel: string) {
    const raw = (brandLabel || "").trim();
    const out: string[] = [];
    if (raw) out.push(raw);

    const splitDash = raw.split("—")[0]?.trim();
    if (splitDash && splitDash !== raw) out.push(splitDash);

    const splitHyphen = raw.split(" - ")[0]?.trim();
    if (splitHyphen && splitHyphen !== raw && !out.includes(splitHyphen)) out.push(splitHyphen);

    return Array.from(new Set(out)).filter(Boolean);
  }

  const resolveBrandId = async (brandLabel: string) => {
    if (brandId) return brandId;

    const candidates = normalizeBrandCandidates(brandLabel);

    for (const candidate of candidates) {
      const { data, error } = await supabase
        .from("brands")
        .select("id")
        .eq("name", candidate)
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(error.message || "Failed to resolve brand.");
      if (data?.id) return data.id as string;
    }

    const { data: anyBrand, error: anyErr } = await supabase
      .from("brands")
      .select("id,name")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (anyErr) throw new Error(anyErr.message || "Failed to resolve brand.");
    if (anyBrand?.id) return anyBrand.id as string;

    throw new Error(`Brand not found in DB for: ${brandLabel}`);
  };

  const normalizeScheduledAt = (value: string) => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  };

  const normalizeTextOrNull = (value: string) => {
    const v = value.trim();
    return v ? v : null;
  };

  const validate = () => {
    if (!name.trim()) return "Campaign name is required.";
    if (!subject.trim()) return "Subject is required.";
    return null;
  };

  const addSelectedContact = () => {
    if (!selectedContactEmail) {
      showToast("error", "Select a contact first.");
      return;
    }

    setSendToInput((current) => appendRecipient(current, selectedContactEmail));
    setSelectedContactEmail("");
    showToast("success", "Contact added to campaign recipient list.");
  };

  const addAllContacts = () => {
    const emails = contacts
      .map((contact) => contact.email || "")
      .map((email) => email.trim())
      .filter(Boolean);

    if (!emails.length) {
      showToast("error", "No contacts with email found.");
      return;
    }

    setSendToInput((current) => {
      let next = current;
      for (const email of emails) {
        next = appendRecipient(next, email);
      }
      return next;
    });

    showToast("success", `${emails.length} contact(s) added to campaign recipient list.`);
  };

  const clearRecipients = () => {
    setSendToInput("");
    setSelectedContactEmail("");
    showToast("info", "Campaign recipient list cleared.");
  };

  const handleSaveDraft = async () => {
    const err = validate();
    if (err) {
      showToast("error", err);
      return;
    }

    setSaving(true);

    try {
      const resolvedBrandId = await resolveBrandId(activeBrand);

      const payload = {
        brand_id: resolvedBrandId,
        name: name.trim(),
        subject: subject.trim(),
        preview_text: normalizeTextOrNull(previewText),
        html_body: normalizeTextOrNull(htmlBody),
        scheduled_at: normalizeScheduledAt(scheduleAt),
        status: "draft" as any,

        featured_url: normalizeTextOrNull(featuredUrl),
        primary_banner_url: normalizeTextOrNull(primaryBannerUrl),

        cta_primary_text: normalizeTextOrNull(ctaPrimaryText),
        cta_primary_url: normalizeTextOrNull(ctaPrimaryUrl),
        cta_secondary_text: normalizeTextOrNull(ctaSecondaryText),
        cta_secondary_url: normalizeTextOrNull(ctaSecondaryUrl),

        extra_banner_url_1: normalizeTextOrNull(extraBannerUrl1),
        extra_banner_url_2: normalizeTextOrNull(extraBannerUrl2),

        youtube_url: normalizeTextOrNull(youtubeUrl),

        footer_text: normalizeTextOrNull(footerText),
        compliance_text: normalizeTextOrNull(complianceText),
        unsubscribe_url: normalizeTextOrNull(unsubscribeUrl),

        updated_at: new Date().toISOString(),
      };

      if (!campaignId) {
        const { data, error } = await supabase
          .from("campaigns")
          .insert({
            ...payload,
            created_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (error) throw new Error(error.message || "Failed to create campaign.");

        setCampaignId(data.id);
        showToast("success", "Draft campaign created.");
      } else {
        const { error } = await supabase.from("campaigns").update(payload).eq("id", campaignId);
        if (error) throw new Error(error.message || "Failed to update campaign.");

        showToast("success", "Draft campaign updated.");
      }
    } catch (e: any) {
      showToast("error", e?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCampaign = async () => {
    if (!campaignId) {
      showToast("error", "No campaign selected to delete.");
      return;
    }

    const confirmed = window.confirm(
      "Delete this campaign? This will also remove related queued recipients, email snapshots, and logs for this campaign."
    );

    if (!confirmed) return;

    setDeleting(true);

    try {
      await supabase.from("campaign_queue").delete().eq("campaign_id", campaignId);
      await supabase.from("campaign_logs").delete().eq("campaign_id", campaignId);
      await supabase.from("emails").delete().eq("campaign_id", campaignId);

      const { error } = await supabase.from("campaigns").delete().eq("id", campaignId);

      if (error) throw new Error(error.message || "Failed to delete campaign.");

      showToast("success", "Campaign deleted.");
      router.push("/campaigns");
    } catch (e: any) {
      showToast("error", e?.message || "Delete failed.");
    } finally {
      setDeleting(false);
    }
  };

  const previewHref = campaignId ? `/campaigns/preview?id=${campaignId}` : "/campaigns/preview";

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
          max-width: 980px;
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

        .idLine{
          margin: 8px 0 0 0;
          font-size: 12px;
          color: rgba(255,255,255,0.62);
          line-height: 1.5;
          word-break: break-all;
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

        .btnDanger{
          border: 1px solid rgba(239,68,68,0.35);
          background: rgba(239,68,68,0.10);
          color: rgba(254,202,202,1);
        }

        .btn:disabled{
          cursor:not-allowed;
          opacity: 0.55;
        }

        .sectionTitle{
          margin: 18px 0 8px 0;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.24px;
          color: rgba(255,255,255,0.86);
          text-transform: uppercase;
        }

        .grid{
          margin-top: 12px;
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .field{
          display:flex;
          flex-direction:column;
          gap: 8px;
        }

        .fieldFull{
          grid-column:1 / -1;
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
          min-height: 96px;
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

        .recipientBox{
          margin-top:10px;
          border-radius:14px;
          border:1px solid rgba(255,255,255,0.10);
          background:rgba(0,0,0,0.24);
          padding:12px;
        }

        .recipientHeader{
          display:flex;
          justify-content:space-between;
          gap:10px;
          align-items:center;
          flex-wrap:wrap;
          margin-bottom:10px;
        }

        .recipientCount{
          font-size:12px;
          color:rgba(255,255,255,0.70);
          font-weight:800;
        }

        .recipientList{
          display:flex;
          flex-direction:column;
          gap:8px;
          max-height:180px;
          overflow:auto;
        }

        .recipientItem{
          display:flex;
          justify-content:space-between;
          gap:10px;
          align-items:center;
          border-radius:12px;
          padding:9px 10px;
          background:rgba(255,255,255,0.05);
          border:1px solid rgba(255,255,255,0.08);
          color:rgba(255,255,255,0.78);
          font-size:12px;
          word-break:break-word;
        }

        .miniBtn{
          border:1px solid rgba(255,255,255,0.12);
          background:rgba(255,255,255,0.07);
          color:rgba(255,255,255,0.86);
          padding:6px 9px;
          border-radius:10px;
          font-size:11px;
          font-weight:850;
          cursor:pointer;
        }

        .miniBtnDanger{
          border-color:rgba(239,68,68,0.30);
          background:rgba(239,68,68,0.10);
          color:rgba(254,202,202,1);
        }

        .help{
          margin-top: 14px;
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(0,0,0,0.28);
          color: rgba(255,255,255,0.70);
          font-size: 12px;
          line-height: 1.55;
        }

        .builderPreview{
          margin-top: 14px;
          padding: 14px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(0,0,0,0.28);
        }

        .previewSubject{
          font-size: 13px;
          color: rgba(255,255,255,0.92);
          font-weight: 900;
          line-height: 1.5;
        }

        .previewBody{
          margin-top: 8px;
          font-size: 12px;
          color: rgba(255,255,255,0.68);
          line-height: 1.65;
          white-space: pre-wrap;
        }

        .toast{
          position: fixed;
          right: 16px;
          top: 16px;
          width: min(420px, calc(100vw - 32px));
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(10,10,10,0.72);
          backdrop-filter: blur(14px);
          box-shadow: 0 20px 70px rgba(0,0,0,0.55);
          overflow:hidden;
          transform: translateY(-10px);
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

        .toastBody{ display:flex; gap: 10px; padding: 12px; align-items:flex-start; }

        .toastDot{
          margin-top: 3px;
          height: 10px;
          width: 10px;
          border-radius: 999px;
          background: var(--toastAccent);
          box-shadow: 0 0 0 4px color-mix(in srgb, var(--toastAccent) 25%, transparent);
          flex: 0 0 auto;
        }

        .toastText{ font-size: 13px; color: rgba(255,255,255,0.88); line-height: 1.45; }

        @keyframes cardIn{
          from{ transform: translateY(14px) scale(0.98); opacity: 0; }
          to{ transform: translateY(0px) scale(1); opacity: 1; }
        }

        @keyframes spin{
          from{ transform: rotate(0deg); }
          to{ transform: rotate(360deg); }
        }

        @keyframes toastIn{
          from{ transform: translateY(-10px); opacity: 0; }
          to{ transform: translateY(0px); opacity: 1; }
        }

        @keyframes toastOut{
          from{ transform: translateY(0px); opacity: 1; }
          to{ transform: translateY(-10px); opacity: 0; }
        }

        @media (max-width: 860px){
          .top{ flex-direction:column; align-items:stretch; }
          .actions{ justify-content:flex-start; }
          .grid{ grid-template-columns: 1fr; }
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
              <h1 className="title">{campaignId ? "Edit Campaign" : "New Campaign"}</h1>
              <p className="meta">
                Active brand: <b>{activeBrand}</b>
              </p>
              {campaignId ? (
                <p className="idLine">
                  Draft campaign ID: <b>{campaignId}</b>
                </p>
              ) : (
                <p className="idLine">Not saved yet — click Save Draft to create it.</p>
              )}
              {loadingCampaign && <p className="idLine">Loading campaign details...</p>}
            </div>

            <div className="actions">
              <Link className="btn" href="/campaigns">
                ← Back
              </Link>

              {campaignId && (
                <Link className="btn" href={previewHref}>
                  Preview
                </Link>
              )}

              {campaignId && (
                <button
                  type="button"
                  className="btn btnDanger"
                  onClick={handleDeleteCampaign}
                  disabled={deleting || saving}
                >
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              )}

              <button className="btn btnPrimary" onClick={handleSaveDraft} disabled={saving || deleting}>
                {saving ? "Saving…" : campaignId ? "Update Draft" : "Save Draft"}
              </button>
            </div>
          </div>

          <div className="sectionTitle">Campaign Targeting</div>
          <div className="grid" aria-label="Campaign targeting form">
            <div className="field">
              <label className="label" htmlFor="brand_id">
                Brand
              </label>
              <select
                id="brand_id"
                className="select"
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                disabled={builderLoading}
              >
                {brands.length === 0 ? (
                  <option value="">No brands found</option>
                ) : (
                  brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="field">
              <label className="label" htmlFor="segment_id">
                Segment
              </label>
              <select
                id="segment_id"
                className="select"
                value={segmentId}
                onChange={(e) => setSegmentId(e.target.value)}
                disabled={!brandId}
              >
                <option value="">No segment selected</option>
                {segments.map((segment) => (
                  <option key={segment.id} value={segment.id}>
                    {segment.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="label" htmlFor="template_id">
                Template
              </label>
              <select
                id="template_id"
                className="select"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
              >
                <option value="">No template selected</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name || "Untitled Template"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="sectionTitle">Campaign Recipients</div>
          <div className="grid" aria-label="Campaign recipients form">
            <div className="field fieldFull">
              <label className="label" htmlFor="contact_select">
                Add Contact
              </label>
              <div className="contactRow">
                <select
                  id="contact_select"
                  className="select"
                  value={selectedContactEmail}
                  onChange={(e) => setSelectedContactEmail(e.target.value)}
                  disabled={contactsLoading}
                >
                  <option value="">
                    {contactsLoading
                      ? "Loading contacts..."
                      : contacts.length
                      ? "Select contact email"
                      : "No contacts found"}
                  </option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.email || ""}>
                      {(contact.name || "Unnamed Contact") +
                        " — " +
                        (contact.email || "") +
                        (contact.company ? ` — ${contact.company}` : "")}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className="btn"
                  onClick={addSelectedContact}
                  disabled={!selectedContactEmail}
                >
                  Add
                </button>

                <button
                  type="button"
                  className="btn"
                  onClick={addAllContacts}
                  disabled={contactsLoading || contacts.length === 0}
                >
                  Add All
                </button>
              </div>
            </div>

            <div className="field fieldFull">
              <label className="label" htmlFor="send_to">
                Selected Recipients
              </label>
              <textarea
                id="send_to"
                className="textarea"
                value={sendToInput}
                onChange={(e) => setSendToInput(e.target.value)}
                placeholder={"recipient@example.com\nsecond@example.com"}
              />

              <div className="recipientBox">
                <div className="recipientHeader">
                  <div className="recipientCount">
                    {selectedContactEmails.length} recipient(s) selected for Campaign Preview
                  </div>

                  <button
                    type="button"
                    className="miniBtn miniBtnDanger"
                    onClick={clearRecipients}
                    disabled={selectedContactEmails.length === 0}
                  >
                    Clear
                  </button>
                </div>

                {selectedContactEmails.length === 0 ? (
                  <div className="recipientItem">No recipients selected yet.</div>
                ) : (
                  <div className="recipientList">
                    {selectedContactEmails.map((email) => (
                      <div key={email} className="recipientItem">
                        <span>{email}</span>
                        <button
                          type="button"
                          className="miniBtn miniBtnDanger"
                          onClick={() => setSendToInput((current) => removeRecipient(current, email))}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {selectedTemplate && (
            <div className="builderPreview">
              <div className="label">Selected Template Preview</div>
              <div className="previewSubject">{templatePreviewSubject || "No subject"}</div>
              <div className="previewBody">
               {templatePreviewBody
                 ? templatePreviewBody
                 .split(/\n+/)
                 .map((p) => p.trim())
                 .filter(Boolean)
                 .map((p, i) => (
                  <p key={i} style={{ marginBottom: "10px" }}>
                    {p}
                  </p>
                ))
              : "No body"}
            </div>
          )}

          <div className="sectionTitle">Campaign Meta</div>
          <div className="grid" aria-label="Campaign meta form">
            <div className="field">
              <label className="label" htmlFor="name">
                Campaign name (required)
              </label>
              <input
                id="name"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Example: Tipsy February Offer"
                autoComplete="off"
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="subject">
                Subject (required)
              </label>
              <input
                id="subject"
                className="input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Example: Limited-time offer — 20% off this week"
                autoComplete="off"
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="preview">
                Preview text (optional)
              </label>
              <input
                id="preview"
                className="input"
                value={previewText}
                onChange={(e) => setPreviewText(e.target.value)}
                placeholder="Short supporting line that appears in inbox preview…"
                autoComplete="off"
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="schedule">
                Schedule (optional)
              </label>
              <input
                id="schedule"
                className="input"
                value={scheduleAt}
                onChange={(e) => setScheduleAt(e.target.value)}
                type="datetime-local"
              />
            </div>

            <div className="field">
              <label className="label">Status</label>
              <input className="input" value="draft" disabled />
            </div>
          </div>

          <div className="sectionTitle">Offer Content</div>
          <div className="grid" aria-label="Offer content form">
            <div className="field">
              <label className="label" htmlFor="featured_url">
                Featured URL (optional for draft)
              </label>
              <input
                id="featured_url"
                className="input"
                value={featuredUrl}
                onChange={(e) => setFeaturedUrl(e.target.value)}
                placeholder="https://your-offer-link.com"
                autoComplete="off"
                inputMode="url"
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="primary_banner_url">
                Primary banner URL (optional for draft)
              </label>
              <input
                id="primary_banner_url"
                className="input"
                value={primaryBannerUrl}
                onChange={(e) => setPrimaryBannerUrl(e.target.value)}
                placeholder="https://your-cdn.com/banner.png"
                autoComplete="off"
                inputMode="url"
              />
            </div>
          </div>

          <div className="sectionTitle">CTA Block</div>
          <div className="grid" aria-label="CTA block form">
            <div className="field">
              <label className="label" htmlFor="cta_primary_text">
                Primary CTA Text
              </label>
              <input
                id="cta_primary_text"
                className="input"
                value={ctaPrimaryText}
                onChange={(e) => setCtaPrimaryText(e.target.value)}
                placeholder="Example: Claim Offer"
                autoComplete="off"
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="cta_primary_url">
                Primary CTA URL
              </label>
              <input
                id="cta_primary_url"
                className="input"
                value={ctaPrimaryUrl}
                onChange={(e) => setCtaPrimaryUrl(e.target.value)}
                placeholder="https://your-primary-cta-link.com"
                autoComplete="off"
                inputMode="url"
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="cta_secondary_text">
                Secondary CTA Text
              </label>
              <input
                id="cta_secondary_text"
                className="input"
                value={ctaSecondaryText}
                onChange={(e) => setCtaSecondaryText(e.target.value)}
                placeholder="Example: Learn More"
                autoComplete="off"
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="cta_secondary_url">
                Secondary CTA URL
              </label>
              <input
                id="cta_secondary_url"
                className="input"
                value={ctaSecondaryUrl}
                onChange={(e) => setCtaSecondaryUrl(e.target.value)}
                placeholder="https://your-secondary-cta-link.com"
                autoComplete="off"
                inputMode="url"
              />
            </div>
          </div>

          <div className="sectionTitle">Extra Banners</div>
          <div className="grid" aria-label="Extra banners form">
            <div className="field">
              <label className="label" htmlFor="extra_banner_url_1">
                Extra banner URL #1
              </label>
              <input
                id="extra_banner_url_1"
                className="input"
                value={extraBannerUrl1}
                onChange={(e) => setExtraBannerUrl1(e.target.value)}
                placeholder="https://your-cdn.com/extra-banner-1.png"
                autoComplete="off"
                inputMode="url"
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="extra_banner_url_2">
                Extra banner URL #2
              </label>
              <input
                id="extra_banner_url_2"
                className="input"
                value={extraBannerUrl2}
                onChange={(e) => setExtraBannerUrl2(e.target.value)}
                placeholder="https://your-cdn.com/extra-banner-2.png"
                autoComplete="off"
                inputMode="url"
              />
            </div>
          </div>

          <div className="sectionTitle">YouTube Preview</div>
          <div className="grid" aria-label="YouTube preview form">
            <div className="field">
              <label className="label" htmlFor="youtube_url">
                YouTube URL
              </label>
              <input
                id="youtube_url"
                className="input"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                autoComplete="off"
                inputMode="url"
              />
            </div>
          </div>

          <div className="sectionTitle">Footer + Compliance</div>
          <div className="grid" aria-label="Footer and compliance form">
            <div className="field">
              <label className="label" htmlFor="footer_text">
                Campaign footer override (optional)
              </label>
              <textarea
                id="footer_text"
                className="textarea"
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                placeholder="Leave empty to use the selected brand footer/signature automatically..."
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="compliance_text">
                Compliance text (optional)
              </label>
              <textarea
                id="compliance_text"
                className="textarea"
                value={complianceText}
                onChange={(e) => setComplianceText(e.target.value)}
                placeholder="Why they received this email, consent line, etc..."
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="unsubscribe_url">
                Unsubscribe URL (optional for draft)
              </label>
              <input
                id="unsubscribe_url"
                className="input"
                value={unsubscribeUrl}
                onChange={(e) => setUnsubscribeUrl(e.target.value)}
                placeholder="https://corehq.company/unsubscribe?..."
                autoComplete="off"
                inputMode="url"
              />
            </div>
          </div>

          <div className="help">
            Contacts added here are saved into the Campaign Preview recipient list automatically. After saving the draft,
            click Preview to save snapshots and send the campaign.
          </div>
        </div>
      </div>
    </div>
  );
}