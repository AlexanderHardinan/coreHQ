"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
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

function NavItem({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`navItem ${active ? "navItemActive" : ""}`}
      aria-current={active ? "page" : undefined}
    >
      <span className="navDot" />
      <span className="navLabel">{label}</span>
    </Link>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  const [brand, setBrand] = useState("Tipsy — CoreHQ");

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

  // Auth guard for all authenticated app routes
  useEffect(() => {
    let mounted = true;

    const run = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error || !data.session) {
        router.replace("/log-in");
        return;
      }

      setEmail(data.session.user.email ?? null);
      setChecking(false);
    };

    run();

    return () => {
      mounted = false;
    };
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

  const nav = useMemo(
    () => [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/contacts", label: "Contacts" },
      { href: "/segments", label: "Segments" },
      { href: "/campaigns", label: "Campaigns" },
      { href: "/templates", label: "Templates" },
      { href: "/automations", label: "Automations" },
      { href: "/analytics", label: "Analytics" },
      { href: "/deliverability", label: "Deliverability" },
      { href: "/brand-settings", label: "Brand Settings" },
    ],
    []
  );

  return (
    <div className="app">
      <style>{`
        :root { color-scheme: dark; }

        .app{
          min-height:100vh;
          background:
            radial-gradient(1000px 500px at 20% 10%, rgba(59,130,246,0.16), transparent 60%),
            radial-gradient(900px 500px at 85% 25%, rgba(168,85,247,0.14), transparent 60%),
            radial-gradient(900px 500px at 40% 100%, rgba(34,197,94,0.06), transparent 55%),
            #070707;
          color:#fff;
          font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
        }

        .shell{
          display:grid;
          grid-template-columns: 280px 1fr;
          min-height:100vh;
        }

        .sidebar{
          padding: 18px 14px;
          border-right: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
          backdrop-filter: blur(14px);
          position: sticky;
          top: 0;
          height: 100vh;
          overflow: auto;
        }

        .brandBlock{
          border-radius: 16px;
          padding: 14px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(0,0,0,0.30);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
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

        .brandTitle{
          margin:0;
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 0.2px;
        }
        .brandSub{
          margin: 6px 0 0 0;
          font-size: 12px;
          color: rgba(255,255,255,0.66);
          line-height: 1.45;
        }

        .brandSelect{
          margin-top: 10px;
          width: 100%;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(0,0,0,0.38);
          color: rgba(255,255,255,0.90);
          outline: none;
          transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
        }
        .brandSelect:focus{
          border-color: rgba(59,130,246,0.55);
          box-shadow: 0 0 0 4px rgba(59,130,246,0.16);
          transform: translateY(-1px);
        }

        .nav{
          margin-top: 14px;
          display:flex;
          flex-direction:column;
          gap: 8px;
        }

        .navItem{
          display:flex;
          align-items:center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.06);
          background: rgba(0,0,0,0.20);
          color: rgba(255,255,255,0.86);
          text-decoration:none;
          transition: transform 160ms ease, background 160ms ease, border-color 160ms ease;
        }
        .navItem:hover{
          transform: translateY(-1px);
          border-color: rgba(255,255,255,0.12);
          background: rgba(0,0,0,0.28);
        }
        .navItemActive{
          border-color: rgba(59,130,246,0.32);
          background: rgba(59,130,246,0.12);
        }

        .navDot{
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: rgba(255,255,255,0.30);
          box-shadow: 0 0 0 4px rgba(255,255,255,0.06);
          flex: 0 0 auto;
        }
        .navItemActive .navDot{
          background: rgba(59,130,246,1);
          box-shadow: 0 0 0 4px rgba(59,130,246,0.16);
        }

        .navLabel{
          font-size: 13px;
          font-weight: 750;
          letter-spacing: 0.2px;
        }

        .main{
          display:flex;
          flex-direction:column;
          min-width: 0;
        }

        .topbar{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap: 12px;
          padding: 16px 18px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
          backdrop-filter: blur(14px);
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .topLeft{
          display:flex;
          flex-direction:column;
          gap: 4px;
          min-width: 0;
        }
        .topTitle{
          margin:0;
          font-size: 14px;
          font-weight: 900;
          letter-spacing: 0.2px;
        }
        .topMeta{
          font-size: 12px;
          color: rgba(255,255,255,0.62);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 520px;
        }

        .topRight{
          display:flex;
          align-items:center;
          gap: 10px;
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
        .dot{
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: rgba(34,197,94,1);
          box-shadow: 0 0 0 4px rgba(34,197,94,0.16);
        }

        .btn{
          border: 0;
          border-radius: 12px;
          padding: 10px 12px;
          font-weight: 850;
          letter-spacing: 0.2px;
          color: white;
          cursor:pointer;
          background: linear-gradient(135deg, rgba(239,68,68,1), rgba(168,85,247,1));
          box-shadow: 0 16px 40px rgba(239,68,68,0.14);
          transition: transform 160ms ease, filter 160ms ease, box-shadow 160ms ease;
        }
        .btn:hover{
          filter: brightness(1.05);
          transform: translateY(-1px);
          box-shadow: 0 22px 48px rgba(168,85,247,0.16);
        }
        .btn:active{
          transform: translateY(0px);
          filter: brightness(0.98);
        }

        .content{
          padding: 18px;
          min-height: calc(100vh - 64px);
        }

        /* Checking screen */
        .checking{
          min-height:100vh;
          display:flex;
          align-items:center;
          justify-content:center;
          padding: 28px 16px;
        }
        .checkingCard{
          width: min(520px, 100%);
          border-radius: 18px;
          padding: 22px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(255,255,255,0.05);
          box-shadow: 0 20px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08);
          backdrop-filter: blur(14px);
          position:relative;
          overflow:hidden;
          transform: translateY(10px);
          opacity: 0;
          animation: cardIn 650ms cubic-bezier(.2,.9,.2,1) forwards;
        }
        .checkingTitle{
          margin:0;
          font-size: 14px;
          font-weight: 900;
          letter-spacing: 0.2px;
        }
        .checkingSub{
          margin: 8px 0 0 0;
          font-size: 12px;
          color: rgba(255,255,255,0.62);
          line-height: 1.55;
        }
        .bar{
          margin-top: 12px;
          height: 10px;
          border-radius: 999px;
          background: rgba(255,255,255,0.06);
          overflow:hidden;
          position:relative;
        }
        .bar::after{
          content:"";
          position:absolute;
          inset:0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
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

        @media (max-width: 980px){
          .shell{ grid-template-columns: 1fr; }
          .sidebar{
            position: relative;
            height: auto;
            border-right: 0;
            border-bottom: 1px solid rgba(255,255,255,0.08);
          }
        }

        @media (prefers-reduced-motion: reduce){
          .brandBlock, .checkingCard { animation: none !important; opacity: 1; transform: none; }
          .shine, .bar::after, .toastOpen, .toastClose { animation: none !important; }
          .toast{ opacity: 1; transform:none; }
        }
      `}</style>

      <Toast open={toastOpen} kind={toastKind} message={toastMsg} />

      {checking ? (
        <div className="checking">
          <div className="checkingCard">
            <div className="shine" />
            <h1 className="checkingTitle">Checking session…</h1>
            <p className="checkingSub">Verifying admin access before loading the workspace.</p>
            <div className="bar" />
          </div>
        </div>
      ) : (
        <div className="shell">
          <aside className="sidebar">
            <div className="brandBlock">
              <div className="shine" />
              <p className="brandTitle">CoreHQ – Outreach</p>
              <p className="brandSub">Single sender • Multi-brand • Offer-driven</p>

              <select
                className="brandSelect"
                value={brand}
                onChange={(e) => {
                  setBrand(e.target.value);
                  showToast("info", `Brand switched to: ${e.target.value}`);
                }}
                aria-label="Brand switcher"
              >
                <option>Tipsy — CoreHQ</option>
                <option>GSupport — CoreHQ</option>
                <option>Track Me Solutions — CoreHQ</option>
                <option>The Culinary World Gazette — CoreHQ</option>
                <option>Gastronomist International — CoreHQ</option>
              </select>
            </div>

            <nav className="nav" aria-label="Primary navigation">
              {nav.map((n) => (
                <NavItem
                  key={n.href}
                  href={n.href}
                  label={n.label}
                  active={pathname === n.href}
                />
              ))}
            </nav>
          </aside>

          <main className="main">
            <header className="topbar">
              <div className="topLeft">
                <p className="topTitle">Workspace</p>
                <div className="topMeta">
                  Active brand: <b>{brand}</b> • Signed in as{" "}
                  <b>{email || "unknown"}</b>
                </div>
              </div>

              <div className="topRight">
                <div className="pill" title="Session status">
                  <span className="dot" />
                  <span>Authenticated</span>
                </div>
                <button className="btn" onClick={handleLogout}>
                  Log out
                </button>
              </div>
            </header>

            <section className="content">{children}</section>
          </main>
        </div>
      )}
    </div>
  );
}