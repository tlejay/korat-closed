/**
 * Builds ตำบล boundary polygons for อำเภอเมืองนครราชสีมา.
 *
 * Base layer: the national subdistrict boundary set
 * (https://github.com/chingchai/OpenGISData-Thailand). It covers 23 of the 25
 * subdistricts but is missing 300101 ในเมือง — the city core, and by far our
 * largest bucket — and 300113 บ้านใหม่. OSM carries both as administrative
 * boundary relations, so we fill those two from Nominatim.
 *
 * Note: a plain Nominatim search returns the railway station node first for
 * "ตำบลในเมือง", so we take the first result whose category is `boundary`.
 */
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const BASE = "https://raw.githubusercontent.com/chingchai/OpenGISData-Thailand/master";
const RAW = join(process.cwd(), "data", "raw");
const OUT = join(RAW, "korat-tambons.geojson");
const AMPHOE_CODE = "3001";
const UA = "korat-closed/1.0 (+https://korat-is-korat.vercel.app; jakapong@digitalmedia.co.th)";

const MISSING = [
  { tambon: "ในเมือง", tambonEn: "Nai Mueang", code: "300101", query: "ตำบลในเมือง อำเภอเมืองนครราชสีมา นครราชสีมา" },
  { tambon: "บ้านใหม่", tambonEn: "Ban Mai", code: "300113", query: "ตำบลบ้านใหม่ เมืองนครราชสีมา นครราชสีมา" },
] as const;

type Geometry = { type: "Polygon" | "MultiPolygon"; coordinates: number[][][] | number[][][][] };
type Tambon = { tambon: string; tambonEn: string; code: string; geometry: Geometry; source: "national" | "osm" };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function cached(name: string, url: string) {
  const path = join(RAW, name);
  if (!existsSync(path)) {
    console.log(`downloading ${name}…`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
    writeFileSync(path, await res.text());
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

/** Area-weighted centroid over outer rings. */
function centroid(g: Geometry): [number, number] {
  const polys = (g.type === "Polygon" ? [g.coordinates] : g.coordinates) as number[][][][];
  let cx = 0, cy = 0, total = 0;
  for (const poly of polys) {
    const ring = poly[0];
    let a = 0, x = 0, y = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const cross = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
      a += cross;
      x += (ring[j][0] + ring[i][0]) * cross;
      y += (ring[j][1] + ring[i][1]) * cross;
    }
    a /= 2;
    if (!a) continue;
    cx += (x / (6 * a)) * Math.abs(a);
    cy += (y / (6 * a)) * Math.abs(a);
    total += Math.abs(a);
  }
  return total ? [cx / total, cy / total] : [0, 0];
}

async function fromOsm(query: string): Promise<Geometry | null> {
  const url =
    "https://nominatim.openstreetmap.org/search?format=geojson&polygon_geojson=1" +
    `&limit=5&countrycodes=th&q=${encodeURIComponent(query)}`;
  await sleep(1100);
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) return null;
  const json = await res.json();
  const hit = (json.features ?? []).find(
    (f: { properties: { category?: string }; geometry: { type: string } }) =>
      f.properties?.category === "boundary" &&
      (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon"),
  );
  return hit?.geometry ?? null;
}

async function main() {
  const subs = await cached("th-subdistricts.geojson", `${BASE}/subdistricts.geojson`);

  const known: Tambon[] = subs.features
    .filter((f: { properties: Record<string, string> }) => String(f.properties.amp_code) === AMPHOE_CODE)
    .map((f: { properties: Record<string, string | number>; geometry: Geometry }) => ({
      tambon: String(f.properties.tam_th),
      tambonEn: String(f.properties.tam_en),
      code: String(f.properties.tam_code),
      geometry: f.geometry,
      source: "national" as const,
    }));
  console.log(`from national set: ${known.length}`);

  const filled: Tambon[] = [];
  for (const m of MISSING) {
    const geometry = await fromOsm(m.query);
    if (!geometry) {
      console.warn(`  ! ${m.tambon}: no OSM boundary found`);
      continue;
    }
    console.log(`  ✓ ${m.tambon}: filled from OSM (${geometry.type})`);
    filled.push({ tambon: m.tambon, tambonEn: m.tambonEn, code: m.code, geometry, source: "osm" });
  }

  const features = [...known, ...filled]
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((t) => ({
      type: "Feature" as const,
      properties: {
        tambon: t.tambon,
        tambonEn: t.tambonEn,
        code: t.code,
        centroid: centroid(t.geometry),
        boundarySource: t.source,
      },
      geometry: t.geometry,
    }));

  writeFileSync(OUT, JSON.stringify({ type: "FeatureCollection", features }));
  console.log(`\ntotal subdistricts: ${features.length}`);
  for (const f of features) {
    const [lng, lat] = f.properties.centroid;
    console.log(
      `  ${f.properties.tambon.padEnd(14)} ${lat.toFixed(4)}, ${lng.toFixed(4)}  ${f.properties.boundarySource}`,
    );
  }
}

main();
