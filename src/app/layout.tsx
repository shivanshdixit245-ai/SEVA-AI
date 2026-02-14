import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import LayoutShell from "@/components/LayoutShell";
import VantaBackground from "@/components/ui/vanta-background";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SevaAI - Instant Home Service Booking",
  description: "AI-powered instant home service booking system. Book cleaners, plumbers, and more in seconds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${outfit.variable} antialiased bg-slate-50 text-slate-900 relative`}
      >
        <VantaBackground />
        <LayoutShell>
          {children}
        </LayoutShell>
      </body>
    </html>
  );
}
