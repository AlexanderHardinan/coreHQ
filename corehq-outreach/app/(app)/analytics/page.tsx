"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../src/lib/supabaseClient";

type CampaignLog = {
  id: string;
  campaign_id: string | null;
  recipients: string[] | null;
  status: string | null;
  event: string | null;
  email: string | null;
  error: string | null;
  created_at: string | null;
};

function pct(part: number, total: number) {
  if (!total) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

function normalizeEvent(log: CampaignLog) {
  return (log.event || log.status || "").toLowerCase();
}

export default function AnalyticsPage() {
  const [logs, setLogs] = useState<CampaignLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCampaignId, setSelectedCampaignId] = useState("");

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("campaign_logs")
        .select("id,campaign_id,recipients,status,event,email,error,created_at")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setLogs(data as CampaignLog[]);
      }

      setLoading(false);
    };

    loadAnalytics();
  }, []);

  const campaignIds = useMemo(() => {
    return Array.from(
      new Set(logs.map((log) => log.campaign_id).filter(Boolean) as string[])
    );
  }, [logs]);

  const scopedLogs = useMemo(() => {
    if (!selectedCampaignId) return logs;
    return logs.filter((log) => log.campaign_id === selectedCampaignId);
  }, [logs, selectedCampaignId]);

  const metrics = useMemo(() => {
    const sent = scopedLogs.filter((log) => normalizeEvent(log).includes("sent")).length;
    const delivered = scopedLogs.filter((log) => normalizeEvent(log).includes("delivered")).length;
    const opened = scopedLogs.filter((log) => normalizeEvent(log).includes("opened") || normalizeEvent(log).includes("open")).length;
    const clicked = scopedLogs.filter((log) => normalizeEvent(log).includes("clicked") || normalizeEvent(log).includes("click")).length;
    const bounced = scopedLogs.filter((log) => normalizeEvent(log).includes("bounced") || normalizeEvent(log).includes("bounce")).length;
    const failed = scopedLogs.filter((log) => normalizeEvent(log).includes("failed")).length;

    return {
      totalEvents: scopedLogs.length,
      sent,
      delivered,
      opened,
      clicked,
      bounced,
      failed,
      openRate: pct(opened, delivered || sent),
      clickRate: pct(clicked, delivered || sent),
    };
  }, [scopedLogs]);

  return (
    <div className="page">
      <style>{`
        .page{
          min-height: calc(100vh - 64px);
          display:flex;
          align-items:center;
          justify-content:center;
          padding: 24px 16px;
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

        .selector{
          margin-top:18px;
          display:flex;
          flex-direction:column;
          gap:8px;
        }

        .label{
          font-size:12px;
          color:rgba(255,255,255,0.72);
          font-weight:800;
        }

        .select{
          width:100%;
          border-radius:12px;
          border:1px solid rgba(255,255,255,0.12);
          background:rgba(0,0,0,0.40);
          color:white;
          padding:11px 12px;
          outline:none;
        }

        .grid{
          margin-top:18px;
          display:grid;
          grid-template-columns: repeat(4, 1fr);
          gap:12px;
        }

        .metric{
          border-radius:14px;
          padding:14px;
          background:rgba(0,0,0,0.28);
          border:1px solid rgba(255,255,255,0.10);
        }

        .metricLabel{
          font-size:12px;
          color:rgba(255,255,255,0.62);
          font-weight:800;
        }

        .metricValue{
          margin-top:8px;
          font-size:24px;
          font-weight:950;
        }

        .logs{
          margin-top:18px;
          display:flex;
          flex-direction:column;
          gap:8px;
        }

        .log{
          border-radius:12px;
          padding:12px;
          background:rgba(0,0,0,0.24);
          border:1px solid rgba(255,255,255,0.08);
          font-size:12px;
          color:rgba(255,255,255,0.72);
        }

        .logTop{
          display:flex;
          justify-content:space-between;
          gap:10px;
        }

        .badge{
          border-radius:999px;
          padding:4px 8px;
          background:rgba(255,255,255,0.10);
          color:rgba(255,255,255,0.85);
          font-weight:900;
          white-space:nowrap;
        }

        @keyframes cardIn{
          from{ transform: translateY(14px) scale(0.98); opacity: 0; }
          to{ transform: translateY(0px) scale(1); opacity: 1; }
        }
        @keyframes spin{
          from{ transform: rotate(0deg); }
          to{ transform: rotate(360deg); }
        }

        @media (max-width: 860px){
          .grid{ grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 520px){
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
          <h1 className="title">Analytics</h1>
          <p className="sub">
            Phase 12: global and per-campaign performance from campaign logs and Resend webhook events.
          </p>

          {loading ? (
            <p className="sub">Loading analytics...</p>
          ) : (
            <>
              <div className="selector">
                <div className="label">Campaign Filter</div>
                <select
                  className="select"
                  value={selectedCampaignId}
                  onChange={(e) => setSelectedCampaignId(e.target.value)}
                >
                  <option value="">All Campaigns</option>
                  {campaignIds.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid">
                <div className="metric">
                  <div className="metricLabel">Total Events</div>
                  <div className="metricValue">{metrics.totalEvents}</div>
                </div>

                <div className="metric">
                  <div className="metricLabel">Sent</div>
                  <div className="metricValue">{metrics.sent}</div>
                </div>

                <div className="metric">
                  <div className="metricLabel">Delivered</div>
                  <div className="metricValue">{metrics.delivered}</div>
                </div>

                <div className="metric">
                  <div className="metricLabel">Opened</div>
                  <div className="metricValue">{metrics.opened}</div>
                </div>

                <div className="metric">
                  <div className="metricLabel">Clicked</div>
                  <div className="metricValue">{metrics.clicked}</div>
                </div>

                <div className="metric">
                  <div className="metricLabel">Bounced / Failed</div>
                  <div className="metricValue">{metrics.bounced + metrics.failed}</div>
                </div>

                <div className="metric">
                  <div className="metricLabel">Open Rate</div>
                  <div className="metricValue">{metrics.openRate}</div>
                </div>

                <div className="metric">
                  <div className="metricLabel">Click Rate</div>
                  <div className="metricValue">{metrics.clickRate}</div>
                </div>
              </div>

              <div className="logs">
                {scopedLogs.slice(0, 10).map((log) => (
                  <div key={log.id} className="log">
                    <div className="logTop">
                      <div>
                        <b>Campaign:</b> {log.campaign_id || "—"}
                      </div>
                      <div className="badge">{normalizeEvent(log) || "event"}</div>
                    </div>
                    <div>Email: {log.email || "—"}</div>
                    <div>Recipients: {(log.recipients || []).length}</div>
                    <div>{log.created_at ? new Date(log.created_at).toLocaleString() : "—"}</div>
                    {log.error && <div>Error: {log.error}</div>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}