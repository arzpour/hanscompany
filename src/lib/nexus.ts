import type { DivisionSlug } from "@/lib/divisions";

export const nexusCopy: Record<DivisionSlug, { latin: string; desc: string }> = {
  agency: {
    latin: "AGENCY",
    desc: "برند را از ایده تا اجرا به چشم می‌آوریم",
  },
  pixel: {
    latin: "PIXEL",
    desc: "استودیوی طراحی، موشن و تجربه‌های دیجیتال",
  },
  media: {
    latin: "MEDIA",
    desc: "روایت، خبر و ویدیو؛ جایی که محتوا زنده می‌شود",
  },
  academy: {
    latin: "ACADEMY",
    desc: "مهارت‌های خلاق را از صفر تا حرفه‌ای بیاموز",
  },
  supplies: {
    latin: "SUPPLIES",
    desc: "هر چه برای اجرا لازم است، آماده و به‌موقع",
  },
};

export function toFa(value: number) {
  return String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
}
