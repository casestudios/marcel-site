import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Marcel | AI-Powered CNC Diagnostics",
  description:
    "AI-powered CNC diagnostics for FANUC machines. When an alarm fires, Marcel gives your team the answer — cited, prioritized, and instant.",
  openGraph: {
    title: "Marcel | AI-Powered CNC Diagnostics",
    description:
      "AI-powered CNC diagnostics for FANUC machines. Instant alarm diagnosis from 3,600+ manual pages.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-bg text-text-primary antialiased">{children}</body>
    </html>
  );
}
