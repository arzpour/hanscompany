"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  categories,
  comingSoon,
  contacts,
  isCategoryId,
  slogan,
  support,
  toPersianDigits,
  type CategoryId,
} from "@/lib/content";
import { InstagramIcon, PhoneIcon, WhatsAppIcon } from "./Icons";

type Layout = "home" | "side" | "top";
type FocusIntent = "panel" | "back" | null;
type Snapshot = { el: HTMLElement; rect: DOMRect };

const iconClass =
  "size-[22px] fill-none stroke-current stroke-[1.6] [stroke-linecap:round] [stroke-linejoin:round] transition-transform duration-300 ease-enter group-hover/icon:scale-110 group-active/icon:scale-110";

export function Studio() {
  const [active, setActive] = useState<CategoryId | null>(null);
  const [compact, setCompact] = useState(false);
  const prevRects = useRef<Snapshot[] | null>(null);
  const focusIntent = useRef<FocusIntent>(null);
  const lastFocus = useRef<CategoryId | null>(null);

  const layout: Layout = !active ? "home" : compact ? "top" : "side";
  const activeCat = categories.find((item) => item.id === active) ?? null;

  useLayoutEffect(() => {
    const query = window.matchMedia("(max-width: 680px)");
    const apply = () => setCompact(query.matches);
    apply();
    query.addEventListener("change", apply);
    const hashed = readHash();
    if (hashed) setActive(hashed);
    return () => query.removeEventListener("change", apply);
  }, []);

  useLayoutEffect(() => {
    const previous = prevRects.current;
    if (!previous?.length) return undefined;
    prevRects.current = null;

    previous.forEach(({ el }) => {
      el.style.transition = "none";
      el.style.transform = "";
    });

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return undefined;

    const moves = previous
      .map(({ el, rect }) => {
        const next = el.getBoundingClientRect();
        const width = Math.max(next.width, 1);
        const height = Math.max(next.height, 1);
        return {
          el,
          dx: rect.left - next.left,
          dy: rect.top - next.top,
          sx: rect.width / width,
          sy: rect.height / height,
        };
      })
      .filter(
        ({ dx, dy, sx, sy }) =>
          Math.hypot(dx, dy) >= 1 || Math.abs(sx - 1) > 0.04 || Math.abs(sy - 1) > 0.04,
      );

    moves.forEach(({ el, dx, dy, sx, sy }) => {
      el.style.transformOrigin = "center center";
      el.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
    });

    const frame = requestAnimationFrame(() => {
      moves.forEach(({ el }) => {
        el.style.transition = "transform 1400ms cubic-bezier(0.4, 0, 0.15, 1)";
        el.style.transform = "translate(0px, 0px) scale(1, 1)";
        const done = (event: TransitionEvent) => {
          if (event.propertyName !== "transform") return;
          el.style.transition = "";
          el.style.transform = "";
          el.style.transformOrigin = "";
          el.removeEventListener("transitionend", done);
        };
        el.addEventListener("transitionend", done);
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [layout]);

  useEffect(() => {
    const onPop = () => {
      capture(prevRects);
      setActive(readHash());
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (!active) {
      document.title = "هانس کمپانی | آژانس تبلیغاتی";
      if (focusIntent.current === "back" && lastFocus.current) {
        document.getElementById(`cat-${lastFocus.current}`)?.focus();
      }
    } else if (activeCat) {
      document.title = `${activeCat.label} | هانس کمپانی`;
      if (focusIntent.current === "panel") {
        document.getElementById("section-title")?.focus();
      }
    }
    focusIntent.current = null;
  }, [active, activeCat]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && active) closeSection();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  function select(id: CategoryId) {
    capture(prevRects);
    lastFocus.current = id;
    if (id === active) {
      focusIntent.current = "back";
      setActive(null);
      window.history.pushState(null, "", window.location.pathname);
      return;
    }
    focusIntent.current = "panel";
    setActive(id);
    window.history.pushState({ id }, "", `#${id}`);
  }

  function closeSection() {
    if (!active) return;
    capture(prevRects);
    lastFocus.current = active;
    focusIntent.current = "back";
    setActive(null);
    window.history.pushState(null, "", window.location.pathname);
  }

  return (
    <div data-layout={layout} className="group pointer-events-none absolute inset-0 z-[3]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-black/45 opacity-0 transition-opacity duration-300 ease-exit group-data-[layout=side]:opacity-100 group-data-[layout=side]:duration-[900ms] group-data-[layout=side]:ease-enter group-data-[layout=top]:opacity-100 group-data-[layout=top]:duration-[900ms] group-data-[layout=top]:ease-enter"
      />
      {/* <div className="pointer-events-none absolute inset-[max(16px,env(safe-area-inset-top))_max(16px,env(safe-area-inset-right))_max(16px,env(safe-area-inset-bottom))_max(16px,env(safe-area-inset-left))] z-[4]">
        <span className="absolute top-0 right-0 size-9 border-t-[1.5px] border-r-[1.5px] border-red" />
        <span className="absolute top-0 left-0 size-9 border-t-[1.5px] border-l-[1.5px] border-white/75" />
        <span className="absolute right-0 bottom-0 size-9 border-r-[1.5px] border-b-[1.5px] border-white/75" />
        <span className="absolute bottom-0 left-0 size-9 border-b-[1.5px] border-l-[1.5px] border-white/75" />
      </div> */}

      <div className="absolute inset-0 flex flex-col items-center justify-center px-[clamp(20px,4vw,48px)] pt-[max(72px,env(safe-area-inset-top))] pb-24">
        <div className="relative z-[1] w-[min(18em,100%)] text-center transition-[opacity,translate] duration-[520ms] ease-enter group-data-[layout=side]:pointer-events-none group-data-[layout=side]:-translate-y-3 group-data-[layout=side]:opacity-0 group-data-[layout=side]:duration-700 group-data-[layout=top]:pointer-events-none group-data-[layout=top]:-translate-y-3 group-data-[layout=top]:opacity-0 group-data-[layout=top]:duration-700">
          <p className="mb-5 flex items-center justify-center gap-2.5 text-sm tracking-[0.04em] text-[#ededed]">
            <span aria-hidden="true" className="h-0.5 w-7 bg-red" />
            آژانس تبلیغاتی هانس
          </p>
          {/* <h1 className="mx-auto max-w-[12em] text-balance text-[clamp(2.25rem,5vw,4.75rem)] text-xl leading-[1.2] font-extrabold"> */}
          <h1 className="mx-auto max-w-[12em] text-balance text-7xl leading-[1.2] font-extrabold">
            {slogan}
          </h1>
          <p className="mx-auto mt-5 max-w-[28em] text-balance text-base leading-[1.7] text-[#e4e4e4]">
            {support}
          </p>
        </div>

        <nav
          aria-label="دسته‌بندی خدمات"
          data-layout={layout}
          className="relative z-[2] data-[layout=home]:mt-8 data-[layout=home]:flex data-[layout=home]:w-[min(980px,100%)] data-[layout=home]:flex-row data-[layout=home]:flex-wrap data-[layout=home]:justify-center data-[layout=home]:gap-x-2 data-[layout=home]:gap-y-2.5 data-[layout=side]:absolute data-[layout=side]:top-[max(64px,env(safe-area-inset-top))] data-[layout=side]:right-[max(28px,env(safe-area-inset-right))] data-[layout=side]:bottom-[108px] data-[layout=side]:flex data-[layout=side]:w-max data-[layout=side]:max-w-[min(240px,42vw)] data-[layout=side]:flex-col data-[layout=side]:items-start data-[layout=side]:justify-center data-[layout=top]:absolute data-[layout=top]:top-[max(16px,env(safe-area-inset-top))] data-[layout=top]:right-4 data-[layout=top]:left-4 data-[layout=top]:grid data-[layout=top]:grid-cols-3 data-[layout=top]:justify-items-center data-[layout=top]:gap-2"
        >
          {categories.map((item) => (
            <button
              key={item.id}
              id={`cat-${item.id}`}
              type="button"
              data-flip
              aria-expanded={active === item.id}
              aria-controls="section-panel"
              onClick={() => select(item.id)}
              className="pointer-events-auto relative flex min-h-12 cursor-pointer items-center border-0 bg-transparent px-4 py-3 text-start text-foreground touch-manipulation transition-[color,background-color] duration-300 ease-enter hover:bg-red/15 active:bg-red/25 aria-expanded:bg-red/35 aria-expanded:text-white focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-white group-data-[layout=home]:justify-center group-data-[layout=home]:bg-transparent group-data-[layout=home]:hover:bg-transparent group-data-[layout=home]:hover:text-white group-data-[layout=home]:aria-expanded:bg-transparent group-data-[layout=home]:after:absolute group-data-[layout=home]:after:right-3 group-data-[layout=home]:after:bottom-1.5 group-data-[layout=home]:after:left-3 group-data-[layout=home]:after:h-0.5 group-data-[layout=home]:after:origin-center group-data-[layout=home]:after:scale-x-0 group-data-[layout=home]:after:bg-red group-data-[layout=home]:after:transition-transform group-data-[layout=home]:after:duration-300 group-data-[layout=home]:after:ease-enter group-data-[layout=home]:after:content-[''] group-data-[layout=home]:hover:after:scale-x-100 group-data-[layout=home]:aria-expanded:after:scale-x-100"
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div
          data-flip
          data-layout={layout}
          className="z-[4] flex gap-3 group-data-[layout=home]:relative group-data-[layout=home]:mt-6 group-data-[layout=home]:justify-center group-data-[layout=side]:absolute group-data-[layout=side]:bottom-[max(18px,env(safe-area-inset-bottom))] group-data-[layout=side]:left-[max(24px,env(safe-area-inset-left))] group-data-[layout=top]:absolute group-data-[layout=top]:bottom-[max(18px,env(safe-area-inset-bottom))] group-data-[layout=top]:left-5"
        >
          <a
            className="group/icon pointer-events-auto grid size-12 place-items-center bg-transparent text-foreground touch-manipulation transition-colors duration-300 ease-enter hover:text-red focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-white"
            href={contacts.instagram}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="اینستاگرام هانس"
          >
            <InstagramIcon className={iconClass} />
          </a>
          <a
            className="group/icon pointer-events-auto grid size-12 place-items-center bg-transparent text-foreground touch-manipulation transition-colors duration-300 ease-enter hover:text-red focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-white"
            href={contacts.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="واتساپ هانس"
          >
            <WhatsAppIcon className={iconClass} />
          </a>
          <a
            className="group/icon pointer-events-auto grid size-12 place-items-center bg-transparent text-foreground touch-manipulation transition-colors duration-300 ease-enter hover:text-red focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-white"
            href={contacts.phone}
            aria-label="تماس با هانس"
          >
            <PhoneIcon className={iconClass} />
          </a>
        </div>
      </div>

      <article
        id="section-panel"
        aria-live="polite"
        inert={!active}
        aria-hidden={active ? undefined : true}
        className="reveal-exit pointer-events-none invisible absolute top-[46%] left-1/2 z-[3] w-[min(520px,calc(100vw-320px))] -translate-x-1/2 -translate-y-[42%] opacity-0 group-data-[layout=side]:reveal-enter group-data-[layout=side]:pointer-events-auto group-data-[layout=side]:visible group-data-[layout=side]:top-1/2 group-data-[layout=side]:left-[calc(50%-120px)] group-data-[layout=side]:w-[min(480px,calc(100vw-300px))] group-data-[layout=side]:-translate-y-1/2 group-data-[layout=side]:opacity-100 group-data-[layout=top]:reveal-enter group-data-[layout=top]:pointer-events-auto group-data-[layout=top]:visible group-data-[layout=top]:inset-x-5 group-data-[layout=top]:top-auto group-data-[layout=top]:bottom-[108px] group-data-[layout=top]:left-auto group-data-[layout=top]:w-auto group-data-[layout=top]:translate-none! group-data-[layout=top]:opacity-100"
      >
        <div className="max-h-[min(520px,calc(100dvh-180px))] overflow-auto text-start group-data-[layout=side]:text-center group-data-[layout=top]:text-center">
          {/* <p className="mb-3 font-display text-[13px] tracking-[0.22em] text-red">
            {activeCat
              ? toPersianDigits(String(categories.findIndex((item) => item.id === activeCat.id) + 1).padStart(2, "0"))
              : ""}
          </p> */}
          <h2
            id="section-title"
            tabIndex={-1}
            className="mx-0 max-w-[8em] text-balance text-[clamp(2.4rem,5vw,4.5rem)] leading-[1.15] font-extrabold [text-shadow:0_2px_24px_rgba(0,0,0,0.85)] outline-none group-data-[layout=side]:mx-auto group-data-[layout=top]:mx-auto max-[899px]:text-[clamp(2rem,9vw,2.8rem)]"
          >
            {activeCat?.label}
            <span
              aria-hidden="true"
              className="mt-4 block h-0.5 w-12 bg-red group-data-[layout=side]:mx-auto group-data-[layout=top]:mx-auto"
            />
          </h2>
          <p
            key={active ?? "empty"}
            className="mt-5 max-w-[22em] text-balance text-xl leading-[1.7] text-[#f4f4f4] motion-safe:animate-rise group-data-[layout=side]:mx-auto group-data-[layout=top]:mx-auto"
          >
            {activeCat ? comingSoon : ""}
          </p>
          <button
            type="button"
            onClick={closeSection}
            className="pointer-events-auto mt-6 min-h-11 cursor-pointer border border-white/30 bg-transparent px-4.5 py-2.5 text-foreground transition-[background-color,border-color] duration-200 hover:border-red hover:bg-red/35 focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-white"
          >
            بازگشت
          </button>
        </div>
      </article>

      {active ? (
        <button
          type="button"
          onClick={closeSection}
          aria-label="بازگشت به صفحه اصلی"
          className="pointer-events-auto absolute right-[max(64px,env(safe-area-inset-right))] bottom-[max(28px,env(safe-area-inset-bottom))] z-[4] flex cursor-pointer items-center gap-2.5 border-0 bg-transparent p-2 text-start text-inherit focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-white"
        >
          <BrandMark />
        </button>
      ) : (
        <div className="absolute right-[max(64px,env(safe-area-inset-right))] bottom-[max(28px,env(safe-area-inset-bottom))] z-[4] flex items-center gap-2.5 p-2 text-start">
          <BrandMark />
        </div>
      )}
    </div>
  );
}

function BrandMark() {
  return (
    <>
      <span aria-hidden="true" className="grid size-9 place-items-center bg-red font-display text-lg font-bold text-white">
        H
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="font-display text-sm font-bold tracking-[0.22em] max-[899px]:tracking-[0.16em]">HANS</span>
        <span className="text-[13px] text-muted">هانس کمپانی</span>
      </span>
    </>
  );
}

function readHash() {
  const id = window.location.hash.slice(1);
  return isCategoryId(id) ? id : null;
}

function capture(store: { current: Snapshot[] | null }) {
  const nodes = document.querySelectorAll<HTMLElement>("[data-flip]");
  store.current = [...nodes].map((el) => ({
    el,
    rect: el.getBoundingClientRect(),
  }));
}
