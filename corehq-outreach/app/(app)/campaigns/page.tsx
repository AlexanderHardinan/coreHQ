"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../src/lib/supabaseClient";

type Campaign = {
  id: string;
  name: string | null;
  subject: string | null;
  status: string;
  created_at: string;
};

type QueueRow = {
  campaign_id: string;
  status: string;
};

type CampaignProgress = {
  total: number;
  queued: number;
  sent: number;
  failed: number;
  percent: number;
};

function getStatusClass(status: string) {
  switch (status) {
    case "scheduled":
      return "statusBlue";
    case "sending":
      return "statusPurple";
    case "sent":
      return "statusGreen";
    case "failed":
      return "statusRed";
    default:
      return "statusDefault";
  }
}

function emptyProgress(): CampaignProgress {
  return {
    total: 0,
    queued: 0,
    sent: 0,
    failed: 0,
    percent: 0,
  };
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [queueRows, setQueueRows] = useState<QueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningWorker, setRunningWorker] = useState(false);
  const [workerMessage, setWorkerMessage] = useState("");

  const load = async () => {
    setLoading(true);

    const [{ data: campaignData, error: campaignError }, { data: queueData }] =
      await Promise.all([
        supabase
          .from("campaigns")
          .select("id,name,subject,status,created_at")
          .order("created_at", { ascending: false }),
        supabase.from("campaign_queue").select("campaign_id,status"),
      ]);

    if (!campaignError && campaignData) {
      setCampaigns(campaignData as Campaign[]);
    }

    if (queueData) {
      setQueueRows(queueData as QueueRow[]);
    }

    setLoading(false);
  };

  const runWorker = async () => {
    setRunningWorker(true);
    setWorkerMessage("Processing campaign queue...");

    try {
      const res = await fetch("/api/process-campaign-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Worker failed with HTTP ${res.status}`);
      }

      setWorkerMessage(
        `Worker complete. Processed ${json.processed || 0} email(s). Batch size: ${json.batchSize || 0}.`
      );

      await load();
    } catch (error: any) {
      setWorkerMessage(error?.message || "Worker failed.");
    } finally {
      setRunningWorker(false);
    }
  };

  useEffect(() => {
    load();

    const channel = supabase
      .channel("campaigns-progress-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "campaigns" }, () => {
        load();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "campaign_queue" }, () => {
        load();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const progressByCampaign = useMemo(() => {
    const map = new Map<string, CampaignProgress>();

    for (const row of queueRows) {
      if (!row.campaign_id) continue;

      const current = map.get(row.campaign_id) || emptyProgress();

      current.total += 1;

      if (row.status === "queued") current.queued += 1;
      if (row.status === "sent") current.sent += 1;
      if (row.status === "failed") current.failed += 1;

      current.percent = current.total ? Math.round(((current.sent + current.failed) / current.total) * 100) : 0;

      map.set(row.campaign_id, current);
    }

    return map;
  }, [queueRows]);

  const totalQueued = useMemo(() => {
    return queueRows.filter((row) => row.status === "queued").length;
  }, [queueRows]);

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
          max-width:1000px;
        }

        .top{
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:12px;
          margin-bottom:16px;
        }

        .title{
          font-size:20px;
          font-weight:900;
        }

        .topActions{
          display:flex;
          gap:8px;
          flex-wrap:wrap;
          justify-content:flex-end;
        }

        .btn{
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.92);
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 800;
          text-decoration:none;
          cursor:pointer;
        }

        .btnPrimary{
          border:0;
          background:linear-gradient(135deg, rgba(59,130,246,1), rgba(168,85,247,1));
          color:white;
        }

        .btn:disabled{
          opacity:0.55;
          cursor:not-allowed;
        }

        .workerBox{
          margin-bottom:16px;
          border-radius:14px;
          padding:12px 14px;
          background:rgba(0,0,0,0.28);
          border:1px solid rgba(255,255,255,0.10);
          color:rgba(255,255,255,0.72);
          font-size:12px;
          line-height:1.55;
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
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:14px;
        }

        .left{
          min-width:0;
          flex:1;
        }

        .meta{
          font-size:12px;
          color: rgba(255,255,255,0.6);
        }

        .actions{
          display:flex;
          gap:8px;
          align-items:center;
          flex-wrap:wrap;
          justify-content:flex-end;
        }

        .status{
          font-size:11px;
          padding:5px 10px;
          border-radius:999px;
          font-weight:800;
          text-transform:capitalize;
        }

        .statusDefault{
          background: rgba(255,255,255,0.1);
        }

        .statusBlue{
          background: rgba(59,130,246,0.2);
          color: rgba(147,197,253,1);
        }

        .statusPurple{
          background: rgba(168,85,247,0.2);
          color: rgba(216,180,254,1);
        }

        .statusGreen{
          background: rgba(34,197,94,0.2);
          color: rgba(134,239,172,1);
        }

        .statusRed{
          background: rgba(239,68,68,0.2);
          color: rgba(252,165,165,1);
        }

        .progressBox{
          margin-top:10px;
          max-width:520px;
        }

        .progressMeta{
          display:flex;
          justify-content:space-between;
          gap:10px;
          font-size:11px;
          color:rgba(255,255,255,0.62);
          margin-bottom:6px;
          flex-wrap:wrap;
        }

        .bar{
          height:8px;
          border-radius:999px;
          background:rgba(255,255,255,0.10);
          overflow:hidden;
        }

        .barFill{
          height:100%;
          border-radius:999px;
          background:linear-gradient(135deg, rgba(59,130,246,1), rgba(34,197,94,1));
          transition: width 220ms ease;
        }

        @media(max-width:760px){
          .top{
            align-items:flex-start;
            flex-direction:column;
          }

          .topActions{
            justify-content:flex-start;
          }

          .item{
            align-items:flex-start;
            flex-direction:column;
          }

          .actions{
            justify-content:flex-start;
          }
        }
      `}</style>

      <div className="wrap">
        <div className="top">
          <div className="title">Campaigns</div>

          <div className="topActions">
            <button
              type="button"
              className="btn btnPrimary"
              onClick={runWorker}
              disabled={runningWorker || totalQueued === 0}
            >
              {runningWorker ? "Processing..." : `Run Worker (${totalQueued})`}
            </button>

            <Link href="/campaigns/new" className="btn">
              + New Campaign
            </Link>
          </div>
        </div>

        <div className="workerBox">
          {workerMessage || "Manual worker is ready. Queue campaigns, then click Run Worker to send queued emails."}
        </div>

        {loading ? (
          <div>Loading campaigns...</div>
        ) : campaigns.length === 0 ? (
          <div>No campaigns found.</div>
        ) : (
          <div className="list">
            {campaigns.map((c) => {
              const progress = progressByCampaign.get(c.id) || emptyProgress();

              return (
                <div key={c.id} className="item">
                  <div className="left">
                    <div>
                      <b>{c.name || "Untitled Campaign"}</b>
                    </div>
                    <div className="meta">{c.subject || "No subject"}</div>
                    <div className="meta">{new Date(c.created_at).toLocaleString()}</div>

                    <div className="progressBox">
                      <div className="progressMeta">
                        <span>Progress: {progress.percent}%</span>
                        <span>Queued: {progress.queued}</span>
                        <span>Sent: {progress.sent}</span>
                        <span>Failed: {progress.failed}</span>
                        <span>Total: {progress.total}</span>
                      </div>
                      <div className="bar">
                        <div className="barFill" style={{ width: `${progress.percent}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="actions">
                    <div className={`status ${getStatusClass(c.status)}`}>{c.status}</div>

                    <Link href={`/campaigns/new?id=${c.id}`} className="btn">
                      Edit
                    </Link>

                    <Link href={`/campaigns/preview?id=${c.id}`} className="btn">
                      Preview
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}