"use client";

export default function DashboardPage() {
  return (
    <div className="page">
      <style>{`
        .page{
          min-height: calc(100vh - 64px);
          display:flex;
          align-items:center;
          justify-content:center;
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
          <h1 className="title">Dashboard</h1>
          <p className="sub">
            This is the CoreHQ – Outreach workspace dashboard. Phase 4+ will populate live counts and activity.
          </p>

          <div className="grid">
            <div className="tile">
              <p className="k">Brands</p>
              <p className="v">—</p>
            </div>
            <div className="tile">
              <p className="k">Contacts</p>
              <p className="v">—</p>
            </div>
            <div className="tile">
              <p className="k">Campaigns</p>
              <p className="v">—</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}