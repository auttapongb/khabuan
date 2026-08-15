import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, IBM_Plex_Sans_Thai, Outfit } from "next/font/google";
import { PwaRegister } from "@/components/PwaRegister";
import { AppToaster } from "@/components/AppToaster";
import { LocaleProvider } from "@/lib/i18n/locale";
import "@/styles/tokens.css";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const body = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

const thai = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-thai",
  display: "swap",
});

export const metadata: Metadata = {
  title: "นำขบวน",
  description: "ถึงพร้อมกัน ไม่ต้องถามถึงไหนแล้ว — เปิดในไลน์ได้เลย ไม่โหลดแอป",
  applicationName: "นำขบวน",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "นำขบวน",
  },
  icons: {
    icon: [{ url: "/icons/icon-192.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/icon-192.svg" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0b0c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className={`${display.variable} ${body.variable} ${thai.variable}`}>
        <LocaleProvider>
          <PwaRegister />
          <AppToaster />
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
