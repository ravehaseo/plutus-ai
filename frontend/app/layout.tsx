import type { Metadata } from "next";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Plutus A.I — Dividend Advisor",
  description: "AI-powered dividend investment advisor for Bursa Malaysia",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-plutus-bg text-plutus-text-primary antialiased">
        <Sidebar />
        <Topbar />
        <main className="ml-56 mt-16 p-6">{children}</main>
      </body>
    </html>
  );
}
