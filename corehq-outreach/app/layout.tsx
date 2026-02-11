import type { ReactNode } from "react";

export const metadata = {
  title: "CoreHQ – Outreach",
  description: "Internal Multi-Brand Outreach CRM",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, Arial, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
