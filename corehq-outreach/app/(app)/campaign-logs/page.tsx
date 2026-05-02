"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../src/lib/supabaseClient";

type CampaignLog = {
  id: string;
  campaign_id: string | null;
  email_snapshot_id: string | null;
  recipients: string[] | null;
  status: string | null;
  resend_id: string | null;
  event: string | null;
  email: string | null;
  error: string | null;
  created_at: string | null;
};

function fmtDate(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function eventLabel(log: CampaignLog) {
  return log.event || log.status || "event";
}

export default function CampaignLogsPage() {
  const [logs, setLogs] = useState<CampaignLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [campaignFilter, setCampaignFilter] = useState("");
  const [eventFilter, setEventFilter] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [page, setPage] = useState(1);

  const pageSize = 10;

  useEffect(() => {
    const loadLogs = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("campaign_logs")
        .select("id,campaign_id,email_snapshot_id,recipients,status,resend_id,event,email,error,created_at")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setLogs(data as CampaignLog[]);
      }

      setLoading(false);
    };

    loadLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    const campaignNeedle = campaignFilter.trim().toLowerCase();
    const eventNeedle = eventFilter.trim().toLowerCase();
    const emailNeedle = emailFilter.trim().toLowerCase();

    return logs.filter((log) => {
      const campaignMatch = campaignNeedle
        ? (log.campaign_id || "").toLowerCase().includes(campaignNeedle)
        : true;

      const eventMatch = eventNeedle
        ? eventLabel(log).toLowerCase().includes(eventNeedle)
        : true;

      const emailMatch = emailNeedle
        ? (log.email || "").toLowerCase().includes(emailNeedle) ||
          (log.recipients || []).join(" ").toLowerCase().includes(emailNeedle)
        : true;

      return campaignMatch && eventMatch && emailMatch;
    });
  }, [logs, campaignFilter, eventFilter, emailFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));

  const visibleLogs = useMemo(() => {
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [campaignFilter, eventFilter, emailFilter]);

  return (
    <div className="page">
      <style>{`
        .page{
          min-height: calc(100vh - 64px);
          padding: 28px 16px;
          display:flex;
          justify-content:center;
        }

        .wrap{
          width:100%;
          max-width:1200px;
        }

        .card{
          border-radius:18px;
          padding:24px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.10);
          box-shadow:
            0 20px 80px rgba(0,0,0,0.55),
            inset 0 1px 0 rgba(255,255,255,0.08);
          backdrop-filter: blur(14px);
        }

        .title{
          margin:0;
          font-size:20px;
          font-weight:900;
        }

        .sub{
          margin:8px 0 0 0;
          font-size:13px;
          color:rgba(255,255,255,0.65);
          line-height:1.6;
        }

        .filters{
          margin-top:18px;
          display:grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap:12px;
        }

        .input{
          width:100%;
          border-radius:12px;
          border:1px solid rgba(255,255,255,0.12);
          background:rgba(0,0,0,0.38);
          color:white;
          padding:11px 12px;
          outline:none;
        }

        .summary{
          margin-top:14px;
          color:rgba(255,255,255,0.62);
          font-size:12px;
        }

        .tableWrap{
          margin-top:16px;
          overflow:auto;
          border-radius:14px;
          border:1px solid rgba(255,255,255,0.10);
        }

        table{
          width:100%;
          border-collapse:collapse;
          min-width:960px;
        }

        th, td{
          padding:12px;
          text-align:left;
          font-size:12px;
          border-bottom:1px solid rgba(255,255,255,0.08);
          vertical-align:top;
        }

        th{
          color:rgba(255,255,255,0.62);
          font-weight:900;
          background:rgba(0,0,0,0.26);
        }

        td{
          color:rgba(255,255,255,0.80);
        }

        .badge{
          display:inline-flex;
          border-radius:999px;
          padding:5px 9px;
          background:rgba(255,255,255,0.10);
          font-weight:900;
          text-transform:capitalize;
          white-space:nowrap;
        }

        .sent,.delivered{
          background:rgba(34,197,94,0.18);
          color:rgba(134,239,172,1);
        }

        .opened,.clicked{
          background:rgba(59,130,246,0.18);
          color:rgba(147,197,253,1);
        }

        .failed,.bounced{
          background:rgba(239,68,68,0.18);
          color:rgba(252,165,165,1);
        }

        .mono{
          font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;
          word-break:break-all;
        }

        .pager{
          margin-top:14px;
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:12px;
        }

        .btn{
          border:1px solid rgba(255,255,255,0.14);
          background:rgba(255,255,255,0.08);
          color:white;
          padding:9px 12px;
          border-radius:10px;
          cursor:pointer;
          font-weight:800;
        }

        .btn:disabled{
          opacity:0.45;
          cursor:not-allowed;
        }

        @media(max-width:860px){
          .filters{ grid-template-columns:1fr; }
        }
      `}</style>

      <div className="wrap">
        <div className="card">
          <h1 className="title">Campaign Logs</h1>
          <p className="sub">
            Phase 11: searchable campaign activity logs for send, delivery, open, click, bounce, and failure events.
          </p>

          <div className="filters">
            <input
              className="input"
              value={campaignFilter}
              onChange={(e) => setCampaignFilter(e.target.value)}
              placeholder="Filter by campaign ID"
            />
            <input
              className="input"
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              placeholder="Filter by event/status"
            />
            <input
              className="input"
              value={emailFilter}
              onChange={(e) => setEmailFilter(e.target.value)}
              placeholder="Filter by email/recipient"
            />
          </div>

          <div className="summary">
            {loading
              ? "Loading logs..."
              : `${filteredLogs.length.toLocaleString()} log(s) found`}
          </div>

          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Email</th>
                  <th>Recipients</th>
                  <th>Campaign ID</th>
                  <th>Resend ID</th>
                  <th>Snapshot</th>
                  <th>Error</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {visibleLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8}>No logs found.</td>
                  </tr>
                ) : (
                  visibleLogs.map((log) => {
                    const label = eventLabel(log).toLowerCase();

                    return (
                      <tr key={log.id}>
                        <td>
                          <span className={`badge ${label}`}>
                            {eventLabel(log)}
                          </span>
                        </td>
                        <td>{log.email || "—"}</td>
                        <td>{(log.recipients || []).length}</td>
                        <td className="mono">{log.campaign_id || "—"}</td>
                        <td className="mono">{log.resend_id || "—"}</td>
                        <td className="mono">{log.email_snapshot_id || "—"}</td>
                        <td>{log.error || "—"}</td>
                        <td>{fmtDate(log.created_at)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="pager">
            <button
              className="btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>

            <div className="summary">
              Page {Math.min(page, totalPages)} of {totalPages}
            </div>

            <button
              className="btn"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}