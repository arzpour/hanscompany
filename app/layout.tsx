import type { Metadata, Viewport } from "next";
import { Syne, Vazirmatn } from "next/font/google";
import "./globals.css";

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
  display: "swap",
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
});

export const metadata: Metadata = {
  title: "هانس کمپانی | آژانس تبلیغاتی",
  description:
    "برند شما را به‌یادماندنی می‌کنیم. ایده‌پردازی، برندینگ، عکاسی، فیلم‌برداری و تولید محتوا.",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={`${vazirmatn.variable} ${syne.variable}`}>
      <body className={`${vazirmatn.className} overflow-x-hidden bg-background text-base leading-normal text-foreground antialiased`}>
        {children}
      </body>
    </html>
  );
}
