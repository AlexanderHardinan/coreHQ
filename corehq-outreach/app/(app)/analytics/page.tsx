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
  clicked_url: string | null;
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

function fmtDate(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function emptyEventMap() {
  return {
    sent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    bounced: 0,
    failed: 0,
    queued: 0,
  };
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
        .select("id,campaign_id,recipients,status,event,email,clicked_url,error,created_at")
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
    const eventMap = emptyEventMap();
    const uniqueEmails = new Set<string>();

    for (const log of scopedLogs) {
      const ev = normalizeEvent(log);

      if (log.email) uniqueEmails.add(log.email.toLowerCase());
      for (const r of log.recipients || []) uniqueEmails.add(r.toLowerCase());

      if (ev.includes("queued")) eventMap.queued += 1;
      if (ev.includes("sent")) eventMap.sent += 1;
      if (ev.includes("delivered")) eventMap.delivered += 1;
      if (ev.includes("opened") || ev.includes("open")) eventMap.opened += 1;
      if (ev.includes("clicked") || ev.includes("click")) eventMap.clicked += 1;
      if (ev.includes("bounced") || ev.includes("bounce")) eventMap.bounced += 1;
      if (ev.includes("failed")) eventMap.failed += 1;
    }

    return {
      totalEvents: scopedLogs.length,
      uniqueEmails: uniqueEmails.size,
      ...eventMap,
      openRate: pct(eventMap.opened, eventMap.delivered || eventMap.sent),
      clickRate: pct(eventMap.clicked, eventMap.delivered || eventMap.sent),
      failureRate: pct(eventMap.failed + eventMap.bounced, eventMap.sent + eventMap.failed + eventMap.bounced),
    };
  }, [scopedLogs]);

  const eventBreakdown = useMemo(() => {
    const map = new Map<string, number>();

    for (const log of scopedLogs) {
      const ev = normalizeEvent(log) || "event";
      map.set(ev, (map.get(ev) || 0) + 1);
    }

    return Array.from(map.entries())
      .map(([event, count]) => ({ event, count }))
      .sort((a, b) => b.count - a.count);
  }, [scopedLogs]);

  const timeline = useMemo(() => {
    const map = new Map<string, number>();

    for (const log of scopedLogs) {
      if (!log.created_at) continue;
      const d = new Date(log.created_at);
      if (Number.isNaN(d.getTime())) continue;

      const key = d.toISOString().slice(0, 10);
      map.set(key, (map.get(key) || 0) + 1);
    }

    return Array.from(map.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14);
  }, [scopedLogs]);

  const maxTimelineCount = useMemo(() => {
    return Math.max(1, ...timeline.map((item) => item.count));
  }, [timeline]);

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
          max-width: 1080px;
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

        .section{
          margin-top:18px;
          border-radius:14px;
          padding:14px;
          background:rgba(0,0,0,0.24);
          border:1px solid rgba(255,255,255,0.08);
        }

        .sectionTitle{
          margin:0 0 12px 0;
          font-size:13px;
          font-weight:900;
          color:rgba(255,255,255,0.86);
        }

        .timeline{
          display:flex;
          align-items:flex-end;
          gap:8px;
          height:150px;
          overflow-x:auto;
          padding-top:10px;
        }

        .barWrap{
          min-width:48px;
          display:flex;
          flex-direction:column;
          align-items:center;
          gap:8px;
        }

        .bar{
          width:28px;
          min-height:6px;
          border-radius:999px 999px 4px 4px;
          background:linear-gradient(180deg, rgba(59,130,246,1), rgba(168,85,247,0.9));
        }

        .barLabel{
          font-size:10px;
          color:rgba(255,255,255,0.58);
          white-space:nowrap;
        }

        .breakdown{
          display:grid;
          grid-template-columns: repeat(3, 1fr);
          gap:10px;
        }

        .breakItem{
          border-radius:12px;
          padding:12px;
          background:rgba(255,255,255,0.05);
          border:1px solid rgba(255,255,255,0.08);
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

        .clickedUrl{
          margin-top:6px;
          word-break:break-all;
          color:rgba(147,197,253,1);
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
          .breakdown{ grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 520px){
          .grid{ grid-template-columns: 1fr; }
          .breakdown{ grid-template-columns: 1fr; }
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
            Phase 17A.2: advanced campaign analytics with clicked URL visibility.
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
                  <div className="metricLabel">Unique Emails</div>
                  <div className="metricValue">{metrics.uniqueEmails}</div>
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
                  <div className="metricLabel">Open Rate</div>
                  <div className="metricValue">{metrics.openRate}</div>
                </div>

                <div className="metric">
                  <div className="metricLabel">Click Rate</div>
                  <div className="metricValue">{metrics.clickRate}</div>
                </div>

                <div className="metric">
                  <div className="metricLabel">Queued</div>
                  <div className="metricValue">{metrics.queued}</div>
                </div>

                <div className="metric">
                  <div className="metricLabel">Bounced</div>
                  <div className="metricValue">{metrics.bounced}</div>
                </div>

                <div className="metric">
                  <div className="metricLabel">Failed</div>
                  <div className="metricValue">{metrics.failed}</div>
                </div>

                <div className="metric">
                  <div className="metricLabel">Failure Rate</div>
                  <div className="metricValue">{metrics.failureRate}</div>
                </div>
              </div>

              <div className="section">
                <h2 className="sectionTitle">Event Timeline (Last 14 Active Days)</h2>
                {timeline.length === 0 ? (
                  <p className="sub">No timeline data yet.</p>
                ) : (
                  <div className="timeline">
                    {timeline.map((item) => (
                      <div key={item.date} className="barWrap">
                        <div className="bar" style={{ height: `${Math.max(8, (item.count / maxTimelineCount) * 120)}px` }} />
                        <div className="barLabel">{item.date.slice(5)}</div>
                        <div className="barLabel">{item.count}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="section">
                <h2 className="sectionTitle">Event Breakdown</h2>
                {eventBreakdown.length === 0 ? (
                  <p className="sub">No event data yet.</p>
                ) : (
                  <div className="breakdown">
                    {eventBreakdown.map((item) => (
                      <div key={item.event} className="breakItem">
                        <div className="metricLabel">{item.event}</div>
                        <div className="metricValue">{item.count}</div>
                      </div>
                    ))}
                  </div>
                )}
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
                    {log.clicked_url && (
                      <div className="clickedUrl">
                        Clicked URL: {log.clicked_url}
                      </div>
                    )}
                    <div>{fmtDate(log.created_at)}</div>
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