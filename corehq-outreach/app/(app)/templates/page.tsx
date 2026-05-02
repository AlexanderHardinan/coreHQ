"use client";

import { useMemo, useState } from "react";

const TOKENS = ["{{name}}", "{{email}}", "{{company}}", "{{country}}"];

export default function TemplatesPage() {
  const [templateName, setTemplateName] = useState("");
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");

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
          letter-spacing: 0.2px;
        }

        .sub{
          margin: 8px 0 0 0;
          font-size: 13px;
          color: rgba(255,255,255,0.68);
          line-height: 1.6;
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
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
        }

        .textarea{
          min-height:180px;
          resize:vertical;
          line-height:1.6;
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
          color:rgba(255,255,255,0.86);
          border-radius:999px;
          padding:8px 10px;
          cursor:pointer;
          font-size:12px;
          font-weight:800;
        }

        .preview{
          margin-top:18px;
          border-radius:14px;
          border:1px solid rgba(255,255,255,0.10);
          background:rgba(0,0,0,0.28);
          padding:16px;
        }

        .previewTitle{
          font-size:13px;
          font-weight:900;
          margin-bottom:10px;
        }

        .previewSubject{
          font-size:14px;
          font-weight:900;
          margin-bottom:10px;
        }

        .previewBody{
          font-size:13px;
          color:rgba(255,255,255,0.72);
          line-height:1.7;
          white-space:pre-wrap;
        }

        @keyframes cardIn{
          from{ transform: translateY(14px) scale(0.98); opacity: 0; }
          to{ transform: translateY(0px) scale(1); opacity: 1; }
        }
        @keyframes spin{
          from{ transform: rotate(0deg); }
          to{ transform: rotate(360deg); }
        }

        @media (max-width: 760px){
          .grid{ grid-template-columns: 1fr; }
        }

        @media (prefers-reduced-motion: reduce){
          .card, .shine { animation: none !important; }
          .card{ opacity: 1; transform: none; }
        }
      `}</style>

      <div className="card">
        <div className="shine" />

        <div className="content">
          <h1 className="title">Templates</h1>
          <p className="sub">
            Phase 6.1: create reusable campaign template content with subject, HTML body, and personalization tokens.
          </p>

          <div className="grid">
            <div className="field">
              <div className="label">Template Name</div>
              <input
                className="input"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Example: Welcome Offer"
              />
            </div>

            <div className="field">
              <div className="label">Subject</div>
              <input
                className="input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Hello {{name}}, special offer from {{company}}"
              />
            </div>

            <div className="field fieldFull">
              <div className="label">HTML Body</div>
              <textarea
                className="textarea"
                value={htmlBody}
                onChange={(e) => setHtmlBody(e.target.value)}
                placeholder="<h1>Hello {{name}}</h1><p>Your offer from {{company}} is ready.</p>"
              />

              <div className="tokens">
                {TOKENS.map((token) => (
                  <button key={token} className="token" type="button" onClick={() => insertToken(token)}>
                    {token}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="preview">
            <div className="previewTitle">Sample Preview</div>
            <div className="previewSubject">{previewSubject || "Subject preview will appear here."}</div>
            <div className="previewBody">{previewBody || "Body preview will appear here."}</div>
          </div>
        </div>
      </div>
    </div>
  );
}