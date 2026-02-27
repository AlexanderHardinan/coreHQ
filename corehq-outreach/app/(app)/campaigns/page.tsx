"use client";

export default function CampaignsPage() {
  return (
    <div className="page">
      <style>{`
        .page{
          min-height: calc(100vh - 64px);
          display:flex;
          align-items:center;
          justify-content:center;
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

        .top{
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:16px;
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

        .actions{
          display:flex;
          flex-direction:column;
          align-items:flex-end;
          gap:8px;
          min-width: 220px;
        }

        .btn{
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.92);
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.2px;
          cursor: pointer;
          transition: transform 140ms ease, background 140ms ease, border-color 140ms ease, opacity 140ms ease;
          user-select:none;
          width: 100%;
        }

        .btn:hover{
          transform: translateY(-1px);
          background: rgba(255,255,255,0.12);
          border-color: rgba(255,255,255,0.22);
        }

        .btn:active{
          transform: translateY(0px);
        }

        .btn:disabled{
          cursor:not-allowed;
          opacity: 0.55;
        }

        .hint{
          font-size: 12px;
          color: rgba(255,255,255,0.62);
          line-height: 1.4;
          text-align:right;
        }

        @keyframes cardIn{
          from{ transform: translateY(14px) scale(0.98); opacity: 0; }
          to{ transform: translateY(0px) scale(1); opacity: 1; }
        }
        @keyframes spin{
          from{ transform: rotate(0deg); }
          to{ transform: rotate(360deg); }
        }

        @media (max-width: 720px){
          .top{ flex-direction:column; align-items:stretch; }
          .actions{ align-items:stretch; min-width: 0; }
          .hint{ text-align:left; }
        }

        @media (prefers-reduced-motion: reduce){
          .card, .shine { animation: none !important; }
          .card{ opacity: 1; transform: none; }
          .btn{ transition: none !important; }
        }
      `}</style>

      <div className="card">
        <div className="shine" />

        <div className="top">
          <div>
            <h1 className="title">Campaigns</h1>
            <p className="sub">
              Phase 5 will implement the offer-based campaign builder with primary banner, CTAs, featured URL, optional YouTube preview, and structured email rendering.
            </p>
          </div>

          <div className="actions">
            <button className="btn" disabled title="Phase 5 builder route not created yet">
              + New Campaign
            </button>
            <div className="hint">Builder not wired yet (Phase 5). Next file will create the builder route.</div>
          </div>
        </div>
      </div>
    </div>
  );
}