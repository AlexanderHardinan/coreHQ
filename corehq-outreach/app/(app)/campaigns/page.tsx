"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../../../src/lib/supabaseClient";

type Campaign = {
  id: string;
  name: string | null;
  subject: string | null;
  status: string;
  created_at: string;
};

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
        }

        .status{
          font-size:11px;
          padding:4px 8px;
          border-radius:8px;
          background: rgba(255,255,255,0.1);
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
                  <div className="status">{c.status}</div>

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