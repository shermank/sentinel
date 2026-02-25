import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
};

export const metadata: Metadata = {
  title: "Eternal Sentinel - Digital Legacy Service",
  description:
    "Secure your digital legacy with Eternal Sentinel. A dead man's switch for your passwords, documents, and final messages.",
  keywords: ["digital legacy", "dead man's switch", "password vault", "estate planning"],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Eternal Sentinel",
  },
  openGraph: {
    type: "website",
    title: "Eternal Sentinel - Digital Legacy Service",
    description:
      "Secure your digital legacy with Eternal Sentinel. A dead man's switch for your passwords, documents, and final messages.",
    siteName: "Eternal Sentinel",
  },
  twitter: {
    card: "summary",
    title: "Eternal Sentinel - Digital Legacy Service",
    description:
      "Secure your digital legacy with Eternal Sentinel. A dead man's switch for your passwords, documents, and final messages.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
