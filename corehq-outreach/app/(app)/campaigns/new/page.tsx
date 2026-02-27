"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type ToastKind = "success" | "error" | "info";

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

  // Phase 5.1 fields (UI-only for now)
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [scheduleAt, setScheduleAt] = useState(""); // ISO-local string

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

  const handleSaveDraft = async () => {
    // Intentionally not writing to DB until you provide locked schema for campaigns/emails.
    showToast("info", "UI saved locally (DB wiring begins after campaigns schema is provided).");
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

        .pill{
          display:inline-flex;
          align-items:center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(0,0,0,0.28);
          color: rgba(255,255,255,0.82);
          font-size: 12px;
          white-space: nowrap;
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

        .label{
          font-size: 12px;
          color: rgba(255,255,255,0.70);
          font-weight: 800;
          letter-spacing: 0.2px;
        }

        .input{
          width:100%;
          padding: 11px 12px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(0,0,0,0.38);
          color: rgba(255,255,255,0.92);
          outline: none;
          transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
        }
        .input:focus{
          border-color: rgba(59,130,246,0.55);
          box-shadow: 0 0 0 4px rgba(59,130,246,0.16);
          transform: translateY(-1px);
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
          .btn, .input{ transition: none !important; }
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
              <p className="meta">
                Phase 5.1 (Meta) is staged here. DB wiring begins after you provide the locked
                <b> campaigns </b> table schema/columns.
              </p>
            </div>

            <div className="actions">
              <Link className="btn" href="/campaigns">
                ← Back
              </Link>
              <button className="btn btnPrimary" onClick={handleSaveDraft}>
                Save Draft
              </button>
            </div>
          </div>

          <div className="grid" aria-label="Campaign meta form">
            <div className="field">
              <label className="label" htmlFor="subject">
                Subject (Phase 5.1)
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
                Preview text (Phase 5.1)
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
                Schedule (optional) (Phase 5.1)
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
              <label className="label">Status (Phase 5.1)</label>
              <input className="input" value="draft (UI-only)" disabled />
            </div>
          </div>

          <div className="help">
            Next in Phase 5: Offer content + CTAs + banners + optional YouTube preview + compliance footer.
            Those will be added after DB mapping is locked, so save/load is stable and not guessed.
          </div>
        </div>
      </div>
    </div>
  );
}