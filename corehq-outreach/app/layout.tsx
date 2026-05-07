import type { ReactNode } from "react";

export const metadata = {
  title: "CoreHQ – Outreach",
  description: "Internal Multi-Brand Outreach CRM",

  manifest: "/manifest.webmanifest",

  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },

  themeColor: "#0B0B0B",
};

export const viewport = {
  themeColor: "#0B0B0B",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, Arial, sans-serif",
          background: "#0B0B0B",
        }}
      >
        {children}
      </body>
    </html>
  );
}