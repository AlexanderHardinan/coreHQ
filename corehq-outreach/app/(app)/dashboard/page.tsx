"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../src/lib/supabaseClient";

type Metrics = {
  brands: number;
  contacts: number;
  campaigns: number;
  queued: number;
  sent24h: number;
  opened24h: number;
  clicked24h: number;
  failed24h: number;
  failedQueue: number;
};

function emptyMetrics(): Metrics {
  return {
    brands: 0,
    contacts: 0,
    campaigns: 0,
    queued: 0,
    sent24h: 0,
    opened24h: 0,
    clicked24h: 0,
    failed24h: 0,
    failedQueue: 0,
  };
}

function fmt(value: number, loading: boolean) {
  if (loading) return "—";
  return value.toLocaleString();
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics>(emptyMetrics());
  const [loading, setLoading] = useState(true);

  const loadMetrics = async () => {
    setLoading(true);

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [
      brandsRes,
      contactsRes,
      campaignsRes,
      queuedRes,
      failedQueueRes,
      sentRes,
      openedRes,
      clickedRes,
      failedRes,
    ] = await Promise.all([
      supabase.from("brands").select("id", { count: "exact", head: true }),
      supabase.from("contacts").select("id", { count: "exact", head: true }),
      supabase.from("campaigns").select("id", { count: "exact", head: true }),
      supabase.from("campaign_queue").select("id", { count: "exact", head: true }).eq("status", "queued"),
      supabase
        .from("campaign_queue")
        .select("id", { count: "exact", head: true })
        .in("status", ["failed", "failed_permanent"]),
      supabase
        .from("campaign_logs")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since24h)
        .in("event", ["sent", "retry_sent"]),
      supabase
        .from("campaign_logs")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since24h)
        .in("event", ["opened", "open"]),
      supabase
        .from("campaign_logs")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since24h)
        .in("event", ["clicked", "click"]),
      supabase
        .from("campaign_logs")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since24h)
        .in("event", ["failed", "failed_permanent"]),
    ]);

    setMetrics({
      brands: brandsRes.count || 0,
      contacts: contactsRes.count || 0,
      campaigns: campaignsRes.count || 0,
      queued: queuedRes.count || 0,
      sent24h: sentRes.count || 0,
      opened24h: openedRes.count || 0,
      clicked24h: clickedRes.count || 0,
      failed24h: failedRes.count || 0,
      failedQueue: failedQueueRes.count || 0,
    });

    setLoading(false);
  };

  useEffect(() => {
    loadMetrics();

    const channel = supabase
      .channel("dashboard-live-metrics")
      .on("postgres_changes", { event: "*", schema: "public", table: "brands" }, () => loadMetrics())
      .on("postgres_changes", { event: "*", schema: "public", table: "contacts" }, () => loadMetrics())
      .on("postgres_changes", { event: "*", schema: "public", table: "campaigns" }, () => loadMetrics())
      .on("postgres_changes", { event: "*", schema: "public", table: "campaign_queue" }, () => loadMetrics())
      .on("postgres_changes", { event: "*", schema: "public", table: "campaign_logs" }, () => loadMetrics())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

        .wrap{
          width:100%;
          max-width: 980px;
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
          letter-spacing: 0.2px;
          font-weight: 900;
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

        .k{
          font-size: 12px;
          color: rgba(255,255,255,0.65);
          margin: 0 0 10px 0;
        }

        .v{
          font-size: 18px;
          font-weight: 900;
          margin: 0;
        }

        .health{
          margin-top:18px;
          border-radius:16px;
          border:1px solid rgba(255,255,255,0.10);
          background:rgba(0,0,0,0.28);
          padding:14px;
        }

        .healthTop{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          flex-wrap:wrap;
        }

        .badge{
          display:inline-flex;
          align-items:center;
          border-radius:999px;
          padding:6px 10px;
          font-size:12px;
          font-weight:900;
          background:rgba(34,197,94,0.18);
          color:rgba(134,239,172,1);
        }

        .badgeWarn{
          background:rgba(239,68,68,0.18);
          color:rgba(252,165,165,1);
        }

        @keyframes cardIn{
          from{ transform: translateY(14px) scale(0.98); opacity: 0; }
          to{ transform: translateY(0px) scale(1); opacity: 1; }
        }
        @keyframes spin{
          from{ transform: rotate(0deg); }
          to{ transform: rotate(360deg); }
        }

        @media (max-width: 980px){
          .grid{ grid-template-columns: 1fr; }
        }

        @media (prefers-reduced-motion: reduce){
          .card, .shine { animation: none !important; }
          .card{ opacity: 1; transform: none; }
        }
      `}</style>

      <div className="wrap">
        <div className="card">
          <div className="shine" />

          <div className="content">
            <h1 className="title">Dashboard</h1>
            <p className="sub">
              Live CoreHQ Outreach metrics for brands, contacts, campaigns, queue health, and last 24-hour activity.
            </p>

            <div className="grid">
              <div className="tile">
                <p className="k">Brands</p>
                <p className="v">{fmt(metrics.brands, loading)}</p>
              </div>

              <div className="tile">
                <p className="k">Contacts</p>
                <p className="v">{fmt(metrics.contacts, loading)}</p>
              </div>

              <div className="tile">
                <p className="k">Campaigns</p>
                <p className="v">{fmt(metrics.campaigns, loading)}</p>
              </div>

              <div className="tile">
                <p className="k">Queued Emails</p>
                <p className="v">{fmt(metrics.queued, loading)}</p>
              </div>

              <div className="tile">
                <p className="k">Sent Last 24h</p>
                <p className="v">{fmt(metrics.sent24h, loading)}</p>
              </div>

              <div className="tile">
                <p className="k">Opened Last 24h</p>
                <p className="v">{fmt(metrics.opened24h, loading)}</p>
              </div>

              <div className="tile">
                <p className="k">Clicked Last 24h</p>
                <p className="v">{fmt(metrics.clicked24h, loading)}</p>
              </div>

              <div className="tile">
                <p className="k">Failed Last 24h</p>
                <p className="v">{fmt(metrics.failed24h, loading)}</p>
              </div>

              <div className="tile">
                <p className="k">Failed Queue</p>
                <p className="v">{fmt(metrics.failedQueue, loading)}</p>
              </div>
            </div>

            <div className="health">
              <div className="healthTop">
                <div>
                  <p className="k">System Health</p>
                  <p className="sub">
                    {metrics.queued > 0
                      ? "Queued emails are waiting. Go to Campaigns and run the worker."
                      : "No pending queue items. System is clear."}
                  </p>
                </div>

                <div className={`badge ${metrics.failedQueue > 0 ? "badgeWarn" : ""}`}>
                  {metrics.failedQueue > 0 ? "Needs Attention" : "Healthy"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}