import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LogoMark } from "@/components/brand/LogoMark";
import { divisions, findDivision } from "@/lib/divisions";

export function generateStaticParams() {
  return divisions.map((division) => ({ slug: division.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const division = findDivision(slug);
  if (!division) return { title: "هانس کمپانی" };
  return { title: division.label };
}

export default function WorldPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<main className="min-h-dvh bg-paper" />}>
      <WorldContent params={params} />
    </Suspense>
  );
}

async function WorldContent({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const division = findDivision(slug);
  if (!division) notFound();

  return (
    <main className="world-enter mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6 py-16 md:px-8">
      <Link href="/" aria-label="بازگشت به هانس کمپانی" className="w-fit">
        <LogoMark />
      </Link>
      <p className="mt-16 text-[0.8125rem] tracking-[0.16em] text-crimson">
        {division.index}
      </p>
      <h1 className="mt-3 font-display text-5xl leading-none text-ink">{division.label}</h1>
      <p className="mt-6 max-w-md text-base leading-8 text-ash">
        این فضا هنوز باز نشده. از شبکهٔ اصلی برگردید.
      </p>
      <Link
        href="/"
        className="mt-10 inline-flex min-h-11 w-fit items-center border-b border-ink text-base text-ink transition-colors duration-200 hover:border-crimson hover:text-crimson"
      >
        بازگشت به شبکه
      </Link>
    </main>
  );
}
