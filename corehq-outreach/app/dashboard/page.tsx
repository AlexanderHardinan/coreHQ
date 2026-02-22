"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../src/lib/supabaseClient";

type ToastKind = "success" | "error" | "info";

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

export default function DashboardPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

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
    let mounted = true;

    const run = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        router.replace("/log-in");
        return;
      }

      const session = data.session;
      if (!session) {
        router.replace("/log-in");
        return;
      }

      setEmail(session.user.email ?? null);
      setChecking(false);
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    showToast("info", "Signing out…");
    const { error } = await supabase.auth.signOut();
    if (error) {
      showToast("error", error.message || "Sign out failed.");
      return;
    }
    showToast("success", "Signed out.");
    window.setTimeout(() => router.replace("/log-in"), 350);
  };

  return (
    <div className="page">
      <style>{`
        :root { color-scheme: dark; }

        .page{
          min-height:100vh;
          padding: 28px 16px;
          background:
            radial-gradient(1000px 500px at 20% 10%, rgba(59,130,246,0.18), transparent 60%),
            radial-gradient(900px 500px at 85% 25%, rgba(168,85,247,0.16), transparent 60%),
            radial-gradient(900px 500px at 40% 100%, rgba(34,197,94,0.08), transparent 55%),
            #070707;
          color:#fff;
          font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
          display:flex;
          align-items:center;
          justify-content:center;
        }

        .wrap{
          width:100%;
          max-width: 860px;
        }

        .card{
          position:relative;
          border-radius:18px;
          padding:24px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.10);
          box-shadow:
            0 20px 80px rgba(0,0,0,0.55),
            inset 0 1px 0 rgba(255,255,255,0.08);
          backdrop-filter: blur(14px);
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
          opacity: 0.5;
          pointer-events:none;
        }

        .top{
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap: 12px;
        }

        .title{
          margin:0;
          font-size:18px;
          letter-spacing: 0.2px;
        }
        .sub{
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
          background: rgba(0,0,0,0.35);
          color: rgba(255,255,255,0.82);
          font-size: 12px;
          white-space: nowrap;
        }
        .dot{
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: rgba(34,197,94,1);
          box-shadow: 0 0 0 4px rgba(34,197,94,0.18);
        }

        .grid{
          margin-top: 18px;
          display:grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }
        .tile{
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(0,0,0,0.30);
          padding: 14px;
          transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
        }
        .tile:hover{
          transform: translateY(-2px);
          border-color: rgba(255,255,255,0.16);
          background: rgba(0,0,0,0.36);
        }
        .tileK{
          font-size: 12px;
          color: rgba(255,255,255,0.65);
          margin: 0 0 10px 0;
        }
        .tileV{
          font-size: 18px;
          font-weight: 800;
          margin: 0;
        }

        .actions{
          margin-top: 18px;
          display:flex;
          justify-content:flex-end;
        }
        .btn{
          border: 0;
          border-radius: 12px;
          padding: 12px 14px;
          font-weight: 800;
          letter-spacing: 0.2px;
          color: white;
          cursor:pointer;
          background: linear-gradient(135deg, rgba(239,68,68,1), rgba(168,85,247,1));
          box-shadow: 0 16px 40px rgba(239,68,68,0.16);
          transition: transform 160ms ease, filter 160ms ease, box-shadow 160ms ease;
        }
        .btn:hover{
          filter: brightness(1.05);
          transform: translateY(-1px);
          box-shadow: 0 22px 48px rgba(168,85,247,0.18);
        }
        .btn:active{
          transform: translateY(0px);
          filter: brightness(0.98);
        }

        .skeleton{
          height: 12px;
          border-radius: 999px;
          background: rgba(255,255,255,0.08);
          overflow:hidden;
          position:relative;
        }
        .skeleton::after{
          content:"";
          position:absolute;
          inset:0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent);
          transform: translateX(-60%);
          animation: shimmer 1.2s ease-in-out infinite;
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
        }
        .toastOpen{
          animation: toastIn 260ms cubic-bezier(.2,.9,.2,1) forwards;
          pointer-events:auto;
        }
        .toastClose{
          animation: toastOut 220ms ease forwards;
          pointer-events:none;
        }
        .toastBar{
          height: 3px;
          background: var(--toastAccent);
        }
        .toastBody{
          display:flex;
          gap: 10px;
          padding: 12px;
          align-items:flex-start;
        }
        .toastDot{
          margin-top: 3px;
          height: 10px;
          width: 10px;
          border-radius: 999px;
          background: var(--toastAccent);
          box-shadow: 0 0 0 4px color-mix(in srgb, var(--toastAccent) 25%, transparent);
          flex: 0 0 auto;
        }
        .toastText{
          font-size: 13px;
          color: rgba(255,255,255,0.88);
          line-height: 1.45;
        }

        @keyframes cardIn{
          from{ transform: translateY(14px) scale(0.98); opacity: 0; }
          to{ transform: translateY(0px) scale(1); opacity: 1; }
        }
        @keyframes spin{
          from{ transform: rotate(0deg); }
          to{ transform: rotate(360deg); }
        }
        @keyframes shimmer{
          from{ transform: translateX(-60%); }
          to{ transform: translateX(60%); }
        }
        @keyframes toastIn{
          from{ transform: translateY(-10px); opacity: 0; }
          to{ transform: translateY(0px); opacity: 1; }
        }
        @keyframes toastOut{
          from{ transform: translateY(0px); opacity: 1; }
          to{ transform: translateY(-10px); opacity: 0; }
        }

        @media (max-width: 820px){
          .grid{ grid-template-columns: 1fr; }
        }
        @media (prefers-reduced-motion: reduce){
          .card, .toastOpen, .toastClose, .shine, .skeleton::after { animation: none !important; }
          .card{ opacity: 1; transform: none; }
          .toast{ opacity: 1; transform:none; }
        }
      `}</style>

      <Toast open={toastOpen} kind={toastKind} message={toastMsg} />

      <div className="wrap">
        <div className="card">
          <div className="shine" />

          <div className="top">
            <div>
              <h1 className="title">Dashboard</h1>
              <p className="sub">
                Internal admin console for CoreHQ – Outreach. You are signed in as{" "}
                <span style={{ color: "rgba(255,255,255,0.92)", fontWeight: 700 }}>
                  {checking ? "…" : email || "unknown"}
                </span>
                .
              </p>
            </div>

            <div className="pill" title="Session status">
              <span className="dot" />
              <span>Authenticated</span>
            </div>
          </div>

          <div className="grid">
            <div className="tile">
              <p className="tileK">Brands</p>
              <p className="tileV">{checking ? <span className="skeleton" style={{ width: 80, display: "inline-block" }} /> : "—"}</p>
            </div>
            <div className="tile">
              <p className="tileK">Contacts</p>
              <p className="tileV">{checking ? <span className="skeleton" style={{ width: 80, display: "inline-block" }} /> : "—"}</p>
            </div>
            <div className="tile">
              <p className="tileK">Campaigns</p>
              <p className="tileV">{checking ? <span className="skeleton" style={{ width: 80, display: "inline-block" }} /> : "—"}</p>
            </div>
          </div>

          <div className="actions">
            <button className="btn" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}