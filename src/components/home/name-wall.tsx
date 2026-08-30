"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Every name, all at once.
 *
 * The point of this page is volume — one closed shop is a shame, 882 is a
 * pattern — so the hero is the actual list rather than a headline about it.
 * A few names light up at a time, which both draws the eye to individual
 * businesses and makes it obvious these are real places, not filler.
 */
export function NameWall({ names }: { names: { id: string; nameTh: string }[] }) {
  // Seeded on the client only: picking during render would mismatch the server
  // HTML, and the wall reads fine with nothing lit for the first beat.
  const [lit, setLit] = useState<number[]>([]);

  useEffect(() => {
    const pick = () =>
      Array.from({ length: 5 }, () => Math.floor(Math.random() * names.length));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const first = setTimeout(() => setLit(pick()), 400);
    const timer = reduced ? undefined : setInterval(() => setLit(pick()), 2600);
    return () => {
      clearTimeout(first);
      if (timer) clearInterval(timer);
    };
  }, [names.length]);

  return (
    <div
      aria-label={`รายชื่อธุรกิจ ${names.length} แห่งที่ปิดตัวลง`}
      className="relative max-h-[42vh] overflow-hidden [mask-image:linear-gradient(to_bottom,black_55%,transparent)]"
    >
      <p className="text-[13px] leading-[1.9] text-muted-foreground/70">
        {names.map((n, i) => (
          <span key={n.id}>
            <Link
              href={`/business/${n.id}`}
              className={
                "transition-colors duration-1000 hover:text-foreground focus-visible:text-foreground " +
                (lit.includes(i) ? "text-seng" : "")
              }
            >
              {n.nameTh}
            </Link>
            {i < names.length - 1 && <span className="px-1.5 text-border">·</span>}
          </span>
        ))}
      </p>
    </div>
  );
}
