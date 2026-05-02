"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../../src/lib/supabaseClient";

type Campaign = {
  id: string;
  name: string | null;
  subject: string | null;
  status: string;
  created_at: string;
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

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("campaigns")
        .select("id,name,subject,status,created_at")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setCampaigns(data as Campaign[]);
      }

      setLoading(false);
    };

    load();
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
          max-width:1000px;
        }

        .top{
          display:flex;
          justify-content:space-between;
          align-items:center;
          margin-bottom:16px;
        }

        .title{
          font-size:20px;
          font-weight:900;
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
        }

        .meta{
          font-size:12px;
          color: rgba(255,255,255,0.6);
        }

        .actions{
          display:flex;
          gap:8px;
          align-items:center;
        }

        /* ✅ Status styles */
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
      `}</style>

      <div className="wrap">
        <div className="top">
          <div className="title">Campaigns</div>
          <Link href="/campaigns/new" className="btn">
            + New Campaign
          </Link>
        </div>

        {loading ? (
          <div>Loading campaigns...</div>
        ) : campaigns.length === 0 ? (
          <div>No campaigns found.</div>
        ) : (
          <div className="list">
            {campaigns.map((c) => (
              <div key={c.id} className="item">
                <div>
                  <div><b>{c.name || "Untitled Campaign"}</b></div>
                  <div className="meta">{c.subject || "No subject"}</div>
                  <div className="meta">
                    {new Date(c.created_at).toLocaleString()}
                  </div>
                </div>

                <div className="actions">
                  <div className={`status ${getStatusClass(c.status)}`}>
                    {c.status}
                  </div>

                  <Link href={`/campaigns/new?id=${c.id}`} className="btn">
                    Edit
                  </Link>

                  <Link href={`/campaigns/preview?id=${c.id}`} className="btn">
                    Preview
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}