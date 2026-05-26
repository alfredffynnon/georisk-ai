import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { Navigation } from "@/components/navigation";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GeoRisk AI",
  description:
    "GeoRisk AI translates geopolitical developments into structured business risk briefs for investors.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Navigation />
        {children}
      </body>
    </html>
  );
}
