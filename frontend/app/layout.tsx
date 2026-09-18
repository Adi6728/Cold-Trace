import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ColdChain Trace",
  description: "Cold-chain traceability login and dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
