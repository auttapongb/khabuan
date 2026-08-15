import type { Metadata, Viewport } from "next";
import { Nunito, Anuphan } from "next/font/google";
import { PwaRegister } from "@/components/PwaRegister";
import { AppToaster } from "@/components/AppToaster";
import { LocaleProvider } from "@/lib/i18n/locale";
import "@/styles/tokens.css";

const display = Nunito({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  variable: "--font-display",
  display: "swap",
});

const body = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const thai = Anuphan({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
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
    statusBarStyle: "default",
    title: "นำขบวน",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
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
