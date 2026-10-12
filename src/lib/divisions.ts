export const divisions = [
  {
    slug: "agency",
    label: "آژانس تبلیغاتی",
    index: "۰۱",
    x: -0.42,
    y: 0.92,
    z: 0.12,
    ox: 4,
    oy: -46,
  },
  {
    slug: "pixel",
    label: "پیکسل",
    index: "۰۲",
    x: 1.28,
    y: 0.42,
    z: 0.06,
    ox: 42,
    oy: -16,
  },
  {
    slug: "media",
    label: "مدیا",
    index: "۰۳",
    x: 0.18,
    y: 0.04,
    z: 0.28,
    ox: 40,
    oy: 20,
  },
  {
    slug: "academy",
    label: "آکادمی",
    index: "۰۴",
    x: -1.42,
    y: -0.28,
    z: 0,
    ox: -50,
    oy: -8,
  },
  {
    slug: "supplies",
    label: "ملزومات",
    index: "۰۵",
    x: 0.72,
    y: -0.92,
    z: 0.05,
    ox: 38,
    oy: 24,
  },
] as const;

export type Division = (typeof divisions)[number];
export type DivisionSlug = Division["slug"];

export function findDivision(slug: string) {
  return divisions.find((division) => division.slug === slug);
}
