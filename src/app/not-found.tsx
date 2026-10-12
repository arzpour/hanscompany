import Link from "next/link";
import { LogoMark } from "@/components/brand/LogoMark";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6 py-16">
      <LogoMark />
      <h1 className="mt-16 font-display text-5xl text-ink">این‌جا نیست</h1>
      <p className="mt-4 text-base leading-8 text-ash">این مسیر به فضایی از هانس وصل نیست.</p>
      <Link
        href="/"
        className="mt-10 inline-flex min-h-11 w-fit items-center border-b border-ink text-base transition-colors duration-200 hover:border-crimson hover:text-crimson"
      >
        بازگشت به شبکه
      </Link>
    </main>
  );
}
