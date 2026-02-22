"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../../src/lib/supabaseClient";

type Contact = {
  id: string;
  email: string;
  full_name: string | null;
  company: string | null;
  country: string | null;
  created_at: string;
};

type Brand = {
  id: string;
  name: string;
  slug: string;
};

type ToastKind = "success" | "error" | "info";

type CsvRow = {
  email: string;
  full_name: string | null;
  company: string | null;
  country: string | null;
};

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

/**
 * Minimal CSV line parser with quote support.
 * - Supports commas inside quotes: "Acme, Inc"
 * - Supports escaped quotes: "" inside quoted strings
 */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        const next = line[i + 1];
        if (next === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
  }

  out.push(cur);
  return out.map((s) => s.trim());
}

function chunk<T>(arr: T[], size: number): T[][][][number] | any {
  const res: T[][] = [];
  for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
  return res;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formEmail, setFormEmail] = useState("");
  const [formFullName, setFormFullName] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formCountry, setFormCountry] = useState("");
  const [formBrandId, setFormBrandId] = useState("");

  // Phase 4.3: CSV import modal + state
  const [importOpen, setImportOpen] = useState(false);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [csvParseError, setCsvParseError] = useState<string | null>(null);

  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStats, setImportStats] = useState<{
    total: number;
    unique: number;
    invalid: number;
    suppressed: number;
    created: number;
    updated: number;
    linked: number;
    skippedDuplicates: number;
  }>({
    total: 0,
    unique: 0,
    invalid: 0,
    suppressed: 0,
    created: 0,
    updated: 0,
    linked: 0,
    skippedDuplicates: 0,
  });

  const [toastOpen, setToastOpen] = useState(false);
  const [toastKind, setToastKind] = useState<ToastKind>("info");
  const [toastMsg, setToastMsg] = useState("");
  const toastTimer = useRef<number | null>(null);

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

  const loadContacts = async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setContacts((data as Contact[]) ?? []);
    setLoading(false);
  };

  const loadBrands = async () => {
    setBrandsLoading(true);
    const { data, error } = await supabase
      .from("brands")
      .select("id,name,slug")
      .order("name", { ascending: true });

    if (error) {
      setBrands([]);
      setBrandsLoading(false);
      return;
    }

    const rows = (data as Brand[]) ?? [];
    setBrands(rows);

    // default select first brand if none selected yet
    if (!formBrandId && rows.length > 0) setFormBrandId(rows[0].id);

    setBrandsLoading(false);
  };

  useEffect(() => {
    loadContacts();
    loadBrands();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const empty = useMemo(
    () => !loading && contacts.length === 0,
    [loading, contacts]
  );

  const openModal = () => {
    setModalOpen(true);
    setError(null);
    // keep brand selection as-is
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
  };

  // Phase 4.3: CSV modal open/close (do not interfere with Add Contact modal)
  const openImportModal = () => {
    setImportOpen(true);
    setCsvParseError(null);
    setCsvFileName(null);
    setCsvRows([]);
    setImportProgress(0);
    setImportStats({
      total: 0,
      unique: 0,
      invalid: 0,
      suppressed: 0,
      created: 0,
      updated: 0,
      linked: 0,
      skippedDuplicates: 0,
    });
  };

  const closeImportModal = () => {
    if (importing) return;
    setImportOpen(false);
  };

  const resetForm = () => {
    setFormEmail("");
    setFormFullName("");
    setFormCompany("");
    setFormCountry("");
    // keep selected brand id
  };

  const ensureContactBrandLink = async (contactId: string, brandId: string) => {
    // Insert w/ safety: ignore duplicates via "upsert" if the unique exists on (contact_id, brand_id)
    const { error } = await supabase.from("contact_brands").upsert(
      {
        contact_id: contactId,
        brand_id: brandId,
      },
      {
        onConflict: "contact_id,brand_id",
        ignoreDuplicates: true,
      } as any
    );

    if (!error) return;

    // Fallback: if upsert option isn't honored in some environments, still ignore duplicate/unique errors
    const msg = (error.message || "").toLowerCase();
    if (msg.includes("duplicate") || msg.includes("unique")) return;

    throw error;
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const email = formEmail.trim();
    const full_name = formFullName.trim();
    const company = formCompany.trim();
    const country = formCountry.trim();
    const brand_id = formBrandId;

    if (!email) {
      showToast("error", "Email is required.");
      return;
    }
    if (!brand_id) {
      showToast("error", "Please select a brand.");
      return;
    }

    setSaving(true);
    showToast("info", "Saving contact…");

    try {
      // 1) Dedup by email (citext should be case-insensitive already)
      const existing = await supabase
        .from("contacts")
        .select("id,email,full_name,company,country")
        .eq("email", email)
        .maybeSingle();

      if (existing.error) {
        throw existing.error;
      }

      let contactId: string;

      if (existing.data?.id) {
        contactId = existing.data.id;

        // Update missing fields only (do not overwrite existing non-empty)
        const patch: Record<string, any> = {};
        const cur = existing.data as any;

        if (full_name && (!cur.full_name || String(cur.full_name).trim() === ""))
          patch.full_name = full_name;
        if (company && (!cur.company || String(cur.company).trim() === ""))
          patch.company = company;
        if (country && (!cur.country || String(cur.country).trim() === ""))
          patch.country = country;

        if (Object.keys(patch).length > 0) {
          const up = await supabase.from("contacts").update(patch).eq("id", contactId);
          if (up.error) throw up.error;
        }

        await ensureContactBrandLink(contactId, brand_id);

        showToast("success", "Contact already existed. Brand access updated.");
      } else {
        // Create new contact
        const created = await supabase
          .from("contacts")
          .insert({
            email,
            full_name: full_name || null,
            company: company || null,
            country: country || null,
          })
          .select("id")
          .single();

        if (created.error) throw created.error;
        contactId = created.data.id;

        await ensureContactBrandLink(contactId, brand_id);

        showToast("success", "Contact created.");
      }

      await loadContacts();
      resetForm();
      setModalOpen(false);
    } catch (err: any) {
      showToast("error", err?.message || "Failed to create contact.");
    } finally {
      setSaving(false);
    }
  };

  // Phase 4.3: CSV parse (headers A)
  const parseCsvText = (text: string) => {
    setCsvParseError(null);

    const lines = text
      .replace(/\uFEFF/g, "") // BOM
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      setCsvParseError("CSV has no data rows.");
      setCsvRows([]);
      return;
    }

    const header = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
    const idxEmail = header.indexOf("email");
    const idxName = header.indexOf("full_name");
    const idxCompany = header.indexOf("company");
    const idxCountry = header.indexOf("country");

    if (idxEmail === -1) {
      setCsvParseError("Missing required column: email");
      setCsvRows([]);
      return;
    }

    const seen = new Set<string>();
    const rows: CsvRow[] = [];

    let invalid = 0;
    let total = 0;
    let dup = 0;

    for (let i = 1; i < lines.length; i++) {
      total++;
      const cols = parseCsvLine(lines[i]);

      const rawEmail = (cols[idxEmail] || "").trim().toLowerCase();
      if (!rawEmail || !rawEmail.includes("@")) {
        invalid++;
        continue;
      }

      if (seen.has(rawEmail)) {
        dup++;
        continue;
      }

      seen.add(rawEmail);

      const full_name = idxName >= 0 ? (cols[idxName] || "").trim() : "";
      const company = idxCompany >= 0 ? (cols[idxCompany] || "").trim() : "";
      const country = idxCountry >= 0 ? (cols[idxCountry] || "").trim() : "";

      rows.push({
        email: rawEmail,
        full_name: full_name ? full_name : null,
        company: company ? company : null,
        country: country ? country : null,
      });
    }

    setCsvRows(rows);
    setImportStats((s) => ({
      ...s,
      total,
      unique: rows.length,
      invalid,
      skippedDuplicates: dup,
      suppressed: 0,
      created: 0,
      updated: 0,
      linked: 0,
    }));

    if (rows.length === 0) {
      setCsvParseError("No valid rows found after parsing.");
    }
  };

  const handleCsvFile = async (file: File) => {
    setCsvFileName(file.name);
    setCsvRows([]);
    setCsvParseError(null);
    setImportProgress(0);

    try {
      const text = await file.text();
      parseCsvText(text);
    } catch {
      setCsvParseError("Failed to read CSV file.");
    }
  };

  // Phase 4.3: Import engine (suppression + dedup + update-missing + link)
  const runCsvImport = async () => {
    if (importing) return;

    if (!formBrandId) {
      showToast("error", "Please select a brand before importing.");
      return;
    }

    if (csvRows.length === 0) {
      showToast("error", "No parsed CSV rows to import.");
      return;
    }

    setImporting(true);
    setImportProgress(0);
    showToast("info", "Import started…");

    const emails = csvRows.map((r) => r.email);
    const emailChunks: string[][] = chunk(emails, 200);

    // 1) load suppression list for these emails
    const suppressedSet = new Set<string>();
    try {
      for (let i = 0; i < emailChunks.length; i++) {
        const { data, error } = await supabase
          .from("suppression_list")
          .select("email")
          .in("email", emailChunks[i]);

        if (error) throw error;

        (data as any[] | null)?.forEach((r) => {
          if (r?.email) suppressedSet.add(String(r.email).toLowerCase());
        });
      }
    } catch (err: any) {
      setImporting(false);
      showToast("error", err?.message || "Failed to check suppression list.");
      return;
    }

    const importable = csvRows.filter((r) => !suppressedSet.has(r.email));

    setImportStats((s) => ({
      ...s,
      suppressed: csvRows.length - importable.length,
    }));

    if (importable.length === 0) {
      setImporting(false);
      showToast("error", "All rows are suppressed. Nothing to import.");
      return;
    }

    // 2) fetch existing contacts for importable emails
    const existingMap = new Map<
      string,
      { id: string; full_name: string | null; company: string | null; country: string | null }
    >();

    const importableEmails = importable.map((r) => r.email);
    const importableChunks: string[][] = chunk(importableEmails, 200);

    try {
      for (let i = 0; i < importableChunks.length; i++) {
        const { data, error } = await supabase
          .from("contacts")
          .select("id,email,full_name,company,country")
          .in("email", importableChunks[i]);

        if (error) throw error;

        (data as any[] | null)?.forEach((c) => {
          const em = String(c.email || "").toLowerCase();
          if (!em) return;
          existingMap.set(em, {
            id: c.id,
            full_name: c.full_name ?? null,
            company: c.company ?? null,
            country: c.country ?? null,
          });
        });
      }
    } catch (err: any) {
      setImporting(false);
      showToast("error", err?.message || "Failed to load existing contacts.");
      return;
    }

    // 3) process rows
    let created = 0;
    let updated = 0;
    let linked = 0;

    try {
      for (let i = 0; i < importable.length; i++) {
        const row = importable[i];
        const existing = existingMap.get(row.email);

        let contactId: string;

        if (existing?.id) {
          contactId = existing.id;

          // update missing fields only
          const patch: Record<string, any> = {};
          if (row.full_name && (!existing.full_name || existing.full_name.trim() === "")) {
            patch.full_name = row.full_name;
          }
          if (row.company && (!existing.company || existing.company.trim() === "")) {
            patch.company = row.company;
          }
          if (row.country && (!existing.country || existing.country.trim() === "")) {
            patch.country = row.country;
          }

          if (Object.keys(patch).length > 0) {
            const up = await supabase.from("contacts").update(patch).eq("id", contactId);
            if (up.error) throw up.error;
            updated++;
          }

          // brand link
          await ensureContactBrandLink(contactId, formBrandId);
          linked++;
        } else {
          // create contact
          const createdRow = await supabase
            .from("contacts")
            .insert({
              email: row.email,
              full_name: row.full_name || null,
              company: row.company || null,
              country: row.country || null,
            })
            .select("id")
            .single();

          if (createdRow.error) throw createdRow.error;

          contactId = createdRow.data.id;
          created++;

          // brand link
          await ensureContactBrandLink(contactId, formBrandId);
          linked++;
        }

        const pct = Math.round(((i + 1) / importable.length) * 100);
        setImportProgress(pct);

        // keep stats in sync
        if ((i + 1) % 10 === 0 || i === importable.length - 1) {
          setImportStats((s) => ({
            ...s,
            created,
            updated,
            linked,
          }));
        }
      }
    } catch (err: any) {
      setImporting(false);
      showToast("error", err?.message || "Import failed during processing.");
      return;
    }

    setImporting(false);
    showToast("success", "CSV import complete.");
    setImportStats((s) => ({ ...s, created, updated, linked }));

    // refresh + close
    await loadContacts();
    setImportOpen(false);
  };

  return (
    <div className="page">
      <style>{`
        :root { color-scheme: dark; }

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
          gap: 12px;
        }

        .title{
          margin:0;
          font-size:18px;
          font-weight:900;
        }

        .meta{
          font-size:13px;
          color:rgba(255,255,255,0.65);
          display:flex;
          align-items:center;
          gap: 12px;
          white-space: nowrap;
        }

        .btn{
          border: 0;
          border-radius: 12px;
          padding: 10px 12px;
          font-weight: 800;
          letter-spacing: 0.2px;
          color: white;
          cursor:pointer;
          background: linear-gradient(135deg, rgba(59,130,246,1), rgba(168,85,247,1));
          box-shadow: 0 16px 40px rgba(59,130,246,0.20);
          transition: transform 160ms ease, filter 160ms ease, box-shadow 160ms ease;
        }
        .btn:hover{
          filter: brightness(1.06);
          transform: translateY(-1px);
          box-shadow: 0 22px 48px rgba(168,85,247,0.20);
        }
        .btn:active{
          transform: translateY(0px);
          filter: brightness(0.98);
        }
        .btn:disabled{
          opacity: 0.65;
          cursor:not-allowed;
          transform:none;
          filter:none;
          box-shadow:none;
        }

        .ghost{
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.86);
          border-radius: 12px;
          padding: 10px 12px;
          cursor:pointer;
          font-weight: 800;
          letter-spacing: 0.2px;
          transition: transform 160ms ease, background 160ms ease, border-color 160ms ease;
        }
        .ghost:hover{
          background: rgba(255,255,255,0.10);
          border-color: rgba(255,255,255,0.18);
          transform: translateY(-1px);
        }
        .ghost:active{ transform: translateY(0px); }
        .ghost:disabled{
          opacity: 0.65;
          cursor:not-allowed;
          transform:none;
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

        /* Modal */
        .overlay{
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.58);
          backdrop-filter: blur(10px);
          display:flex;
          align-items:center;
          justify-content:center;
          padding: 18px;
          z-index: 60;
          animation: fadeIn 160ms ease;
        }

        .modal{
          width: 100%;
          max-width: 520px;
          border-radius: 18px;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.12);
          box-shadow: 0 30px 100px rgba(0,0,0,0.70);
          overflow:hidden;
          transform: translateY(12px) scale(0.98);
          opacity: 0;
          animation: popIn 220ms cubic-bezier(.2,.9,.2,1) forwards;
          position: relative;
        }

        .modalWide{
          max-width: 860px;
        }

        .modalShine{
          position:absolute;
          inset:-50%;
          background: conic-gradient(from 180deg, transparent, rgba(255,255,255,0.10), transparent);
          filter: blur(22px);
          animation: spin 10s linear infinite;
          opacity: 0.38;
          pointer-events:none;
        }

        .modalHead{
          padding: 18px 18px 10px 18px;
          display:flex;
          align-items:flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .modalTitle{
          margin: 0;
          font-size: 16px;
          font-weight: 900;
          letter-spacing: 0.2px;
        }

        .modalSub{
          margin: 6px 0 0 0;
          font-size: 12px;
          color: rgba(255,255,255,0.65);
          line-height: 1.6;
        }

        .xBtn{
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.86);
          height: 36px;
          width: 40px;
          border-radius: 12px;
          cursor:pointer;
          transition: transform 160ms ease, background 160ms ease, border-color 160ms ease;
        }
        .xBtn:hover{
          background: rgba(255,255,255,0.10);
          border-color: rgba(255,255,255,0.18);
          transform: translateY(-1px);
        }
        .xBtn:active{ transform: translateY(0px); }

        .modalBody{
          padding: 12px 18px 18px 18px;
        }

        .grid{
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .field{
          display:flex;
          flex-direction:column;
          gap: 8px;
        }

        .label{
          font-size: 12px;
          color: rgba(255,255,255,0.72);
          letter-spacing: 0.2px;
        }

        .input, .select{
          width: 100%;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(0,0,0,0.40);
          color: white;
          padding: 11px 12px;
          outline:none;
          transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
        }

        .input:focus, .select:focus{
          border-color: rgba(59,130,246,0.55);
          box-shadow: 0 0 0 4px rgba(59,130,246,0.18);
          transform: translateY(-1px);
        }

        .footer{
          display:flex;
          justify-content:flex-end;
          gap: 10px;
          margin-top: 14px;
          flex-wrap: wrap;
        }

        /* Import modal specifics (no changes outside modal) */
        .hintBox{
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(0,0,0,0.28);
          padding: 12px 12px;
          color: rgba(255,255,255,0.72);
          font-size: 12px;
          line-height: 1.6;
        }

        .progressWrap{
          margin-top: 12px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(0,0,0,0.28);
          overflow:hidden;
          height: 10px;
        }

        .progressBar{
          height: 100%;
          width: 0%;
          background: linear-gradient(90deg, rgba(59,130,246,1), rgba(168,85,247,1));
          transition: width 260ms cubic-bezier(.2,.9,.2,1);
        }

        .miniTable{
          margin-top: 12px;
          border-radius: 14px;
          overflow:hidden;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(0,0,0,0.28);
        }
        .miniTable table{
          width: 100%;
          border-collapse: collapse;
        }
        .miniTable th, .miniTable td{
          padding: 10px 10px;
          font-size: 12px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .miniTable th{
          color: rgba(255,255,255,0.65);
          background: rgba(255,255,255,0.04);
          font-weight: 800;
        }
        .miniTable tr:last-child td{ border-bottom: 0; }

        /* Toast */
        .toast{
          position: fixed;
          right: 16px;
          top: 16px;
          width: min(420px, calc(100vw - 32px));
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(10,10,10,0.72);
          backdrop-filter: blur(14px);
          box-shadow: 0 20px 70px rgba(0,0,0,0.55);
          overflow:hidden;
          transform: translateY(-10px);
          opacity: 0;
          pointer-events:none;
          z-index: 80;
        }
        .toastOpen{
          animation: toastIn 260ms cubic-bezier(.2,.9,.2,1) forwards;
          pointer-events:auto;
        }
        .toastClose{
          animation: toastOut 220ms ease forwards;
          pointer-events:none;
        }
        .toastBar{
          height: 3px;
          background: var(--toastAccent);
        }
        .toastBody{
          display:flex;
          gap: 10px;
          padding: 12px;
          align-items:flex-start;
        }
        .toastDot{
          margin-top: 3px;
          height: 10px;
          width: 10px;
          border-radius: 999px;
          background: var(--toastAccent);
          box-shadow: 0 0 0 4px color-mix(in srgb, var(--toastAccent) 25%, transparent);
          flex: 0 0 auto;
        }
        .toastText{
          font-size: 13px;
          color: rgba(255,255,255,0.88);
          line-height: 1.45;
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

        @keyframes fadeIn{
          from{ opacity: 0; }
          to{ opacity: 1; }
        }

        @keyframes popIn{
          from{ transform: translateY(12px) scale(0.98); opacity: 0; }
          to{ transform: translateY(0px) scale(1); opacity: 1; }
        }

        @keyframes toastIn{
          from{ transform: translateY(-10px); opacity: 0; }
          to{ transform: translateY(0px); opacity: 1; }
        }

        @keyframes toastOut{
          from{ transform: translateY(0px); opacity: 1; }
          to{ transform: translateY(-10px); opacity: 0; }
        }

        @media (max-width: 820px){
          .grid{ grid-template-columns: 1fr; }
        }

        @media (prefers-reduced-motion: reduce){
          .shine, .modalShine, .skeleton::after { animation: none !important; }
          .card{ animation: none !important; }
        }
      `}</style>

      <Toast open={toastOpen} kind={toastKind} message={toastMsg} />

      <div className="wrap">
        <div className="card">
          <div className="shine" />

          <div className="header">
            <h1 className="title">Contacts</h1>

            <div className="meta">
              <span>{loading ? "Loading…" : `${contacts.length} total`}</span>

              {/* Phase 4.3 button (added) */}
              <button className="ghost" onClick={openImportModal} disabled={brandsLoading}>
                Import CSV
              </button>

              <button className="btn" onClick={openModal}>
                + Add Contact
              </button>
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
              No contacts found. Use <strong>+ Add Contact</strong> to create your first entry.
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
                    <td>{new Date(c.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Phase 4.3: Import CSV modal (added) */}
      {importOpen && (
        <div className="overlay" onMouseDown={closeImportModal}>
          <div
            className="modal modalWide"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="modalShine" />

            <div className="modalHead">
              <div>
                <h2 className="modalTitle">Import CSV</h2>
                <p className="modalSub">
                  CSV headers required: <strong>email</strong> (optional: full_name, company, country). Dedup + suppression enforced.
                </p>
              </div>

              <button className="xBtn" onClick={closeImportModal} aria-label="Close">
                ✕
              </button>
            </div>

            <div className="modalBody">
              <div className="grid">
                <div className="field">
                  <div className="label">Brand</div>
                  <select
                    className="select"
                    value={formBrandId}
                    onChange={(e) => setFormBrandId(e.target.value)}
                    disabled={brandsLoading || importing}
                    required
                  >
                    {brandsLoading && <option value="">Loading brands…</option>}
                    {!brandsLoading &&
                      brands.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    {!brandsLoading && brands.length === 0 && (
                      <option value="">No brands found</option>
                    )}
                  </select>
                </div>

                <div className="field">
                  <div className="label">CSV File</div>
                  <input
                    className="input"
                    type="file"
                    accept=".csv,text/csv"
                    disabled={importing}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      handleCsvFile(file);
                    }}
                  />
                </div>

                <div className="field" style={{ gridColumn: "1 / -1" }}>
                  <div className="hintBox">
                    <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.86)" }}>
                      Expected columns (Header A)
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <code style={{ color: "rgba(255,255,255,0.78)" }}>
                        email,full_name,company,country
                      </code>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      Rules: dedup inside CSV, suppression enforced, existing contacts only get{" "}
                      <strong>missing fields</strong> filled, then brand link is ensured.
                    </div>
                    {csvFileName && (
                      <div style={{ marginTop: 10, color: "rgba(255,255,255,0.72)" }}>
                        Selected: <strong>{csvFileName}</strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {csvParseError && (
                <div className="error" style={{ marginTop: 12 }}>
                  {csvParseError}
                </div>
              )}

              {csvRows.length > 0 && (
                <>
                  <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <div className="hintBox" style={{ flex: "1 1 220px" }}>
                      <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.86)" }}>Parsed</div>
                      <div style={{ marginTop: 6 }}>
                        Total lines: <strong>{importStats.total}</strong>
                      </div>
                      <div>
                        Valid unique: <strong>{importStats.unique}</strong>
                      </div>
                      <div>
                        Invalid: <strong>{importStats.invalid}</strong>
                      </div>
                      <div>
                        Duplicates skipped: <strong>{importStats.skippedDuplicates}</strong>
                      </div>
                    </div>

                    <div className="hintBox" style={{ flex: "1 1 220px" }}>
                      <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.86)" }}>Import Results</div>
                      <div style={{ marginTop: 6 }}>
                        Suppressed skipped: <strong>{importStats.suppressed}</strong>
                      </div>
                      <div>
                        Created: <strong>{importStats.created}</strong>
                      </div>
                      <div>
                        Updated (missing fields): <strong>{importStats.updated}</strong>
                      </div>
                      <div>
                        Brand links ensured: <strong>{importStats.linked}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="progressWrap" aria-label="Import progress">
                    <div className="progressBar" style={{ width: `${importProgress}%` }} />
                  </div>

                  <div style={{ marginTop: 8, fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
                    {importing ? `Importing… ${importProgress}%` : "Preview below (first 20 rows)."}
                  </div>

                  <div className="miniTable">
                    <table>
                      <thead>
                        <tr>
                          <th style={{ width: "34%" }}>Email</th>
                          <th style={{ width: "22%" }}>Full Name</th>
                          <th style={{ width: "22%" }}>Company</th>
                          <th style={{ width: "22%" }}>Country</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvRows.slice(0, 20).map((r, idx) => (
                          <tr key={`${r.email}-${idx}`}>
                            <td className="email">{r.email}</td>
                            <td>{r.full_name || "—"}</td>
                            <td>{r.company || "—"}</td>
                            <td>{r.country || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              <div className="footer">
                <button
                  type="button"
                  className="ghost"
                  onClick={closeImportModal}
                  disabled={importing}
                >
                  Close
                </button>

                <button
                  className="btn"
                  type="button"
                  disabled={importing || brandsLoading || !formBrandId || csvRows.length === 0}
                  onClick={runCsvImport}
                >
                  {importing ? "Importing…" : "Run Import"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="overlay" onMouseDown={closeModal}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modalShine" />

            <div className="modalHead">
              <div>
                <h2 className="modalTitle">Add Contact</h2>
                <p className="modalSub">
                  Creates or updates a contact, then links it to a brand (contact_brands).
                </p>
              </div>

              <button className="xBtn" onClick={closeModal} aria-label="Close">
                ✕
              </button>
            </div>

            <div className="modalBody">
              <form onSubmit={handleCreateContact}>
                <div className="grid">
                  <div className="field" style={{ gridColumn: "1 / -1" }}>
                    <div className="label">Brand</div>
                    <select
                      className="select"
                      value={formBrandId}
                      onChange={(e) => setFormBrandId(e.target.value)}
                      disabled={brandsLoading || saving}
                      required
                    >
                      {brandsLoading && <option value="">Loading brands…</option>}
                      {!brandsLoading &&
                        brands.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      {!brandsLoading && brands.length === 0 && (
                        <option value="">No brands found</option>
                      )}
                    </select>
                  </div>

                  <div className="field" style={{ gridColumn: "1 / -1" }}>
                    <div className="label">Email (required)</div>
                    <input
                      className="input"
                      type="email"
                      autoComplete="email"
                      placeholder="contact@company.com"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      disabled={saving}
                      required
                    />
                  </div>

                  <div className="field">
                    <div className="label">Full Name</div>
                    <input
                      className="input"
                      type="text"
                      placeholder="Full name"
                      value={formFullName}
                      onChange={(e) => setFormFullName(e.target.value)}
                      disabled={saving}
                    />
                  </div>

                  <div className="field">
                    <div className="label">Company</div>
                    <input
                      className="input"
                      type="text"
                      placeholder="Company"
                      value={formCompany}
                      onChange={(e) => setFormCompany(e.target.value)}
                      disabled={saving}
                    />
                  </div>

                  <div className="field" style={{ gridColumn: "1 / -1" }}>
                    <div className="label">Country</div>
                    <input
                      className="input"
                      type="text"
                      placeholder="Country"
                      value={formCountry}
                      onChange={(e) => setFormCountry(e.target.value)}
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="footer">
                  <button
                    type="button"
                    className="ghost"
                    onClick={closeModal}
                    disabled={saving}
                  >
                    Cancel
                  </button>

                  <button
                    className="btn"
                    type="submit"
                    disabled={saving || brandsLoading || !formBrandId}
                  >
                    {saving ? "Saving…" : "Create Contact"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}