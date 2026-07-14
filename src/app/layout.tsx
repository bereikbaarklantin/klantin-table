import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { ErrorBoundary, OfflineBanner } from "@/components/ErrorBoundary";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hapas Noordwijk",
  description: "Welkom bij Hapas Noordwijk — bestel direct vanaf uw tafel.",
  icons: { icon: "/favicon.ico" },
  themeColor: "#1A1A1A",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#1A1A1A",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl" className={`${inter.variable} ${playfair.variable}`}>
      <body className="font-body"><ErrorBoundary><OfflineBanner />{children}</ErrorBoundary></body>
    </html>
  );
}
