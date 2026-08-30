"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
// Aliased: the component name would otherwise shadow the global Map constructor.
import { Map as MapCanvas, MapControls, MapClusterLayer } from "@/components/ui/map";
import { HeatLayer } from "./heat-layer";
import { TambonLayer } from "./tambon-layer";
import { CATEGORIES, type Category } from "@/lib/categories";
import type { Closure } from "@/lib/types";
import { useSystemTheme, type Theme } from "@/lib/use-theme";
import { rampFor, clusterColorsFor, PIN_COLOR } from "@/lib/heat";

const KORAT_CENTER: [number, number] = [102.0981, 14.9749];
type View = "heat" | "pins" | "tambon";

const VIEWS: { id: View; label: string; hint: string }[] = [
  { id: "tambon", label: "รายตำบล", hint: "ระบายสีทั้งตำบลตามจำนวนที่ปิด — ใช้ข้อมูลได้ครบทุกราย" },
  { id: "heat", label: "ความหนาแน่น", hint: "เฉพาะรายที่รู้พิกัดระดับถนนขึ้นไป จึงไม่ใช่ภาพรวมทั้งหมด" },
  { id: "pins", label: "หมุดรายร้าน", hint: "คลิกหมุดเพื่อดูรายละเอียดร้าน" },
];

export function MapExplorer({ closures }: { closures: Closure[] }) {
  const theme = useSystemTheme();
  const [view, setView] = useState<View>("tambon");
  const [years, setYears] = useState<Set<number>>(new Set());
  const [cats, setCats] = useState<Set<Category>>(new Set());
  const [storefrontOnly, setStorefrontOnly] = useState(false);
  const [newsOnly, setNewsOnly] = useState(false);
  const [tambon, setTambon] = useState<string | null>(null);
  const [selected, setSelected] = useState<Closure | null>(null);
  const [boundaries, setBoundaries] = useState<GeoJSON.FeatureCollection | null>(null);

  useEffect(() => {
    fetch("/data/tambons.geojson")
      .then((r) => r.json())
      .then(setBoundaries)
      .catch(() => setBoundaries(null));
  }, []);

  const allYears = useMemo(
    () => [...new Set(closures.map((c) => Number(c.closedAt.slice(0, 4))))].sort(),
    [closures],
  );
  const allCats = useMemo(
    () =>
      [...new Set(closures.map((c) => c.category as Category))].sort(
        (a, b) =>
          closures.filter((c) => c.category === b).length -
          closures.filter((c) => c.category === a).length,
      ),
    [closures],
  );

  const filtered = useMemo(
    () =>
      closures.filter((c) => {
        if (years.size && !years.has(Number(c.closedAt.slice(0, 4)))) return false;
        if (cats.size && !cats.has(c.category as Category)) return false;
        if (storefrontOnly && !CATEGORIES[c.category as Category].storefront) return false;
        if (newsOnly && c.tier !== "news") return false;
        if (tambon && c.tambon !== tambon) return false;
        return true;
      }),
    [closures, years, cats, storefrontOnly, newsOnly, tambon],
  );

  const toFeature = (c: Closure): GeoJSON.Feature<GeoJSON.Point> => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [c.lng, c.lat] },
    properties: { id: c.id },
  });

  // The heatmap deliberately drops subdistrict-only records: piling hundreds of
  // them onto a centroid would paint a hotspot that exists only in the geocoder.
  const heatData = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: filtered.filter((c) => c.geoAccuracy !== "zone").map(toFeature),
    }),
    [filtered],
  );
  const pinData = useMemo(
    () => ({ type: "FeatureCollection" as const, features: filtered.map(toFeature) }),
    [filtered],
  );
  const tambonCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of filtered) m.set(c.tambon, (m.get(c.tambon) ?? 0) + 1);
    return m;
  }, [filtered]);

  const byId = useMemo(() => new Map(closures.map((c) => [c.id, c])), [closures]);
  const preciseCount = filtered.filter((c) => c.geoAccuracy !== "zone").length;
  const activeView = VIEWS.find((v) => v.id === view)!;

  const toggle = <T,>(set: Set<T>, value: T, apply: (s: Set<T>) => void) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    apply(next);
  };

  const chip = (on: boolean) =>
    "border px-2.5 py-1 text-xs transition-colors " +
    (on ? "border-seng bg-seng text-white" : "border-border hover:border-foreground");

  return (
    <div className="flex h-[calc(100vh-8.5rem)] min-h-[560px] flex-col lg:flex-row">
      {/* Controls + results */}
      <aside className="flex w-full shrink-0 flex-col border-b border-border lg:w-[340px] lg:border-b-0 lg:border-r">
        <div className="space-y-5 overflow-y-auto p-5">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              มุมมองแผนที่
            </p>
            <div className="mt-2 flex gap-2">
              {VIEWS.map((v) => (
                <button key={v.id} onClick={() => setView(v.id)} className={chip(view === v.id)}>
                  {v.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{activeView.hint}</p>
          </div>

          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              ปีที่ปิด
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {allYears.map((y) => (
                <button
                  key={y}
                  onClick={() => toggle(years, y, setYears)}
                  className={chip(years.has(y))}
                >
                  {y + 543}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              ประเภทธุรกิจ
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                onClick={() => setStorefrontOnly(!storefrontOnly)}
                className={chip(storefrontOnly)}
              >
                เฉพาะที่มีหน้าร้าน
              </button>
              <button onClick={() => setNewsOnly(!newsOnly)} className={chip(newsOnly)}>
                เฉพาะที่มีข่าว
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {allCats.map((c) => (
                <button key={c} onClick={() => toggle(cats, c, setCats)} className={chip(cats.has(c))}>
                  {CATEGORIES[c].labelTh}
                </button>
              ))}
            </div>
          </div>

          {tambon && (
            <button
              onClick={() => setTambon(null)}
              className="w-full border border-seng px-3 py-2 text-left text-xs text-seng"
            >
              กรองอยู่ที่ ต.{tambon} — กดเพื่อล้าง ✕
            </button>
          )}
        </div>

        <div className="border-t border-border px-5 py-3">
          <p className="text-sm">
            <span className="font-mono text-seng">{filtered.length.toLocaleString("th-TH")}</span>{" "}
            รายการที่ตรงเงื่อนไข
            {view === "heat" && (
              <span className="text-muted-foreground">
                {" "}· แสดงบน heatmap ได้ {preciseCount.toLocaleString("th-TH")}
              </span>
            )}
          </p>
        </div>

        <ul className="flex-1 divide-y divide-border overflow-y-auto">
          {filtered.slice(0, 300).map((c) => (
            <li key={c.id}>
              <Link
                href={`/business/${c.id}`}
                className="block px-5 py-3 transition-colors hover:bg-card"
              >
                <p className="flex items-baseline gap-2">
                  <span className="truncate text-sm">{c.nameTh}</span>
                  {c.tier === "news" && (
                    <span className="shrink-0 bg-seng px-1.5 py-0.5 text-[10px] text-white">ข่าว</span>
                  )}
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                  {c.closedAt} · ต.{c.tambon} · {CATEGORIES[c.category as Category].labelTh}
                </p>
              </Link>
            </li>
          ))}
          {filtered.length > 300 && (
            <li className="px-5 py-3 text-xs text-muted-foreground">
              แสดง 300 รายการแรกจาก {filtered.length.toLocaleString("th-TH")} — กรองให้แคบลงเพื่อดูรายการอื่น
            </li>
          )}
        </ul>
      </aside>

      {/* Map */}
      <div className="relative min-h-[380px] flex-1">
        {theme && (
        <MapCanvas theme={theme} center={KORAT_CENTER} zoom={11.2} minZoom={9} maxZoom={17}>
          <MapControls showFullscreen />
          <TambonLayer
            boundaries={boundaries}
            counts={tambonCounts}
            visible={view === "tambon"}
            theme={theme}
            onSelect={(t) => setTambon(t)}
          />
          <HeatLayer data={heatData} visible={view === "heat"} theme={theme} />
          {view === "pins" && (
            <MapClusterLayer
              data={pinData}
              clusterRadius={44}
              clusterMaxZoom={15}
              clusterColors={clusterColorsFor(theme)}
              clusterThresholds={[25, 120]}
              pointColor={PIN_COLOR[theme ?? "light"]}
              onPointClick={(f) => setSelected(byId.get(String(f.properties?.id)) ?? null)}
            />
          )}
        </MapCanvas>
        )}

        <Legend view={view} theme={theme} />

        {selected && (
          <div className="absolute bottom-4 right-4 z-10 w-[290px] border border-border bg-card p-4 shadow-lg">
            <button
              onClick={() => setSelected(null)}
              className="float-right text-muted-foreground hover:text-foreground"
              aria-label="ปิด"
            >
              ✕
            </button>
            <p className="font-display text-base leading-snug">{selected.nameTh}</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              ปิด {selected.closedAt} · ต.{selected.tambon}
            </p>
            {selected.reason && <p className="mt-2 text-sm leading-relaxed">{selected.reason}</p>}
            <Link
              href={`/business/${selected.id}`}
              className="mt-3 inline-block text-sm text-seng underline underline-offset-4"
            >
              ดูรายละเอียดและแหล่งที่มา →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function Legend({ view, theme }: { view: View; theme: Theme | null }) {
  if (view === "pins") return null;
  const ramp = rampFor(theme);
  return (
    <div className="absolute bottom-4 left-4 z-10 border border-border bg-card/95 px-3 py-2.5 backdrop-blur-sm">
      <p className="text-[11px] text-muted-foreground">
        {view === "tambon" ? "จำนวนที่ปิดต่อตำบล" : "ความหนาแน่นของการปิดตัว"}
      </p>
      <div className="mt-1.5 flex h-2 w-40">
        {ramp.map((color) => (
          <span key={color} className="flex-1" style={{ backgroundColor: color }} />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>น้อย</span>
        <span>มาก</span>
      </div>
    </div>
  );
}
