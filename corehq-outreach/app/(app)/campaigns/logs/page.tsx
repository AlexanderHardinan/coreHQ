"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../../src/lib/supabaseClient";

type CampaignLog = {
  id: string;
  campaign_id: string | null;
  email_snapshot_id: string | null;
  recipients: string[] | null;
  status: string;
  resend_id: string | null;
  error: string | null;
  created_at: string | null;
};

export default function CampaignLogsPage() {
  const [logs, setLogs] = useState<CampaignLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLogs = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("campaign_logs")
        .select("id,campaign_id,email_snapshot_id,recipients,status,resend_id,error,created_at")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setLogs(data as CampaignLog[]);
      }

      setLoading(false);
    };

    loadLogs();
  }, []);

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
          max-width:1100px;
        }

        .title{
          font-size:20px;
          font-weight:900;
          margin-bottom:16px;
        }

        .list{
          display:flex;
          flex-direction:column;
          gap:10px;
        }

        .item{
          border-radius:14px;
          padding:14px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.10);
        }

        .top{
          display:flex;
          justify-content:space-between;
          gap:12px;
          align-items:flex-start;
        }

        .meta{
          font-size:12px;
          color: rgba(255,255,255,0.62);
          margin-top:6px;
          word-break:break-all;
        }

        .status{
          font-size:11px;
          padding:5px 10px;
          border-radius:999px;
          font-weight:900;
          text-transform:capitalize;
          background: rgba(255,255,255,0.1);
        }

        .sent{
          background: rgba(34,197,94,0.18);
          color: rgba(134,239,172,1);
        }

        .failed{
          background: rgba(239,68,68,0.18);
          color: rgba(252,165,165,1);
        }
      `}</style>

      <div className="wrap">
        <div className="title">Campaign Logs</div>

        {loading ? (
          <div>Loading campaign logs...</div>
        ) : logs.length === 0 ? (
          <div>No campaign logs found.</div>
        ) : (
          <div className="list">
            {logs.map((log) => (
              <div key={log.id} className="item">
                <div className="top">
                  <div>
                    <b>Campaign:</b> {log.campaign_id || "—"}
                    <div className="meta">
                      Recipients: {(log.recipients || []).length}
                    </div>
                    <div className="meta">
                      Snapshot: {log.email_snapshot_id || "—"}
                    </div>
                    <div className="meta">
                      Resend ID: {log.resend_id || "—"}
                    </div>
                    {log.error && <div className="meta">Error: {log.error}</div>}
                    <div className="meta">
                      {log.created_at ? new Date(log.created_at).toLocaleString() : "—"}
                    </div>
                  </div>

                  <div className={`status ${log.status === "sent" ? "sent" : log.status === "failed" ? "failed" : ""}`}>
                    {log.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}