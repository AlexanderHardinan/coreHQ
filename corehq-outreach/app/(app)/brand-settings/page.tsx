"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../../src/lib/supabaseClient";

type Brand = {
  id: string;
  name: string;
  slug: string | null;
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

type ToastKind = "success" | "error" | "info";

function isValidEmail(value: string) {
  if (!value.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function Toast({
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

export default function BrandSettingsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandId, setBrandId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [fromName, setFromName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [replyToEmail, setReplyToEmail] = useState("");
  const [footerText, setFooterText] = useState("");
  const [accentColor, setAccentColor] = useState("#3b82f6");
  const [logoUrl, setLogoUrl] = useState("");

  const [signatureTitle, setSignatureTitle] = useState("");
  const [signatureCompany, setSignatureCompany] = useState("");
  const [signatureWebsite, setSignatureWebsite] = useState("");
  const [signaturePhone, setSignaturePhone] = useState("");
  const [signatureAddress, setSignatureAddress] = useState("");
  const [signatureDisclaimer, setSignatureDisclaimer] = useState("");

  const [toastOpen, setToastOpen] = useState(false);
  const [toastKind, setToastKind] = useState<ToastKind>("info");
  const [toastMsg, setToastMsg] = useState("");
  const toastTimer = useRef<number | null>(null);

  const selectedBrand = brands.find((brand) => brand.id === brandId) || null;

  const showToast = (kind: ToastKind, msg: string) => {
    setToastKind(kind);
    setToastMsg(msg);
    setToastOpen(true);

    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastOpen(false), 2600);
  };

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  const loadBrands = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("brands")
      .select(
        [
          "id",
          "name",
          "slug",
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
      .order("name", { ascending: true });

    if (error) {
      showToast("error", error.message || "Failed to load brand settings.");
      setBrands([]);
      setLoading(false);
      return;
    }

    const list = ((data || []) as unknown) as Brand[];
    setBrands(list);

    if (!brandId && list.length > 0) {
      setBrandId(list[0].id);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadBrands();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedBrand) return;

    setName(selectedBrand.name || "");
    setFromName(selectedBrand.from_name || selectedBrand.name || "");
    setSenderEmail(selectedBrand.sender_email || "hello@corehq.company");
    setReplyToEmail(selectedBrand.reply_to_email || "support@corehq.company");
    setFooterText(selectedBrand.footer_text || "");
    setAccentColor(selectedBrand.accent_color || "#3b82f6");
    setLogoUrl(selectedBrand.logo_url || "");

    setSignatureTitle(selectedBrand.signature_title || "");
    setSignatureCompany(selectedBrand.signature_company || selectedBrand.name || "");
    setSignatureWebsite(selectedBrand.signature_website || "https://corehq.company");
    setSignaturePhone(selectedBrand.signature_phone || "");
    setSignatureAddress(selectedBrand.signature_address || "");
    setSignatureDisclaimer(selectedBrand.signature_disclaimer || "");
  }, [selectedBrand]);

  const saveBrand = async () => {
    if (!brandId) {
      showToast("error", "Select a brand first.");
      return;
    }

    if (!name.trim()) {
      showToast("error", "Brand name is required.");
      return;
    }

    if (!isValidEmail(senderEmail)) {
      showToast("error", "Sender email is invalid.");
      return;
    }

    if (!isValidEmail(replyToEmail)) {
      showToast("error", "Reply-to email is invalid.");
      return;
    }

    setSaving(true);

    const nextBrand = {
      name: name.trim(),
      from_name: fromName.trim() || null,
      sender_email: senderEmail.trim() || null,
      reply_to_email: replyToEmail.trim() || null,
      footer_text: footerText.trim() || null,
      accent_color: accentColor.trim() || "#3b82f6",
      logo_url: logoUrl.trim() || null,
      signature_title: signatureTitle.trim() || null,
      signature_company: signatureCompany.trim() || null,
      signature_website: signatureWebsite.trim() || null,
      signature_phone: signaturePhone.trim() || null,
      signature_address: signatureAddress.trim() || null,
      signature_disclaimer: signatureDisclaimer.trim() || null,
    };

    const { error } = await supabase.from("brands").update(nextBrand).eq("id", brandId);

    setSaving(false);

    if (error) {
      showToast("error", error.message || "Failed to save brand settings.");
      return;
    }

    setBrands((current) =>
      current.map((brand) => (brand.id === brandId ? { ...brand, ...nextBrand } : brand))
    );

    showToast("success", "Brand settings saved.");
  };

  const senderPreview = `${fromName || name || "Brand"} <${
    senderEmail || "hello@corehq.company"
  }>`;

  return (
    <div className="page">
      <style>{`
        .page{
          min-height: calc(100vh - 64px);
          display:flex;
          align-items:center;
          justify-content:center;
          padding:24px 16px;
        }

        .card{
          width:100%;
          max-width: 960px;
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

        .content{
          position:relative;
          z-index:1;
        }

        .title{
          margin:0;
          font-size:18px;
          font-weight:900;
          letter-spacing: 0.2px;
        }

        .sub{
          margin: 8px 0 0 0;
          font-size: 13px;
          color: rgba(255,255,255,0.68);
          line-height: 1.6;
        }

        .sectionTitle{
          margin:22px 0 0 0;
          font-size:12px;
          font-weight:900;
          color:rgba(255,255,255,0.86);
          text-transform:uppercase;
          letter-spacing:0.28px;
        }

        .grid{
          margin-top:18px;
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:14px;
        }

        .field{
          display:flex;
          flex-direction:column;
          gap:8px;
        }

        .fieldFull{
          grid-column:1 / -1;
        }

        .label{
          font-size:12px;
          color:rgba(255,255,255,0.72);
          font-weight:800;
        }

        .input,
        .textarea,
        .select{
          width:100%;
          border-radius:12px;
          border:1px solid rgba(255,255,255,0.12);
          background:rgba(0,0,0,0.40);
          color:white;
          padding:11px 12px;
          outline:none;
        }

        .textarea{
          min-height:120px;
          resize:vertical;
        }

        .preview{
          margin-top:18px;
          border-radius:14px;
          padding:14px;
          border:1px solid rgba(255,255,255,0.10);
          background:rgba(0,0,0,0.28);
        }

        .previewBadge{
          display:inline-flex;
          border-radius:999px;
          padding:6px 10px;
          font-size:12px;
          font-weight:900;
          color:white;
          background:${accentColor || "#3b82f6"};
        }

        .previewSignature{
          margin-top:14px;
          border-radius:14px;
          padding:14px;
          background:rgba(255,255,255,0.05);
          border:1px solid rgba(255,255,255,0.08);
        }

        .logoBox{
          margin-bottom:12px;
          display:flex;
          align-items:center;
          gap:12px;
        }

        .logoPreview{
          max-height:46px;
          max-width:180px;
          object-fit:contain;
          display:block;
          border-radius:10px;
          background:rgba(255,255,255,0.04);
          border:1px solid rgba(255,255,255,0.08);
          padding:6px;
        }

        .previewName{
          font-size:14px;
          font-weight:950;
          color:white;
        }

        .previewRole{
          margin-top:4px;
          font-size:12px;
          color:rgba(255,255,255,0.70);
        }

        .previewLine{
          margin-top:10px;
          font-size:12px;
          color:rgba(255,255,255,0.68);
          line-height:1.6;
          word-break:break-word;
        }

        .warning{
          margin-top:12px;
          border-radius:12px;
          padding:12px;
          background:rgba(245,158,11,0.10);
          border:1px solid rgba(245,158,11,0.22);
          color:rgba(253,230,138,1);
          font-size:12px;
          line-height:1.55;
        }

        .btn{
          margin-top:18px;
          width:100%;
          border:0;
          border-radius:12px;
          padding:12px 14px;
          background:linear-gradient(135deg, rgba(59,130,246,1), rgba(168,85,247,1));
          color:white;
          font-size:13px;
          font-weight:900;
          cursor:pointer;
        }

        .btn:disabled{
          opacity:0.55;
          cursor:not-allowed;
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

        @media(max-width:760px){
          .grid{ grid-template-columns:1fr; }
        }

        @media (prefers-reduced-motion: reduce){
          .card, .shine, .toastOpen, .toastClose { animation: none !important; }
          .card{ opacity: 1; transform: none; }
        }
      `}</style>

      <Toast open={toastOpen} kind={toastKind} message={toastMsg} />

      <div className="card">
        <div className="shine" />

        <div className="content">
          <h1 className="title">Brand Settings</h1>
          <p className="sub">
            Manage brand sender identity, reply-to, logo, dynamic commercial signature, footer text, and accent color.
          </p>

          {loading ? (
            <p className="sub">Loading brand settings...</p>
          ) : brands.length === 0 ? (
            <p className="sub">No brands found.</p>
          ) : (
            <>
              <div className="grid">
                <div className="field fieldFull">
                  <div className="label">Brand</div>
                  <select
                    className="select"
                    value={brandId}
                    onChange={(e) => setBrandId(e.target.value)}
                  >
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <div className="label">Brand Name</div>
                  <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
                </div>

                <div className="field">
                  <div className="label">From Name</div>
                  <input className="input" value={fromName} onChange={(e) => setFromName(e.target.value)} />
                </div>

                <div className="field">
                  <div className="label">Sender Email</div>
                  <input className="input" value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)} />
                </div>

                <div className="field">
                  <div className="label">Reply-To Email</div>
                  <input className="input" value={replyToEmail} onChange={(e) => setReplyToEmail(e.target.value)} />
                </div>

                <div className="field">
                  <div className="label">Accent Color</div>
                  <input className="input" type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} />
                </div>

                <div className="field fieldFull">
                  <div className="label">Logo URL</div>
                  <input
                    className="input"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://yourdomain.com/logo.png"
                  />
                </div>
              </div>

              <div className="sectionTitle">Commercial Signature</div>

              <div className="grid">
                <div className="field">
                  <div className="label">Signature Title / Role</div>
                  <input
                    className="input"
                    value={signatureTitle}
                    onChange={(e) => setSignatureTitle(e.target.value)}
                    placeholder="Example: Outreach Team"
                  />
                </div>

                <div className="field">
                  <div className="label">Signature Company</div>
                  <input
                    className="input"
                    value={signatureCompany}
                    onChange={(e) => setSignatureCompany(e.target.value)}
                    placeholder="Example: CoreHQ"
                  />
                </div>

                <div className="field">
                  <div className="label">Website</div>
                  <input
                    className="input"
                    value={signatureWebsite}
                    onChange={(e) => setSignatureWebsite(e.target.value)}
                    placeholder="https://corehq.company"
                  />
                </div>

                <div className="field">
                  <div className="label">Phone</div>
                  <input
                    className="input"
                    value={signaturePhone}
                    onChange={(e) => setSignaturePhone(e.target.value)}
                    placeholder="+63..."
                  />
                </div>

                <div className="field fieldFull">
                  <div className="label">Address</div>
                  <input
                    className="input"
                    value={signatureAddress}
                    onChange={(e) => setSignatureAddress(e.target.value)}
                    placeholder="Business address or location"
                  />
                </div>

                <div className="field fieldFull">
                  <div className="label">Signature Disclaimer</div>
                  <textarea
                    className="textarea"
                    value={signatureDisclaimer}
                    onChange={(e) => setSignatureDisclaimer(e.target.value)}
                    placeholder="Commercial disclaimer, confidentiality note, or brand note..."
                  />
                </div>

                <div className="field fieldFull">
                  <div className="label">Footer Text</div>
                  <textarea
                    className="textarea"
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    placeholder="Optional brand footer text..."
                  />
                </div>
              </div>

              <div className="preview">
                <div className="previewBadge">{fromName || name || "Brand"}</div>
                <div className="previewLine">From: {senderPreview}</div>
                <div className="previewLine">Reply-To: {replyToEmail || "Not set"}</div>

                <div className="previewSignature">
                  {logoUrl && (
                    <div className="logoBox">
                      <img className="logoPreview" src={logoUrl} alt={`${name || "Brand"} logo`} />
                    </div>
                  )}

                  <div className="previewName">{fromName || name || "CoreHQ"}</div>
                  <div className="previewRole">
                    {signatureTitle || "Outreach Team"}
                    {signatureCompany ? ` · ${signatureCompany}` : ""}
                  </div>

                  {signatureWebsite && <div className="previewLine">🌐 {signatureWebsite}</div>}
                  {signaturePhone && <div className="previewLine">📞 {signaturePhone}</div>}
                  {signatureAddress && <div className="previewLine">📍 {signatureAddress}</div>}
                  {footerText && <div className="previewLine">{footerText}</div>}
                  {signatureDisclaimer && (
                    <div className="previewLine" style={{ opacity: 0.7 }}>
                      {signatureDisclaimer}
                    </div>
                  )}
                </div>

                {senderEmail.includes("onboarding@resend.dev") && (
                  <div className="warning">
                    Development sender is active. Real production campaigns should use a verified Resend domain.
                  </div>
                )}
              </div>

              <button className="btn" onClick={saveBrand} disabled={saving}>
                {saving ? "Saving..." : "Save Brand Settings"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}