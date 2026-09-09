import type { Metadata, Viewport } from "next";
import { Archivo, Space_Mono } from "next/font/google";
import "./globals.css";
import { SITE as siteConfig } from "@/lib/site";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "700"],
});

const SITE = siteConfig.url;
const TITLE = "Marcel | CNC service records and machine insights";
const DESCRIPTION =
  "Machine observations, manual references and service history for the CNC shop. Explore Marcel's prototypes and help shape the first shop trials.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "Marcel",
  keywords: [
    "CNC",
    "FANUC",
    "alarm diagnosis",
    "machine downtime",
    "service records",
    "shift handoff",
    "maintenance",
    "machine tool",
    "CNC diagnostics",
  ],
  alternates: { canonical: SITE },
  openGraph: {
    type: "website",
    url: SITE,
    siteName: "Marcel",
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Marcel | CNC service records and machine insights",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og.png"],
  },
  robots: { index: true, follow: true },
  // Favicons are provided via Next file conventions: src/app/icon.svg + apple-icon.png
};

export const viewport: Viewport = {
  themeColor: "#0A0B0D",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${archivo.variable} ${spaceMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
