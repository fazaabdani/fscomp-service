import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FS Service Center",
  description: "Manajemen servis perangkat, pelanggan, pembayaran, laporan, dan QR dalam satu aplikasi."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="id"><body>{children}</body></html>;
}
