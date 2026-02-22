"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../src/lib/supabaseClient";

type Contact = {
  id: string;
  email: string;
  full_name: string | null;
  company: string | null;
  country: string | null;
  created_at: string;
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setContacts(data as Contact[]);
      setLoading(false);
    };

    load();
  }, []);

  const empty = useMemo(() => !loading && contacts.length === 0, [loading, contacts]);

  return (
    <div className="page">
      <style>{`
        .page{
          min-height: calc(100vh - 64px);
        }

        .wrap{
          width:100%;
          max-width:1200px;
          margin:0 auto;
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
          position:relative;
          overflow:hidden;
          animation: cardIn 650ms cubic-bezier(.2,.9,.2,1);
        }

        .shine{
          position:absolute;
          inset:-40%;
          background: conic-gradient(from 180deg, transparent, rgba(255,255,255,0.10), transparent);
          filter: blur(18px);
          animation: spin 10s linear infinite;
          opacity: 0.4;
          pointer-events:none;
        }

        .header{
          display:flex;
          justify-content:space-between;
          align-items:center;
          margin-bottom:18px;
        }

        .title{
          margin:0;
          font-size:18px;
          font-weight:900;
        }

        .meta{
          font-size:13px;
          color:rgba(255,255,255,0.65);
        }

        table{
          width:100%;
          border-collapse:collapse;
        }

        thead{
          background: rgba(255,255,255,0.05);
        }

        th, td{
          text-align:left;
          padding:12px 14px;
          font-size:13px;
        }

        th{
          color:rgba(255,255,255,0.65);
          font-weight:700;
          border-bottom:1px solid rgba(255,255,255,0.08);
        }

        tbody tr{
          border-bottom:1px solid rgba(255,255,255,0.05);
          transition: background 160ms ease;
        }

        tbody tr:hover{
          background: rgba(255,255,255,0.04);
        }

        .email{
          font-weight:700;
        }

        .empty{
          padding:40px 0;
          text-align:center;
          color:rgba(255,255,255,0.55);
          font-size:14px;
        }

        .error{
          padding:20px;
          border-radius:12px;
          background: rgba(239,68,68,0.12);
          border: 1px solid rgba(239,68,68,0.3);
          color: rgba(239,68,68,1);
          font-size:13px;
        }

        .skeleton{
          height:14px;
          border-radius:999px;
          background: rgba(255,255,255,0.08);
          overflow:hidden;
          position:relative;
        }

        .skeleton::after{
          content:"";
          position:absolute;
          inset:0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
          animation: shimmer 1.2s infinite;
        }

        @keyframes shimmer{
          from{ transform: translateX(-60%); }
          to{ transform: translateX(60%); }
        }

        @keyframes spin{
          from{ transform: rotate(0deg); }
          to{ transform: rotate(360deg); }
        }

        @keyframes cardIn{
          from{ transform: translateY(14px); opacity:0; }
          to{ transform: translateY(0); opacity:1; }
        }
      `}</style>

      <div className="wrap">
        <div className="card">
          <div className="shine" />

          <div className="header">
            <h1 className="title">Contacts</h1>
            <div className="meta">
              {loading ? "Loading…" : `${contacts.length} total`}
            </div>
          </div>

          {error && <div className="error">{error}</div>}

          {!error && loading && (
            <div>
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div className="skeleton" />
                </div>
              ))}
            </div>
          )}

          {!error && empty && (
            <div className="empty">
              No contacts found. Phase 4.2 will allow manual creation and CSV import.
            </div>
          )}

          {!error && !loading && contacts.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Full Name</th>
                  <th>Company</th>
                  <th>Country</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={c.id}>
                    <td className="email">{c.email}</td>
                    <td>{c.full_name || "—"}</td>
                    <td>{c.company || "—"}</td>
                    <td>{c.country || "—"}</td>
                    <td>
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}