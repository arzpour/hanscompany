import Image from "next/image";
import { Scene } from "../components/Scene";
import { Studio } from "../components/Studio";

export default function HomePage() {
  return (
    <main className="relative min-h-dvh overflow-hidden">
      <div className="absolute inset-0 z-[0] overflow-hidden">
        <Image
          src="/hero-studio.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[72%_42%] motion-safe:animate-push"
        />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(to_left,rgba(0,0,0,0.92)_0%,rgba(0,0,0,0.78)_34%,rgba(0,0,0,0.28)_62%,transparent_100%),radial-gradient(ellipse_at_18%_62%,rgba(193,18,31,0.34),transparent_36%)] max-[899px]:bg-[linear-gradient(to_top,rgba(0,0,0,0.9)_0%,rgba(0,0,0,0.62)_48%,rgba(0,0,0,0.28)_100%),radial-gradient(ellipse_at_20%_40%,rgba(193,18,31,0.3),transparent_42%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1] bg-linear-to-t from-black/55 to-transparent to-22%"
      />
      <Scene />
      <Studio />
    </main>
  );
}
