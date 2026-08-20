import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FS Service Center",
  description: "Manajemen servis perangkat, pelanggan, pembayaran, laporan, dan QR dalam satu aplikasi."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="id" className={inter.variable}><body>{children}</body></html>;
}
