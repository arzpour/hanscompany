export const slogan = "برند شما را به‌یادماندنی می‌کنیم";

export const support = "ایده‌پردازی، برندینگ، عکاسی، فیلم‌برداری و تولید محتوا";

export const comingSoon = "به‌زودی این بخش در دسترس شما قرار می‌گیرد";

export const categories = [
  // { id: "ideation", label: "ایده‌پردازی" },
  // { id: "branding", label: "برندینگ" },
  // { id: "photo", label: "عکاسی" },
  // { id: "film", label: "فیلم‌برداری" },
  // { id: "content", label: "تولید محتوا" },
  // { id: "social", label: "شبکه‌های اجتماعی" },
  { id: "hans", label: "هانس" },
  { id: "agency", label: "آژانس تبلیغاتی" },
  { id: "media", label: "مدیا" },
  { id: "academy", label: "آکادمی" },
  { id: "supplies", label: "ملزومات" },
  { id: "pixel", label: "پیکسل" },
  { id: "blog", label: "وبلاگ" },
] as const;

export type CategoryId = (typeof categories)[number]["id"];

export const contacts = {
  instagram: "https://instagram.com/hanscompany.ir",
  whatsapp: "https://wa.me/989301815458",
  phone: "tel:+989301815458",
} as const;

export function isCategoryId(value: string): value is CategoryId {
  return categories.some((item) => item.id === value);
}

export function toPersianDigits(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)] ?? digit);
}
