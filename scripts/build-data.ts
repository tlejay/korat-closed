/**
 * Merges the two data tiers into the files the site actually reads, and refuses
 * to emit anything that fails validation — a record without a working source
 * URL or with coordinates outside Korat must never reach the map.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ClosureSchema, type Closure } from "../src/lib/types";
import { categoryFor } from "../src/lib/categories";

const ROOT = process.cwd();
const p = (...s: string[]) => join(ROOT, ...s);

type GeocodedRow = {
  registrationNo: string; name: string; dissolvedAt: string; capital: number | null;
  purposeCode: string; purpose: string; address: string; subdistrict: string;
  district: string; tambon: string; sourceMonth: string; sourceUrl: string;
  lat: number | null; lng: number | null; geoAccuracy: "exact" | "road" | "zone" | "none";
};

/**
 * DBD publishes the dissolution date in at least six encodings, sometimes
 * several within one file, all in the Buddhist era:
 *   2569-05-08   YYYY-MM-DD
 *   2569-12-01   YYYY-DD-MM  (day and month swapped)
 *   08/05/2569   DD/MM/YYYY
 *   8/5/2569     D/M/YYYY
 *   29-02-2567   DD-MM-YYYY
 *   243809       an Excel serial counted from 1899-12-30 in Buddhist years
 *
 * Rather than guess, we generate every plausible reading and keep the one that
 * lands in the month of the file the row came from. That check is exact — a
 * July file only ever lists July dissolutions — so it disambiguates the swapped
 * formats instead of silently dating a closure five months into the future.
 */
function candidateDates(value: string): { y: number; m: number; d: number }[] {
  const out: { y: number; m: number; d: number }[] = [];
  const push = (be: number, m: number, d: number) => {
    const y = be - 543;
    if (y >= 2000 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) out.push({ y, m, d });
  };

  const parts = value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (parts) {
    push(+parts[1], +parts[2], +parts[3]);
    push(+parts[1], +parts[3], +parts[2]);
  }
  const tail = value.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (tail) {
    push(+tail[3], +tail[2], +tail[1]);
    push(+tail[3], +tail[1], +tail[2]);
  }
  if (/^\d{5,6}$/.test(value)) {
    // Excel serials here count days from 1899-12-30 but land on Buddhist years,
    // so read the resulting calendar date and treat its year as B.E.
    const date = new Date(Date.UTC(1899, 11, 30) + Number(value) * 86400000);
    if (!Number.isNaN(date.getTime())) {
      push(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
    }
  }
  return out;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Resolves the date against the month of the source file. */
function toGregorian(value: string, sourceMonth: string): { date: string; exact: boolean } | null {
  const candidates = candidateDates(value);
  const match = candidates.find((c) => `${c.y}${pad(c.m)}` === sourceMonth);
  if (match) return { date: `${match.y}-${pad(match.m)}-${pad(match.d)}`, exact: true };
  // Unrecoverable date: fall back to the month the row was published in, which
  // is always right to the month even when the day is corrupt.
  const y = Number(sourceMonth.slice(0, 4));
  const m = Number(sourceMonth.slice(4));
  if (y >= 2000 && m >= 1 && m <= 12) return { date: `${y}-${pad(m)}`, exact: false };
  return null;
}

/** Strips the หจ./บจ. prefix DBD puts on every name so headings read naturally. */
function tidyName(name: string): string {
  return name
    .replace(/^(หจ\.|บจ\.|บมจ\.|หส\.|หสน\.)\s*/, "")
    .replace(/^(ห้างหุ้นส่วนจำกัด|ห้างหุ้นส่วนสามัญนิติบุคคล|บริษัท)\s*/, "")
    .replace(/\s*จำกัด\s*(\(มหาชน\))?\s*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function fromDbd(rows: GeocodedRow[]): Closure[] {
  const out: Closure[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    if (r.lat === null || r.lng === null || r.geoAccuracy === "none") continue;
    const closed = toGregorian(r.dissolvedAt, r.sourceMonth);
    if (!closed) continue;

    let id = `dbd-${r.registrationNo}`;
    while (seen.has(id)) id += "x";
    seen.add(id);

    out.push({
      id,
      nameTh: tidyName(r.name) || r.name,
      category: categoryFor(r.purposeCode),
      tier: "dbd",
      tambon: r.tambon,
      district: "เมืองนครราชสีมา",
      address: r.address || undefined,
      lat: r.lat,
      lng: r.lng,
      geoAccuracy: r.geoAccuracy,
      closedAt: closed.date,
      purpose: r.purpose || undefined,
      capital: r.capital,
      registrationNo: r.registrationNo,
      // DBD says the company dissolved. It does not say the shop went dark, so
      // a road-level match is "medium" at best and a subdistrict guess is "low".
      confidence: r.geoAccuracy === "zone" ? "low" : "medium",
      sources: [{
        type: "dbd",
        url: r.sourceUrl,
        publisher: "กรมพัฒนาธุรกิจการค้า (DBD Open Data)",
        date: r.dissolvedAt,
      }],
    });
  }
  return out;
}

function main() {
  const geocoded: GeocodedRow[] = JSON.parse(
    readFileSync(p("data", "raw", "dbd-mueang-geocoded.json"), "utf8"),
  );
  const curatedPath = p("data", "closures.curated.json");
  const curated: unknown[] = existsSync(curatedPath)
    ? JSON.parse(readFileSync(curatedPath, "utf8"))
    : [];

  const dbd = fromDbd(geocoded);
  const monthOnly = dbd.filter((c) => c.closedAt.length === 7).length;
  const news = curated.map((c) => ({ ...(c as object), tier: "news" }));
  const all = [...news, ...dbd];

  const valid: Closure[] = [];
  const errors: string[] = [];
  for (const raw of all) {
    const parsed = ClosureSchema.safeParse(raw);
    if (parsed.success) valid.push(parsed.data);
    else {
      const r = raw as { id?: string; nameTh?: string };
      errors.push(`${r.id ?? r.nameTh ?? "?"}: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
    }
  }
  if (errors.length) {
    console.error(`\n${errors.length} record(s) rejected:`);
    errors.slice(0, 20).forEach((e) => console.error(`  ✗ ${e}`));
    if (errors.length > 20) console.error(`  … and ${errors.length - 20} more`);
    if (valid.length === 0) process.exit(1);
  }

  valid.sort((a, b) => b.closedAt.localeCompare(a.closedAt));
  writeFileSync(p("src", "data", "closures.json"), JSON.stringify(valid));

  // Subdistrict polygons carry their own closure counts so the choropleth needs
  // no client-side join.
  const tambons = JSON.parse(readFileSync(p("data", "raw", "korat-tambons.geojson"), "utf8"));
  const perTambon = new Map<string, Closure[]>();
  for (const c of valid) {
    if (!perTambon.has(c.tambon)) perTambon.set(c.tambon, []);
    perTambon.get(c.tambon)!.push(c);
  }
  for (const f of tambons.features) {
    const list = perTambon.get(f.properties.tambon) ?? [];
    const byYear: Record<string, number> = {};
    for (const c of list) {
      const y = c.closedAt.slice(0, 4);
      byYear[y] = (byYear[y] ?? 0) + 1;
    }
    f.properties.count = list.length;
    f.properties.byYear = byYear;
    f.properties.storefrontCount = list.filter((c) =>
      ["restaurant", "retail", "hotel", "automotive", "health", "education", "personal", "entertainment"].includes(c.category),
    ).length;
  }
  writeFileSync(p("public", "data", "tambons.geojson"), JSON.stringify(tambons));

  const withoutPolygon = [...perTambon.keys()].filter(
    (t) => !tambons.features.some((f: { properties: { tambon: string } }) => f.properties.tambon === t),
  );

  const byTier = valid.reduce<Record<string, number>>((a, c) => ({ ...a, [c.tier]: (a[c.tier] ?? 0) + 1 }), {});
  const byAcc = valid.reduce<Record<string, number>>((a, c) => ({ ...a, [c.geoAccuracy]: (a[c.geoAccuracy] ?? 0) + 1 }), {});
  console.log(`\nrecords: ${valid.length}`);
  console.log(`  by tier:     ${JSON.stringify(byTier)}`);
  console.log(`  by accuracy: ${JSON.stringify(byAcc)}`);
  console.log(`  dates recoverable only to the month: ${monthOnly}`);
  console.log(`  subdistricts with polygons: ${tambons.features.length}`);
  if (withoutPolygon.length) console.log(`  no polygon (excluded from choropleth): ${withoutPolygon.join(", ")}`);
}

main();
