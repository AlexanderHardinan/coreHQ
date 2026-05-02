"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../../src/lib/supabaseClient";

type Brand = {
  id: string;
  name: string;
  slug: string;
};

type ToastKind = "success" | "error" | "info";

function Toast({
  open,
  kind,
  message,
}: {
  open: boolean;
  kind: ToastKind;
  message: string;
}) {
  const accent = useMemo(() => {
    if (kind === "success") return "rgba(34,197,94,1)";
    if (kind === "error") return "rgba(239,68,68,1)";
    return "rgba(59,130,246,1)";
  }, [kind]);

  return (
    <div
      className={`toast ${open ? "toastOpen" : "toastClose"}`}
      style={{ ["--toastAccent" as any]: accent }}
      role="status"
      aria-live="polite"
    >
      <div className="toastBar" />
      <div className="toastBody">
        <div className="toastDot" />
        <div className="toastText">{message}</div>
      </div>
    </div>
  );
}

type Contact = {
  id: string;
  email: string;
  full_name: string | null;
  company: string | null;
  country: string | null;
  created_at: string;
};

type SegmentRow = {
  contact_id: string;
  tags: string[] | null;
  opt_in_status: string | null;
  last_engagement_at: string | null;
  contacts: Contact | null;
};

type SavedSegment = {
  id: string;
  name: string;
  brand_id: string;
  rules: {
    engagement?: EngagementFilter;
    tagMode?: TagMode;
    tags?: string[];
    country?: string;
    optInStatus?: OptInFilter;
    createdFrom?: string;
    createdTo?: string;
    lastSince?: string;
  } | null;
  created_at: string | null;
};

type EngagementFilter = "any" | "open" | "click";
type TagMode = "any" | "all";
type OptInFilter = "any" | "subscribed" | "unsubscribed" | "pending" | "bounced";

function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 25);
}

function fmtDate(ts: string | null): string {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default function SegmentsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);

  const [brandId, setBrandId] = useState("");
  const [engagement, setEngagement] = useState<EngagementFilter>("any");
  const [tagMode, setTagMode] = useState<TagMode>("any");
  const [tagsRaw, setTagsRaw] = useState("");
  const [country, setCountry] = useState("");
  const [optInStatus, setOptInStatus] = useState<OptInFilter>("any");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [lastSince, setLastSince] = useState("");

  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [rows, setRows] = useState<SegmentRow[]>([]);
  const [hint, setHint] = useState<string>("Select a brand to preview segment size.");

  const [toastOpen, setToastOpen] = useState(false);
  const [toastKind, setToastKind] = useState<ToastKind>("info");
  const [toastMsg, setToastMsg] = useState("");
  const toastTimer = useRef<number | null>(null);
  const previewRunRef = useRef(0);

  // ✅ ADDED — Phase 5.4 save segment state only
  const [segmentName, setSegmentName] = useState("");
  const [savingSegment, setSavingSegment] = useState(false);

  // ✅ ADDED — Phase 5.5 segment reuse state only
  const [savedSegments, setSavedSegments] = useState<SavedSegment[]>([]);
  const [segmentsLoading, setSegmentsLoading] = useState(false);
  const [deletingSegmentId, setDeletingSegmentId] = useState<string | null>(null);

  const showToast = (kind: ToastKind, msg: string) => {
    setToastKind(kind);
    setToastMsg(msg);
    setToastOpen(true);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastOpen(false), 2600);
  };

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  const tags = useMemo(() => parseTags(tagsRaw), [tagsRaw]);

  const loadBrands = async () => {
    setBrandsLoading(true);
    const { data, error } = await supabase
      .from("brands")
      .select("id,name,slug")
      .order("name", { ascending: true });

    if (error) {
      setBrands([]);
      setBrandsLoading(false);
      showToast("error", error.message || "Failed to load brands.");
      return;
    }

    const list = (data as Brand[]) ?? [];
    setBrands(list);

    if (!brandId && list.length > 0) {
      setBrandId(list[0].id);
    }

    setBrandsLoading(false);
  };

  useEffect(() => {
    loadBrands();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ ADDED — Phase 5.5 load saved segments by selected brand only
  const loadSavedSegments = async () => {
    if (!brandId) {
      setSavedSegments([]);
      return;
    }

    setSegmentsLoading(true);

    const { data, error } = await supabase
      .from("segments")
      .select("id,name,brand_id,rules,created_at")
      .eq("brand_id", brandId)
      .order("created_at", { ascending: false });

    setSegmentsLoading(false);

    if (error) {
      setSavedSegments([]);
      showToast("error", error.message || "Failed to load saved segments.");
      return;
    }

    setSavedSegments(((data ?? []) as unknown) as SavedSegment[]);
  };

  useEffect(() => {
    loadSavedSegments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandId]);

  // ✅ ADDED — Phase 5.4 save current filters to segments table only
  const handleSaveSegment = async () => {
    const cleanName = segmentName.trim();

    if (!brandId) {
      showToast("error", "Select a brand before saving a segment.");
      return;
    }

    if (!cleanName) {
      showToast("error", "Segment name is required.");
      return;
    }

    setSavingSegment(true);

    const rules = {
      engagement,
      tagMode,
      tags,
      country: country.trim(),
      optInStatus,
      createdFrom,
      createdTo,
      lastSince,
    };

    const { error } = await supabase.from("segments").insert({
      name: cleanName,
      brand_id: brandId,
      rules,
    });

    setSavingSegment(false);

    if (error) {
      showToast("error", error.message || "Failed to save segment.");
      return;
    }

    setSegmentName("");
    showToast("success", "Segment saved.");
    loadSavedSegments();
  };

  // ✅ ADDED — Phase 5.5 apply saved segment rules only
  const handleApplySegment = (segment: SavedSegment) => {
    const rules = segment.rules;

    if (!rules) {
      showToast("error", "This segment has no saved rules.");
      return;
    }

    setEngagement(rules.engagement || "any");
    setTagMode(rules.tagMode || "any");
    setTagsRaw(Array.isArray(rules.tags) ? rules.tags.join(", ") : "");
    setCountry(rules.country || "");
    setOptInStatus(rules.optInStatus || "any");
    setCreatedFrom(rules.createdFrom || "");
    setCreatedTo(rules.createdTo || "");
    setLastSince(rules.lastSince || "");

    showToast("success", "Segment loaded.");
  };

  // ✅ ADDED — Phase 5.5 delete saved segment only
  const handleDeleteSegment = async (segmentId: string) => {
    if (!segmentId) return;

    setDeletingSegmentId(segmentId);

    const { error } = await supabase.from("segments").delete().eq("id", segmentId);

    setDeletingSegmentId(null);

    if (error) {
      showToast("error", error.message || "Failed to delete segment.");
      return;
    }

    setSavedSegments((current) => current.filter((segment) => segment.id !== segmentId));
    showToast("success", "Segment deleted.");
  };

  const applyFilters = (q: any) => {
    let query = q.eq("brand_id", brandId);

    if (tags.length > 0) {
      if (tagMode === "all") query = query.contains("tags", tags);
      else query = query.overlaps("tags", tags);
    }

    if (optInStatus !== "any") {
      query = query.eq("opt_in_status", optInStatus);
    }

    const c = country.trim();
    if (c) query = query.ilike("contacts.country", `%${c}%`);

    if (createdFrom) {
      const fromIso = new Date(`${createdFrom}T00:00:00.000Z`).toISOString();
      query = query.gte("contacts.created_at", fromIso);
    }

    if (createdTo) {
      const toIso = new Date(`${createdTo}T23:59:59.999Z`).toISOString();
      query = query.lte("contacts.created_at", toIso);
    }

    if (lastSince) {
      const sinceIso = new Date(`${lastSince}T00:00:00.000Z`).toISOString();
      query = query.gte("last_engagement_at", sinceIso);
    }

    return query;
  };

  const buildBaseQuery = () => {
    return applyFilters(
      supabase
        .from("contact_brands")
        .select(
          "contact_id,tags,opt_in_status,last_engagement_at,contacts!inner(id,email,full_name,company,country,created_at)",
        ),
    );
  };

  const buildBaseCountQuery = () => {
    return applyFilters(
      supabase
        .from("contact_brands")
        .select("contact_id,contacts!inner(id)", { count: "exact", head: true }),
    );
  };

  const fetchEngagedContactIdSet = async (
    baseContactIds: string[],
    wanted: EngagementFilter,
    brand: string,
  ): Promise<Set<string>> => {
    if (wanted === "any") return new Set(baseContactIds);
    if (baseContactIds.length === 0) return new Set<string>();

    const MAX_IDS = 5000;
    const ids = baseContactIds.slice(0, MAX_IDS);

    const { data, error } = await supabase
      .from("email_events")
      .select("contact_id, emails!inner(campaign_id, campaigns!inner(brand_id))")
      .in("contact_id", ids)
      .eq("event", wanted)
      .eq("emails.campaigns.brand_id", brand);

    if (error) throw error;

    const set = new Set<string>();
    const arr = (data as any[]) ?? [];
    for (const r of arr) {
      if (r?.contact_id) set.add(r.contact_id);
    }
    return set;
  };

  const runPreview = async () => {
    const runId = previewRunRef.current + 1;
    previewRunRef.current = runId;

    if (!brandId) {
      setPreviewCount(null);
      setRows([]);
      setHint("Select a brand to preview segment size.");
      return;
    }

    setPreviewLoading(true);
    setHint("Computing live preview…");

    try {
      if (engagement === "any") {
        const countRes = await buildBaseCountQuery();

        if (countRes.error) throw countRes.error;
        if (previewRunRef.current !== runId) return;

        const rowRes = await buildBaseQuery()
          .order("last_engagement_at", { ascending: false })
          .limit(50);

        if (rowRes.error) throw rowRes.error;
        if (previewRunRef.current !== runId) return;

        const nextRows = ((rowRes.data ?? []) as unknown) as SegmentRow[];

        setPreviewCount(countRes.count ?? 0);
        setRows(nextRows);
        setHint((countRes.count ?? 0) === 0 ? "No matches for current filters." : "Live preview updated.");
        return;
      }

      const baseQ = buildBaseQuery().order("last_engagement_at", { ascending: false }).limit(5000);

      const baseRes = await baseQ;
      if (baseRes.error) throw baseRes.error;
      if (previewRunRef.current !== runId) return;

      const baseRows = ((baseRes.data ?? []) as unknown) as SegmentRow[];
      const baseIds = baseRows.map((r) => r.contact_id);

      const engagedSet = await fetchEngagedContactIdSet(baseIds, engagement, brandId);
      if (previewRunRef.current !== runId) return;

      const finalCount = engagedSet.size;
      setPreviewCount(finalCount);

      const filteredForPreview = baseRows.filter((r) => engagedSet.has(r.contact_id)).slice(0, 50);

      setRows(filteredForPreview);

      if (baseIds.length >= 5000) {
        setHint("Preview capped at 5,000 contacts for engagement evaluation. Counts may require RPC at scale.");
      } else {
        setHint(finalCount === 0 ? "No matches for current filters." : "Live preview updated.");
      }
    } catch (err: any) {
      if (previewRunRef.current !== runId) return;

      setPreviewCount(null);
      setRows([]);
      setHint("Preview failed.");
      showToast("error", err?.message || "Failed to compute preview.");
    } finally {
      if (previewRunRef.current === runId) {
        setPreviewLoading(false);
      }
    }
  };

  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      runPreview();
    }, 450);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandId, engagement, tagMode, tagsRaw, country, optInStatus, createdFrom, createdTo, lastSince]);

  return (
    <div className="page">
      <style>{`
        :root { color-scheme: dark; }

        .page{ min-height: calc(100vh - 64px); padding: 20px 16px 28px 16px; }
        .wrap{ width:100%; max-width: 1200px; margin: 0 auto; }
        .card{
          width:100%; border-radius:18px; padding:24px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.10);
          box-shadow: 0 20px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08);
          backdrop-filter: blur(14px); position:relative; overflow:hidden;
          transform: translateY(10px); opacity: 0;
          animation: cardIn 650ms cubic-bezier(.2,.9,.2,1) forwards;
        }
        .shine{
          position:absolute; inset:-40%;
          background: conic-gradient(from 180deg, transparent, rgba(255,255,255,0.10), transparent);
          filter: blur(18px); animation: spin 10s linear infinite; opacity: 0.45; pointer-events:none;
        }
        .head{ display:flex; align-items:flex-start; justify-content:space-between; gap: 12px; margin-bottom: 16px; }
        .title{ margin:0; font-size:18px; font-weight:900; letter-spacing: 0.2px; }
        .sub{ margin: 8px 0 0 0; font-size: 13px; color: rgba(255,255,255,0.68); line-height: 1.6; max-width: 780px; }
        .pill{
          display:inline-flex; align-items:center; gap: 8px; padding: 8px 10px;
          border-radius: 999px; border: 1px solid rgba(255,255,255,0.12);
          background: rgba(0,0,0,0.35); color: rgba(255,255,255,0.82);
          font-size: 12px; white-space: nowrap;
        }
        .dot{ width: 8px; height: 8px; border-radius: 999px; background: rgba(59,130,246,1); box-shadow: 0 0 0 4px rgba(59,130,246,0.18); }
        .dotBusy{ background: rgba(168,85,247,1); box-shadow: 0 0 0 4px rgba(168,85,247,0.18); }
        .grid{ margin-top: 14px; display:grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 12px; }
        .field{ display:flex; flex-direction:column; gap: 8px; }
        .label{ font-size: 12px; color: rgba(255,255,255,0.72); letter-spacing: 0.2px; }
        .input, .select{
          width: 100%; border-radius: 12px; border: 1px solid rgba(255,255,255,0.12);
          background: rgba(0,0,0,0.40); color: white; padding: 11px 12px; outline:none;
          transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
        }
        .input:focus, .select:focus{
          border-color: rgba(59,130,246,0.55);
          box-shadow: 0 0 0 4px rgba(59,130,246,0.18);
          transform: translateY(-1px);
        }
        .segToggle{
          display:flex; gap: 8px; padding: 6px; border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.12); background: rgba(0,0,0,0.32);
        }
        .segOpt{
          flex: 1 1 auto; border: 1px solid rgba(255,255,255,0.10);
          background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.82);
          border-radius: 12px; padding: 10px 10px; font-weight: 800;
          letter-spacing: 0.2px; cursor:pointer; transition: transform 160ms ease, background 160ms ease, border-color 160ms ease, filter 160ms ease;
          text-align:center; user-select:none;
        }
        .segOpt:hover{ transform: translateY(-1px); background: rgba(255,255,255,0.10); border-color: rgba(255,255,255,0.18); }
        .segOptActive{
          border-color: rgba(59,130,246,0.35);
          background: linear-gradient(135deg, rgba(59,130,246,0.20), rgba(168,85,247,0.14));
          color: rgba(255,255,255,0.92); filter: brightness(1.03);
        }
        .previewRow{
          margin-top: 16px; display:flex; align-items:center; justify-content:space-between; gap: 12px;
          padding: 14px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.10);
          background: rgba(0,0,0,0.30);
        }
        .count{ font-size: 26px; font-weight: 950; letter-spacing: 0.3px; }
        .countSub{ margin-top: 4px; font-size: 12px; color: rgba(255,255,255,0.65); line-height: 1.5; }
        .hint{ font-size: 12px; color: rgba(255,255,255,0.65); line-height: 1.5; text-align:right; }
        table{ width:100%; border-collapse:collapse; margin-top: 14px; overflow:hidden; border-radius: 14px; }
        thead{ background: rgba(255,255,255,0.05); }
        th, td{ text-align:left; padding:12px 14px; font-size:13px; vertical-align: top; }
        th{ color:rgba(255,255,255,0.65); font-weight:700; border-bottom:1px solid rgba(255,255,255,0.08); }
        tbody tr{ border-bottom:1px solid rgba(255,255,255,0.05); transition: background 160ms ease; }
        tbody tr:hover{ background: rgba(255,255,255,0.04); }
        .email{ font-weight:800; }
        .tagPill{
          display:inline-flex; align-items:center; padding: 6px 10px; border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.78); font-size: 12px; margin-right: 6px; margin-bottom: 6px;
        }
        .skeleton{
          height: 14px; border-radius:999px; background: rgba(255,255,255,0.08);
          overflow:hidden; position:relative;
        }
        .skeleton::after{
          content:""; position:absolute; inset:0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
          animation: shimmer 1.2s infinite;
        }
        .toast{
          position: fixed; right: 16px; top: 16px; width: min(420px, calc(100vw - 32px));
          border-radius: 14px; border: 1px solid rgba(255,255,255,0.12);
          background: rgba(10,10,10,0.72); backdrop-filter: blur(14px);
          box-shadow: 0 20px 70px rgba(0,0,0,0.55); overflow:hidden;
          transform: translateY(-10px); opacity: 0; pointer-events:none; z-index: 80;
        }
        .toastOpen{ animation: toastIn 260ms cubic-bezier(.2,.9,.2,1) forwards; pointer-events:auto; }
        .toastClose{ animation: toastOut 220ms ease forwards; pointer-events:none; }
        .toastBar{ height: 3px; background: var(--toastAccent); }
        .toastBody{ display:flex; gap: 10px; padding: 12px; align-items:flex-start; }
        .toastDot{
          margin-top: 3px; height: 10px; width: 10px; border-radius: 999px;
          background: var(--toastAccent); box-shadow: 0 0 0 4px color-mix(in srgb, var(--toastAccent) 25%, transparent);
          flex: 0 0 auto;
        }
        .toastText{ font-size: 13px; color: rgba(255,255,255,0.88); line-height: 1.45; }

        @keyframes shimmer{ from{ transform: translateX(-60%); } to{ transform: translateX(60%); } }
        @keyframes cardIn{ from{ transform: translateY(14px) scale(0.98); opacity: 0; } to{ transform: translateY(0px) scale(1); opacity: 1; } }
        @keyframes spin{ from{ transform: rotate(0deg); } to{ transform: rotate(360deg); } }
        @keyframes toastIn{ from{ transform: translateY(-10px); opacity: 0; } to{ transform: translateY(0px); opacity: 1; } }
        @keyframes toastOut{ from{ transform: translateY(0px); opacity: 1; } to{ transform: translateY(-10px); opacity: 0; } }

        @media (max-width: 980px){ .grid{ grid-template-columns: 1fr 1fr; } .col12{ grid-column: 1 / -1 !important; } }
        @media (max-width: 640px){ .grid{ grid-template-columns: 1fr; } .previewRow{ flex-direction: column; align-items:flex-start; } .hint{ text-align:left; } }
        @media (prefers-reduced-motion: reduce){
          .card, .shine, .skeleton::after, .toastOpen, .toastClose { animation: none !important; }
          .card{ opacity: 1; transform:none; }
        }
      `}</style>

      <Toast open={toastOpen} kind={toastKind} message={toastMsg} />

      <div className="wrap">
        <div className="card">
          <div className="shine" />

          <div className="head">
            <div>
              <h1 className="title">Segments</h1>
              <p className="sub">
                Phase 5.2: brand-level segmentation filters with live preview. Filters include Brand, Engagement,
                Tags, Country, Opt-in Status, Created Date Range, and Last Activity.
              </p>
            </div>

            <div className="pill" title="Live preview status">
              <span className={`dot ${previewLoading ? "dotBusy" : ""}`} />
              <span>{previewLoading ? "Previewing…" : "Live Preview"}</span>
            </div>
          </div>

          <div className="grid">
            <div className="field col12" style={{ gridColumn: "span 4" }}>
              <div className="label">Brand (required)</div>
              <select className="select" value={brandId} onChange={(e) => setBrandId(e.target.value)} disabled={brandsLoading} required>
                {brandsLoading && <option value="">Loading brands…</option>}
                {!brandsLoading && brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                {!brandsLoading && brands.length === 0 && <option value="">No brands found</option>}
              </select>
            </div>

            <div className="field col12" style={{ gridColumn: "span 4" }}>
              <div className="label">Engagement</div>
              <select className="select" value={engagement} onChange={(e) => setEngagement(e.target.value as EngagementFilter)} disabled={!brandId}>
                <option value="any">Any</option>
                <option value="open">Opened</option>
                <option value="click">Clicked</option>
              </select>
            </div>

            <div className="field col12" style={{ gridColumn: "span 4" }}>
              <div className="label">Opt-in Status</div>
              <select className="select" value={optInStatus} onChange={(e) => setOptInStatus(e.target.value as OptInFilter)} disabled={!brandId}>
                <option value="any">Any</option>
                <option value="subscribed">Subscribed</option>
                <option value="unsubscribed">Unsubscribed</option>
                <option value="pending">Pending</option>
                <option value="bounced">Bounced</option>
              </select>
            </div>

            <div className="field col12" style={{ gridColumn: "span 6" }}>
              <div className="label">Created From</div>
              <input className="input" type="date" value={createdFrom} onChange={(e) => setCreatedFrom(e.target.value)} disabled={!brandId} />
            </div>

            <div className="field col12" style={{ gridColumn: "span 6" }}>
              <div className="label">Created To</div>
              <input className="input" type="date" value={createdTo} onChange={(e) => setCreatedTo(e.target.value)} disabled={!brandId} />
            </div>

            <div className="field col12" style={{ gridColumn: "span 4" }}>
              <div className="label">Last activity since</div>
              <input className="input" type="date" value={lastSince} onChange={(e) => setLastSince(e.target.value)} disabled={!brandId} />
            </div>

            <div className="field col12" style={{ gridColumn: "span 4" }}>
              <div className="label">Country</div>
              <input className="input" type="text" placeholder="Thailand" value={country} onChange={(e) => setCountry(e.target.value)} disabled={!brandId} />
            </div>

            <div className="field col12" style={{ gridColumn: "span 4" }}>
              <div className="label">Tag match</div>
              <div className="segToggle">
                <div className={`segOpt ${tagMode === "any" ? "segOptActive" : ""}`} onClick={() => setTagMode("any")} role="button" tabIndex={0}>Any</div>
                <div className={`segOpt ${tagMode === "all" ? "segOptActive" : ""}`} onClick={() => setTagMode("all")} role="button" tabIndex={0}>All</div>
              </div>
            </div>

            <div className="field col12" style={{ gridColumn: "span 12" }}>
              <div className="label">Tags (comma-separated)</div>
              <input className="input" type="text" placeholder="vip, investor, enterprise" value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} disabled={!brandId} />
            </div>
          </div>

          <div className="previewRow">
            <div>
              <div className="count">
                {previewLoading ? <span className="skeleton" style={{ width: 120, display: "inline-block" }} /> : previewCount === null ? "—" : previewCount.toLocaleString()}
              </div>
              <div className="countSub">Live preview contact count</div>
            </div>
            <div className="hint">{hint}</div>
          </div>

          {!previewLoading && rows.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Country</th>
                  <th>Opt-in</th>
                  <th>Tags</th>
                  <th>Created</th>
                  <th>Last Engagement</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const c = r.contacts;
                  return (
                    <tr key={r.contact_id}>
                      <td className="email">{c?.email || "—"}</td>
                      <td>{c?.full_name || "—"}</td>
                      <td>{c?.country || "—"}</td>
                      <td>{r.opt_in_status || "—"}</td>
                      <td>
                        {(r.tags ?? []).length === 0 ? "—" : (
                          <div style={{ display: "flex", flexWrap: "wrap" }}>
                            {(r.tags ?? []).slice(0, 12).map((t) => <span key={t} className="tagPill">{t}</span>)}
                          </div>
                        )}
                      </td>
                      <td>{fmtDate(c?.created_at || null)}</td>
                      <td>{fmtDate(r.last_engagement_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* ✅ ADDED — Phase 5.4 Save Segment UI only */}
          <div style={{ marginTop: 20 }}>
            <div className="label">Save Segment</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="input"
                type="text"
                placeholder="Segment name"
                value={segmentName}
                onChange={(e) => setSegmentName(e.target.value)}
                disabled={!brandId || savingSegment}
              />
              <button
                className="segOpt segOptActive"
                type="button"
                onClick={handleSaveSegment}
                disabled={!brandId || savingSegment}
              >
                {savingSegment ? "Saving…" : "Save"}
              </button>
            </div>
          </div>

          {/* ✅ ADDED — Phase 5.5 Saved Segments reuse UI only */}
          <div style={{ marginTop: 20 }}>
            <div className="label">Saved Segments</div>

            {segmentsLoading ? (
              <div style={{ marginTop: 10 }}>
                <div className="skeleton" />
              </div>
            ) : savedSegments.length === 0 ? (
              <div style={{ marginTop: 10, color: "rgba(255,255,255,0.60)", fontSize: 13 }}>
                No saved segments for this brand.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                {savedSegments.map((segment) => (
                  <div
                    key={segment.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      padding: 10,
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(0,0,0,0.26)",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: "rgba(255,255,255,0.88)", fontSize: 13, fontWeight: 800 }}>
                        {segment.name}
                      </div>
                      <div style={{ color: "rgba(255,255,255,0.52)", fontSize: 12, marginTop: 4 }}>
                        {fmtDate(segment.created_at)}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      <button
                        className="segOpt"
                        type="button"
                        onClick={() => handleApplySegment(segment)}
                      >
                        Load
                      </button>
                      <button
                        className="segOpt"
                        type="button"
                        onClick={() => handleDeleteSegment(segment.id)}
                        disabled={deletingSegmentId === segment.id}
                      >
                        {deletingSegmentId === segment.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}