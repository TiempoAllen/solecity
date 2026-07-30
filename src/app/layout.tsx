import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "SOLECITY — Authentic Sneakers & Clogs · Cebu City",
    template: "%s · SOLECITY",
  },
  description:
    "SOLECITY is a Cebu City sneaker boutique. Authentic ANTA, Under Armour, basketball shoes and clogs — shipped nationwide since 2023.",
  keywords: ["SOLECITY", "sneakers", "ANTA", "Under Armour", "clogs", "Cebu", "basketball shoes"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
