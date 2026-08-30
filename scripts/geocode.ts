/**
 * Turns DBD registered addresses into coordinates using Nominatim.
 *
 * Nominatim's usage policy allows 1 request/second from a single machine, so we
 * geocode *unique query strings* rather than rows — a few hundred roads and
 * subdistricts stand in for ~1,000 businesses — and cache every answer in the
 * repo so this only ever runs once.
 *
 * Accuracy recorded per row as `geoAccuracy`:
 *   exact — a soi resolved
 *   road  — a road resolved
 *   zone  — only the subdistrict resolved (most DBD addresses are just "หมู่ที่ N")
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { DbdRow } from "./fetch-dbd";

const CACHE_PATH = join(process.cwd(), "data", "geocode-cache.json");
const RAW_PATH = join(process.cwd(), "data", "raw", "dbd-korat-raw.json");
const OUT_PATH = join(process.cwd(), "data", "raw", "dbd-mueang-geocoded.json");
const UA = "korat-closed/1.0 (+https://korat-is-korat.vercel.app; jakapong@digitalmedia.co.th)";

export const KORAT_BBOX = { south: 14.85, north: 15.12, west: 101.95, east: 102.28 };

type CacheEntry = { lat: number; lng: number } | null;
const cache: Record<string, CacheEntry> = existsSync(CACHE_PATH)
  ? JSON.parse(readFileSync(CACHE_PATH, "utf8"))
  : {};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const inBox = (lat: number, lng: number) =>
  lat >= KORAT_BBOX.south && lat <= KORAT_BBOX.north &&
  lng >= KORAT_BBOX.west && lng <= KORAT_BBOX.east;

async function geocode(query: string): Promise<CacheEntry> {
  if (query in cache) return cache[query];
  const url =
    "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=th" +
    `&viewbox=${KORAT_BBOX.west},${KORAT_BBOX.north},${KORAT_BBOX.east},${KORAT_BBOX.south}` +
    `&bounded=1&q=${encodeURIComponent(query)}`;
  await sleep(1100);
  let result: CacheEntry = null;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.ok) {
      const hit = ((await res.json()) as { lat: string; lon: string }[])[0];
      if (hit) {
        const lat = Number(hit.lat), lng = Number(hit.lon);
        if (inBox(lat, lng)) result = { lat, lng };
      }
    }
  } catch {
    return null; // leave uncached so a later run retries
  }
  cache[query] = result;
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
  return result;
}

export const cleanTambon = (s: string) => s.replace(/^(ต\.|ตำบล)\s*/, "").trim();
const TAIL = ", อำเภอเมืองนครราชสีมา, นครราชสีมา";

/**
 * Candidate queries for one address, most precise first.
 * OSM names Korat roads inconsistently (มิตรภาพ-หนองคาย vs มิตรภาพ), and sois
 * are often unmapped, so each address gets several shots before falling back
 * to its subdistrict.
 */
export function addressQueries(address: string, tambon: string) {
  const exact: string[] = [];
  const road: string[] = [];

  const soi = address.match(/ซอย\s*([ก-๙A-Za-z0-9\-]+(?:\s*\d+)?)/);
  if (soi) {
    const name = soi[1].trim();
    exact.push(`ซอย${name}, ${tambon}${TAIL}`);
    // "ซอยมิตรภาพ 15" hangs off "ถนนมิตรภาพ" — use the parent road as backup.
    const parent = name.replace(/\s*\d+$/, "").trim();
    if (parent.length >= 2) road.push(`ถนน${parent}, ${tambon}${TAIL}`, `ถนน${parent}${TAIL}`);
  }

  const st = address.match(/(?:ถนน|ถ\.)\s*([ก-๙A-Za-z0-9\-]+(?:\s[ก-๙A-Za-z0-9]+)?)/);
  if (st) {
    const name = st[1].trim();
    if (name.length >= 2) {
      road.push(`ถนน${name}, ${tambon}${TAIL}`, `ถนน${name}${TAIL}`);
      // "ถนนมิตรภาพ-หนองคาย" is mapped simply as "ถนนมิตรภาพ".
      const short = name.split("-")[0].trim();
      if (short !== name && short.length >= 2) road.push(`ถนน${short}${TAIL}`);
    }
  }
  return { exact, road, zone: [`ตำบล${tambon}${TAIL}`, `${tambon}${TAIL}`] };
}

async function main() {
  const raw: DbdRow[] = JSON.parse(readFileSync(RAW_PATH, "utf8"));
  const rows = raw.filter((r) => r.district.includes("เมืองนครราชสีมา"));
  console.log(`rows in อ.เมืองนครราชสีมา: ${rows.length}`);

  const queries = new Set<string>();
  for (const r of rows) {
    const q = addressQueries(r.address, cleanTambon(r.subdistrict));
    [...q.exact, ...q.road, ...q.zone].forEach((s) => queries.add(s));
  }
  const pending = [...queries].filter((q) => !(q in cache));
  console.log(`unique queries: ${queries.size} (${pending.length} new, ~${Math.ceil((pending.length * 1.1) / 60)} min)`);

  let done = 0;
  for (const q of pending) {
    await geocode(q);
    if (++done % 50 === 0) console.log(`  ${done}/${pending.length}`);
  }

  const stats = { exact: 0, road: 0, zone: 0, none: 0 };
  const out = rows.map((r) => {
    const tambon = cleanTambon(r.subdistrict);
    const q = addressQueries(r.address, tambon);
    const pick = (list: string[]) => list.map((s) => cache[s]).find(Boolean) ?? null;

    let hit = pick(q.exact);
    let geoAccuracy: keyof typeof stats = "exact";
    if (!hit) { hit = pick(q.road); geoAccuracy = "road"; }
    if (!hit) { hit = pick(q.zone); geoAccuracy = "zone"; }
    if (!hit) geoAccuracy = "none";

    stats[geoAccuracy]++;
    return { ...r, tambon, lat: hit?.lat ?? null, lng: hit?.lng ?? null, geoAccuracy };
  });

  writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
  console.log(`\nexact=${stats.exact} road=${stats.road} zone=${stats.zone} none=${stats.none}`);
}

main();
