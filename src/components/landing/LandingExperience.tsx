"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { divisions } from "@/lib/divisions";
import { nexusCopy } from "@/lib/nexus";
import { createNexusScene, type NexusBrand } from "./nexus-scene";
import "./nexus.css";

const brands: NexusBrand[] = divisions.map((division) => ({
  slug: division.slug,
  label: division.label,
  latin: nexusCopy[division.slug].latin,
  desc: nexusCopy[division.slug].desc,
}));

export function LandingExperience() {
  const router = useRouter();
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return createNexusScene(root, {
      brands,
      reduced,
      onEnter: (slug) => router.push(`/worlds/${slug}`),
    });
  }, [router]);

  return (
    <main ref={rootRef} className="nx" aria-label="هانس کمپانی">
      <div className="nx-bgglow" aria-hidden />
      <div className="nx-ghost" data-nx="ghost" aria-hidden>
        HANS
      </div>
      <canvas className="nx-canvas" data-nx="canvas" aria-hidden />
      <div className="nx-vig" aria-hidden />
      <div className="nx-grain" aria-hidden />
      <div className="nx-lb nx-lb-t" aria-hidden />
      <div className="nx-lb nx-lb-b" aria-hidden />

      <header className="nx-ui nx-top">
        {/* <div className="nx-links">
          <a href="#">درباره ما</a>
          <a href="#">تماس</a>
        </div> */}
        <p className="nx-focusline" data-nx="focusline" aria-live="polite" />
        <h1 className="nx-logo">
          <Image
            src="/logo.png"
            alt="هانس کمپانی"
            width={1527}
            height={310}
            priority
          />
        </h1>
      </header>

      {/* <div className="nx-ui nx-hud" aria-hidden>
        <i />
        LIVE · NODES <b data-nx="nodes">0</b> · SYNAPSES <b data-nx="synapses">0</b>
        <br />
        FOCUS · <b data-nx="focus">OVERVIEW</b>
      </div> */}

      {/* <nav className="nx-ui nx-idx" aria-label="بخش‌های هانس">
        {divisions.map((division, i) => (
          <Link
            key={division.slug}
            href={`/worlds/${division.slug}`}
            data-nx-link
          >
            <small>{toFa(i + 1)}</small>
            <b>{division.label}</b>
            <i aria-hidden>{nexusCopy[division.slug].latin}</i>
          </Link>
        ))}
      </nav> */}

      <section className="nx-ui nx-card" aria-label="بخش‌ها">
        {/* <div className="nx-pane" data-nx-pane>
          <small>COLLECTION — {toFa(divisions.length)} BRANDS</small>
          <h2 className="s">
            {toFa(divisions.length) === "۵" ? "پنج فضا،" : "چند فضا،"}
            <br />
            <em>یک شبکه‌ی زنده</em>
          </h2>
          <p>
            هانس کمپانی سفر، تصویر، رسانه، آموزش و ملزومات را به هم وصل می‌کند. روی هر نورون برو تا
            وارد بشی.
          </p>
        </div> */}
        {divisions.map((division, i) => (
          <div key={division.slug} className="nx-pane" data-nx-pane>
            {/* <small>
              {String(i + 1).padStart(2, "0")} — {nexusCopy[division.slug].latin}
            </small>
            <h2>{division.label}</h2>
            <p>{nexusCopy[division.slug].desc}</p>
            <button type="button" className="nx-go" data-nx-go={i}>
              ورود به بخش ←
            </button> */}
          </div>
        ))}
      </section>

      {/* <div className="nx-ui nx-prog">
        <div>
          <i data-nx="progress" />
        </div>
        <span>
          <a href="#" data-nx="replay">
            ↺ REPLAY
          </a>{" "}
          &nbsp;·&nbsp; <b data-nx="clock">00:00</b>
        </span>
      </div> */}

      <footer className="nx-ui nx-copy">
        © {new Date().getFullYear()} هانس کمپانی — همه حقوق محفوظ است
      </footer>

      <div aria-hidden>
        {brands.map((brand) => (
          <div key={brand.slug} className="nx-tag" data-nx-tag>
            {brand.latin}
          </div>
        ))}
      </div>

      <div className="nx-toast" data-nx="toast" role="status">
        <b />
        <span />
      </div>
      <div className="nx-cur" data-nx="cursor" aria-hidden />
      <div className="nx-ring" data-nx="ring" aria-hidden />
    </main>
  );
}
