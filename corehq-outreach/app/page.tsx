import Link from "next/link";

export default function Home() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          textAlign: "center",
          padding: 40,
          maxWidth: 600,
        }}
      >
        <h1 style={{ fontSize: 32, marginBottom: 16 }}>
          CoreHQ – Outreach
        </h1>

        <p style={{ opacity: 0.7, marginBottom: 32 }}>
          Internal Multi-Brand Email Campaign CRM
        </p>

        <Link
          href="/log-in"
          style={{
            display: "inline-block",
            padding: "12px 24px",
            borderRadius: 6,
            background: "#2563eb",
            color: "white",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Admin Log In
        </Link>
      </div>
    </div>
  );
}