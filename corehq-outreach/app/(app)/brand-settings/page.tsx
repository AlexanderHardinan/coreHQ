"use client";

import { useEffect, useState } from "react";
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
};

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

  const selectedBrand = brands.find((brand) => brand.id === brandId) || null;

  useEffect(() => {
    const loadBrands = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("brands")
        .select("id,name,slug,from_name,sender_email,reply_to_email,footer_text,accent_color")
        .order("name", { ascending: true });

      if (!error && data) {
        const list = data as Brand[];
        setBrands(list);

        if (list.length > 0) {
          setBrandId(list[0].id);
        }
      }

      setLoading(false);
    };

    loadBrands();
  }, []);

  useEffect(() => {
    if (!selectedBrand) return;

    setName(selectedBrand.name || "");
    setFromName(selectedBrand.from_name || selectedBrand.name || "");
    setSenderEmail(selectedBrand.sender_email || "onboarding@resend.dev");
    setReplyToEmail(selectedBrand.reply_to_email || "");
    setFooterText(selectedBrand.footer_text || "");
    setAccentColor(selectedBrand.accent_color || "#3b82f6");
  }, [selectedBrand]);

  const saveBrand = async () => {
    if (!brandId) {
      alert("Select a brand first.");
      return;
    }

    if (!name.trim()) {
      alert("Brand name is required.");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("brands")
      .update({
        name: name.trim(),
        from_name: fromName.trim() || null,
        sender_email: senderEmail.trim() || null,
        reply_to_email: replyToEmail.trim() || null,
        footer_text: footerText.trim() || null,
        accent_color: accentColor.trim() || "#3b82f6",
      })
      .eq("id", brandId);

    setSaving(false);

    if (error) {
      alert(error.message || "Failed to save brand settings.");
      return;
    }

    setBrands((current) =>
      current.map((brand) =>
        brand.id === brandId
          ? {
              ...brand,
              name: name.trim(),
              from_name: fromName.trim() || null,
              sender_email: senderEmail.trim() || null,
              reply_to_email: replyToEmail.trim() || null,
              footer_text: footerText.trim() || null,
              accent_color: accentColor.trim() || "#3b82f6",
            }
          : brand
      )
    );

    alert("Brand settings saved.");
  };

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

        @keyframes cardIn{
          from{ transform: translateY(14px) scale(0.98); opacity: 0; }
          to{ transform: translateY(0px) scale(1); opacity: 1; }
        }

        @keyframes spin{
          from{ transform: rotate(0deg); }
          to{ transform: rotate(360deg); }
        }

        @media(max-width:760px){
          .grid{ grid-template-columns:1fr; }
        }

        @media (prefers-reduced-motion: reduce){
          .card, .shine { animation: none !important; }
          .card{ opacity: 1; transform: none; }
        }
      `}</style>

      <div className="card">
        <div className="shine" />

        <div className="content">
          <h1 className="title">Brand Settings</h1>
          <p className="sub">
            Manage brand sender identity, reply-to, footer text, and accent color.
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
                  <div className="label">Footer Text</div>
                  <textarea className="textarea" value={footerText} onChange={(e) => setFooterText(e.target.value)} />
                </div>
              </div>

              <div className="preview">
                <div className="previewBadge">{fromName || name || "Brand"}</div>
                <p className="sub">
                  Sender: {senderEmail || "onboarding@resend.dev"} · Reply-To: {replyToEmail || "Not set"}
                </p>
                <p className="sub">{footerText || "No footer text yet."}</p>
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