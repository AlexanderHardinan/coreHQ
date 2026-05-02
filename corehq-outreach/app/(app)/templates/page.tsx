"use client";

import { useMemo, useState } from "react";
import { supabase } from "../../../src/lib/supabaseClient";

const TOKENS = ["{{name}}", "{{email}}", "{{company}}", "{{country}}"];

export default function TemplatesPage() {
  const [templateName, setTemplateName] = useState("");
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");

  const [saving, setSaving] = useState(false); // ✅ added

  const previewSubject = useMemo(() => {
    return subject
      .replaceAll("{{name}}", "Alex")
      .replaceAll("{{email}}", "alex@example.com")
      .replaceAll("{{company}}", "The Globe")
      .replaceAll("{{country}}", "Thailand");
  }, [subject]);

  const previewBody = useMemo(() => {
    return htmlBody
      .replaceAll("{{name}}", "Alex")
      .replaceAll("{{email}}", "alex@example.com")
      .replaceAll("{{company}}", "The Globe")
      .replaceAll("{{country}}", "Thailand");
  }, [htmlBody]);

  const insertToken = (token: string) => {
    setHtmlBody((current) => `${current}${current ? " " : ""}${token}`);
  };

  // ✅ added
  const handleSaveTemplate = async () => {
    const name = templateName.trim();

    if (!name) {
      alert("Template name required");
      return;
    }

    if (!subject.trim()) {
      alert("Subject required");
      return;
    }

    if (!htmlBody.trim()) {
      alert("Body required");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("templates").insert({
      name,
      subject,
      html_body: htmlBody,
    });

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    setTemplateName("");
    setSubject("");
    setHtmlBody("");

    alert("Template saved");
  };

  return (
    <div className="page">
      <style>{`
        .page{
          min-height: calc(100vh - 64px);
          display:flex;
          align-items:center;
          justify-content:center;
          padding: 20px 16px;
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
        }

        .sub{
          margin: 8px 0 0 0;
          font-size: 13px;
          color: rgba(255,255,255,0.68);
        }

        .grid{
          margin-top: 18px;
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
          grid-column: 1 / -1;
        }

        .label{
          font-size:12px;
          color:rgba(255,255,255,0.72);
          font-weight:800;
        }

        .input,
        .textarea{
          width:100%;
          border-radius:12px;
          border:1px solid rgba(255,255,255,0.12);
          background:rgba(0,0,0,0.40);
          color:white;
          padding:11px 12px;
          outline:none;
        }

        .textarea{
          min-height:180px;
          resize:vertical;
        }

        .tokens{
          display:flex;
          flex-wrap:wrap;
          gap:8px;
          margin-top: 10px;
        }

        .token{
          border:1px solid rgba(255,255,255,0.12);
          background:rgba(255,255,255,0.06);
          border-radius:999px;
          padding:8px 10px;
          cursor:pointer;
          font-size:12px;
          font-weight:800;
        }

        .saveBtn{
          margin-top:16px;
          width:100%;
          padding:12px;
          border-radius:12px;
          border:none;
          background: linear-gradient(135deg, rgba(59,130,246,0.6), rgba(168,85,247,0.6));
          color:white;
          font-weight:900;
          cursor:pointer;
        }

        .preview{
          margin-top:18px;
          border-radius:14px;
          border:1px solid rgba(255,255,255,0.10);
          background:rgba(0,0,0,0.28);
          padding:16px;
        }

        @keyframes cardIn{
          from{ transform: translateY(14px); opacity: 0; }
          to{ transform: translateY(0px); opacity: 1; }
        }
        @keyframes spin{
          from{ transform: rotate(0deg); }
          to{ transform: rotate(360deg); }
        }

        @media (max-width: 760px){
          .grid{ grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="card">
        <div className="shine" />

        <div className="content">
          <h1 className="title">Templates</h1>
          <p className="sub">Phase 6.2: Save template</p>

          <div className="grid">
            <div className="field">
              <div className="label">Template Name</div>
              <input className="input" value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
            </div>

            <div className="field">
              <div className="label">Subject</div>
              <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>

            <div className="field fieldFull">
              <div className="label">HTML Body</div>
              <textarea className="textarea" value={htmlBody} onChange={(e) => setHtmlBody(e.target.value)} />

              <div className="tokens">
                {TOKENS.map((t) => (
                  <button key={t} className="token" onClick={() => insertToken(t)}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button className="saveBtn" onClick={handleSaveTemplate} disabled={saving}>
            {saving ? "Saving..." : "Save Template"}
          </button>

          <div className="preview">
            <strong>{previewSubject}</strong>
            <div style={{ marginTop: 8 }}>{previewBody}</div>
          </div>
        </div>
      </div>
    </div>
  );
}