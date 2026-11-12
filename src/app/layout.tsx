import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Rekap Mutasi Kas", description: "Rekap mutasi semua rekening bisnis" };
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
