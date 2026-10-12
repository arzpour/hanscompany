import type { Metadata } from "next";
import { Amiri, Cormorant_Garamond, Vazirmatn } from "next/font/google";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import "./globals.css";

const vazir = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazir",
  display: "swap",
});

const amiri = Amiri({
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
  variable: "--font-amiri",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-cormorant",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "هانس کمپانی",
    template: "%s — هانس کمپانی",
  },
  description:
    "هانس کمپانی شبکه‌ای از فضاهای مستقل است: آژانس تبلیغاتی، پیکسل، مدیا، آکادمی و ملزومات.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fa"
      dir="rtl"
      className={`${vazir.variable} ${amiri.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-paper font-sans text-ink">
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
