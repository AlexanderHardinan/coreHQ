"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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

export default function NewCampaignPage() {
  const BRAND_STORAGE_KEY = "corehq.activeBrand";

  const [activeBrand, setActiveBrand] = useState<string>("(loading brand…)");

  const [campaignId, setCampaignId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
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

  // ✅ ADDED — Phase 7.1 campaign builder selectors only
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [brandId, setBrandId] = useState("");
  const [segments, setSegments] = useState<SegmentRow[]>([]);
  const [segmentId, setSegmentId] = useState("");
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [builderLoading, setBuilderLoading] = useState(false);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastKind, setToastKind] = useState<ToastKind>("info");
  const [toastMsg, setToastMsg] = useState("");
  const toastTimer = useRef<number | null>(null);

  const selectedTemplate = useMemo(() => {
    return templates.find((template) => template.id === templateId) || null;
  }, [templates, templateId]);

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

  // ✅ ADDED — Phase 7.1 load brands/templates only
  useEffect(() => {
    const loadBuilderData = async () => {
      setBuilderLoading(true);

      const [brandRes, templateRes] = await Promise.all([
        supabase.from("brands").select("id,name,slug").order("name", { ascending: true }),
        supabase.from("templates").select("id,name,subject,html_body,created_at").order("created_at", { ascending: false }),
      ]);

      setBuilderLoading(false);

      if (brandRes.error) {
        showToast("error", brandRes.error.message || "Failed to load brands.");
      } else {
        const nextBrands = ((brandRes.data ?? []) as unknown) as BrandRow[];
        setBrands(nextBrands);

        if (!brandId && nextBrands.length > 0) {
          setBrandId(nextBrands[0].id);
        }
      }

      if (templateRes.error) {
        showToast("error", templateRes.error.message || "Failed to load templates.");
      } else {
        setTemplates(((templateRes.data ?? []) as unknown) as TemplateRow[]);
      }
    };

    loadBuilderData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ ADDED — Phase 7.1 load saved segments by selected brand only
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
        showToast("error", error.message || "Failed to load segments.");
        return;
      }

      const nextSegments = ((data ?? []) as unknown) as SegmentRow[];
      setSegments(nextSegments);
      setSegmentId((current) => (nextSegments.some((segment) => segment.id === current) ? current : ""));
    };

    loadSegments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandId]);

  // ✅ ADDED — Phase 7.1 apply selected template to campaign subject only
  useEffect(() => {
    if (!selectedTemplate) return;

    if (selectedTemplate.subject) {
      setSubject(selectedTemplate.subject);
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

    for (const name of candidates) {
      const { data, error } = await supabase
        .from("brands")
        .select("id")
        .eq("name", name)
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
        scheduled_at: normalizeScheduledAt(scheduleAt),
        status: "draft" as any,

        // ✅ ADDED — Phase 7.1 preserve selected segment/template links if columns exist
        segment_id: normalizeTextOrNull(segmentId),
        template_id: normalizeTextOrNull(templateId),

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

        .label{
          font-size: 12px;
          color: rgba(255,255,255,0.70);
          font-weight: 800;
          letter-spacing: 0.2px;
        }

        .input, .textarea{
          width:100%;
          padding: 11px 12px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(0,0,0,0.38);
          color: rgba(255,255,255,0.92);
          outline: none;
          transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
        }
        .input:focus, .textarea:focus{
          border-color: rgba(59,130,246,0.55);
          box-shadow: 0 0 0 4px rgba(59,130,246,0.16);
          transform: translateY(-1px);
        }
        .textarea{
          min-height: 96px;
          resize: vertical;
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

        /* Toast */
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
        }

        @media (prefers-reduced-motion: reduce){
          .card, .shine, .toastOpen, .toastClose { animation: none !important; }
          .card{ opacity: 1; transform: none; }
          .btn, .input, .textarea{ transition: none !important; }
          .toast{ opacity: 1; transform:none; }
        }
      `}</style>

      <InlineToast open={toastOpen} kind={toastKind} message={toastMsg} />

      <div className="wrap">
        <div className="card">
          <div className="shine" />

          <div className="top">
            <div>
              <h1 className="title">New Campaign</h1>
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
            </div>

            <div className="actions">
              <Link className="btn" href="/campaigns">
                ← Back
              </Link>
              <button className="btn btnPrimary" onClick={handleSaveDraft} disabled={saving}>
                {saving ? "Saving…" : "Save Draft"}
              </button>
            </div>
          </div>

          {/* ✅ ADDED — Phase 7.1 Builder Selectors */}
          <div className="sectionTitle">Phase 7.1 — Campaign Targeting</div>
          <div className="grid" aria-label="Campaign targeting form">
            <div className="field">
              <label className="label" htmlFor="brand_id">
                Brand
              </label>
              <select
                id="brand_id"
                className="input"
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
                className="input"
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
                className="input"
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

          {selectedTemplate && (
            <div className="builderPreview">
              <div className="label">Selected Template Preview</div>
              <div className="previewSubject">{templatePreviewSubject || "No subject"}</div>
              <div className="previewBody">{templatePreviewBody || "No body"}</div>
            </div>
          )}

          <div className="sectionTitle">Phase 5.1 — Campaign Meta</div>
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

          <div className="sectionTitle">Phase 5.2 — Offer Content</div>
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

          <div className="sectionTitle">Phase 5.3 — CTA Block (Primary + Secondary)</div>
          <div className="grid" aria-label="CTA block form">
            <div className="field">
              <label className="label" htmlFor="cta_primary_text">
                Primary CTA Text (required when publishing)
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
                Primary CTA URL (required when publishing)
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
                Secondary CTA Text (required when publishing)
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
                Secondary CTA URL (required when publishing)
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

          <div className="sectionTitle">Phase 5.4 — Extra Banners (Optional)</div>
          <div className="grid" aria-label="Extra banners form">
            <div className="field">
              <label className="label" htmlFor="extra_banner_url_1">
                Extra banner URL #1 (optional)
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
                Extra banner URL #2 (optional)
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

          <div className="sectionTitle">Phase 5.5 — YouTube Preview (Optional)</div>
          <div className="grid" aria-label="YouTube preview form">
            <div className="field">
              <label className="label" htmlFor="youtube_url">
                YouTube URL (optional)
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

          <div className="sectionTitle">Phase 5.6 — Footer + Compliance</div>
          <div className="grid" aria-label="Footer and compliance form">
            <div className="field">
              <label className="label" htmlFor="footer_text">
                Footer text (optional)
              </label>
              <textarea
                id="footer_text"
                className="textarea"
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                placeholder="Brand footer / address / contact info..."
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
                placeholder="https://corehq.io/unsubscribe?..."
                autoComplete="off"
                inputMode="url"
              />
            </div>
          </div>

          <div className="help">
            Phase 7.1: Brand, Segment, and Template selection are now available. No sending is enabled yet.
          </div>
        </div>
      </div>
    </div>
  );
}