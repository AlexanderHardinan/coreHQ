"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../src/lib/supabaseClient";

type ToastKind = "success" | "error" | "info";

function EyeIcon({ open }: { open: boolean }) {
  // Simple inline SVG, no dependencies
  return open ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 12s3.5-7 9-7c2.3 0 4.3.8 6 2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M21 12s-3.5 7-9 7c-2.3 0-4.3-.8-6-2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M10.5 10.7A2.6 2.6 0 0 0 9.4 12c0 1.44 1.17 2.6 2.6 2.6.5 0 .97-.14 1.36-.38"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M4 20 20 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastKind, setToastKind] = useState<ToastKind>("info");
  const [toastMsg, setToastMsg] = useState("");

  const toastTimer = useRef<number | null>(null);

  const toastAccent = useMemo(() => {
    if (toastKind === "success") return "rgba(34,197,94,1)"; // green-500
    if (toastKind === "error") return "rgba(239,68,68,1)"; // red-500
    return "rgba(59,130,246,1)"; // blue-500
  }, [toastKind]);

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setLoading(false);
      showToast("error", error.message || "Sign-in failed.");
      return;
    }

    showToast("success", "Signed in. Redirecting…");
    // small delay so the toast feels intentional
    window.setTimeout(() => router.push("/dashboard"), 450);
  };

  return (
    <div className="page">
      <style>{`
        :root { color-scheme: dark; }
        .page{
          min-height:100vh;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:28px 16px;
          background:
            radial-gradient(1000px 500px at 20% 10%, rgba(59,130,246,0.22), transparent 60%),
            radial-gradient(900px 500px at 85% 25%, rgba(168,85,247,0.20), transparent 60%),
            radial-gradient(900px 500px at 40% 100%, rgba(34,197,94,0.10), transparent 55%),
            #070707;
          color:#fff;
          font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
        }

        .wrap{
          width:100%;
          max-width: 430px;
          position:relative;
        }

        .card{
          position:relative;
          border-radius:18px;
          padding:28px;
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
          animation: spin 9s linear infinite;
          opacity: 0.55;
          pointer-events:none;
        }

        .title{
          margin: 0 0 6px 0;
          font-size: 20px;
          letter-spacing: 0.2px;
        }
        .sub{
          margin: 0 0 18px 0;
          font-size: 13px;
          color: rgba(255,255,255,0.68);
          line-height: 1.6;
        }

        .field{
          display:flex;
          flex-direction:column;
          gap:8px;
          margin-top: 14px;
        }
        .label{
          font-size: 12px;
          color: rgba(255,255,255,0.72);
          letter-spacing: 0.2px;
        }

        .inputWrap{
          position:relative;
        }

        .input{
          width:100%;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(0,0,0,0.40);
          color: white;
          padding: 12px 12px;
          outline:none;
          transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
        }
        .input:focus{
          border-color: rgba(59,130,246,0.55);
          box-shadow: 0 0 0 4px rgba(59,130,246,0.18);
          transform: translateY(-1px);
        }

        .pwBtn{
          position:absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          height: 34px;
          width: 40px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.85);
          display:flex;
          align-items:center;
          justify-content:center;
          cursor:pointer;
          transition: transform 160ms ease, background 160ms ease, border-color 160ms ease;
        }
        .pwBtn:hover{
          background: rgba(255,255,255,0.10);
          border-color: rgba(255,255,255,0.18);
          transform: translateY(-50%) scale(1.03);
        }
        .pwBtn:active{
          transform: translateY(-50%) scale(0.98);
        }

        .actions{
          margin-top: 18px;
          display:flex;
          flex-direction:column;
          gap: 12px;
        }

        .btn{
          width:100%;
          border: 0;
          border-radius: 12px;
          padding: 12px 14px;
          font-weight: 700;
          letter-spacing: 0.2px;
          color: white;
          cursor:pointer;
          background: linear-gradient(135deg, rgba(59,130,246,1), rgba(168,85,247,1));
          box-shadow: 0 16px 40px rgba(59,130,246,0.20);
          transition: transform 160ms ease, filter 160ms ease, box-shadow 160ms ease;
        }
        .btn:hover{
          filter: brightness(1.06);
          transform: translateY(-1px);
          box-shadow: 0 22px 48px rgba(168,85,247,0.20);
        }
        .btn:active{
          transform: translateY(0px);
          filter: brightness(0.98);
        }
        .btn:disabled{
          opacity: 0.65;
          cursor:not-allowed;
          transform:none;
          filter:none;
          box-shadow:none;
        }

        .hint{
          margin: 10px 0 0 0;
          font-size: 12px;
          color: rgba(255,255,255,0.55);
          text-align:center;
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
          padding: 12px 12px 12px 12px;
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
        @keyframes toastIn{
          from{ transform: translateY(-10px); opacity: 0; }
          to{ transform: translateY(0px); opacity: 1; }
        }
        @keyframes toastOut{
          from{ transform: translateY(0px); opacity: 1; }
          to{ transform: translateY(-10px); opacity: 0; }
        }

        @media (prefers-reduced-motion: reduce){
          .card, .toastOpen, .toastClose, .shine { animation: none !important; }
          .card{ opacity: 1; transform: none; }
          .toast{ opacity: 1; transform:none; }
        }
      `}</style>

      {/* Toast */}
      <div
        className={`toast ${toastOpen ? "toastOpen" : "toastClose"}`}
        style={{ ["--toastAccent" as any]: toastAccent }}
        role="status"
        aria-live="polite"
      >
        <div className="toastBar" />
        <div className="toastBody">
          <div className="toastDot" />
          <div className="toastText">{toastMsg}</div>
        </div>
      </div>

      <div className="wrap">
        <div className="card">
          <div className="shine" />
          <h1 className="title">CoreHQ – Admin Login</h1>
          <p className="sub">
            Single-admin access for internal outreach operations. Use your Supabase Auth credentials.
          </p>

          <form onSubmit={handleLogin}>
            <div className="field">
              <div className="label">Email</div>
              <div className="inputWrap">
                <input
                  className="input"
                  type="email"
                  autoComplete="email"
                  placeholder="you@corehq.io"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="field">
              <div className="label">Password</div>
              <div className="inputWrap">
                <input
                  className="input"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingRight: 56 }}
                />
                <button
                  type="button"
                  className="pwBtn"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  <EyeIcon open={showPw} />
                </button>
              </div>
            </div>

            <div className="actions">
              <button className="btn" type="submit" disabled={loading}>
                {loading ? "Signing in…" : "Sign In"}
              </button>
              <div className="hint">After sign-in, you will be redirected to the dashboard.</div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}