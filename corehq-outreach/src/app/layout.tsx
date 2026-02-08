import type { ReactNode } from "react";

export const metadata = {
  title: "CoreHQ – Outreach",
  description: "Internal Multi-Brand Outreach CRM"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
