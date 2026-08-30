/**
 * Downloads DBD monthly "dissolved juristic person" CSVs, keeps only
 * Nakhon Ratchasima rows.
 *
 * Source: https://opendata.dbd.go.th/dataset/dataset_11_02 (Open Data Common licence)
 *
 * Two quirks of the upstream data we have to work around:
 *  1. Two CSV schemas exist — some months prefix the rows with เดือน,ปี columns.
 *     We therefore index columns by header name, never by position.
 *  2. DBD swapped the URLs for June 2026: the dissolution dataset links to the
 *     registration file and vice versa. Verified by diffing the two files
 *     (registration/99_202408_1.csv vs dissolution/99_202408_2.csv share only
 *     4 of 2063 registration numbers, so the datasets are genuinely distinct).
 */
import { parse } from "csv-parse/sync";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const CKAN =
  "https://opendata.dbd.go.th/api/3/action/package_show?id=dataset_11_02";
const FROM_YYYYMM = 202301;
const OUT_DIR = join(process.cwd(), "data", "raw");
const CACHE_DIR = join(OUT_DIR, "dbd-csv");

/** Months where the published URL points at the wrong dataset. */
const URL_OVERRIDES: Record<string, string> = {
  "202606": "https://openapi.dbd.go.th/juristic_person/dissolution/99_202606_2.csv",
};

const COL = {
  registrationNo: ["เลขทะเบียน"],
  name: ["ชื่อนิติบุคคล"],
  dissolvedAt: ["วันที่จดทะเบียนเลิก", "วันที่จดทะเบียน"],
  capital: ["ทุนจดทะเบียน"],
  purposeCode: ["รหัสวัตถุประสงค์"],
  purpose: ["วัตถุประสงค์"],
  address: ["ที่ตั้งสำนักงานใหญ่"],
  subdistrict: ["ตำบล"],
  district: ["อำเภอ"],
  province: ["จังหวัด"],
  postcode: ["รหัสไปรษณีย์"],
} as const;

export type DbdRow = {
  registrationNo: string;
  name: string;
  dissolvedAt: string;
  capital: number | null;
  purposeCode: string;
  purpose: string;
  address: string;
  subdistrict: string;
  district: string;
  province: string;
  postcode: string;
  sourceMonth: string;
  sourceUrl: string;
};

async function resourceList(): Promise<{ month: string; url: string }[]> {
  const res = await fetch(CKAN);
  if (!res.ok) throw new Error(`CKAN ${res.status}`);
  const json = await res.json();
  const byMonth = new Map<string, string>();
  for (const r of json.result.resources ?? []) {
    const m = String(r.url ?? "").match(/(\d{6})_\d\.csv/);
    if (!m || Number(m[1]) < FROM_YYYYMM) continue;
    if (!byMonth.has(m[1])) byMonth.set(m[1], URL_OVERRIDES[m[1]] ?? r.url);
  }
  return [...byMonth]
    .map(([month, url]) => ({ month, url }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

async function getCsv(month: string, url: string): Promise<string> {
  const cached = join(CACHE_DIR, `${month}.csv`);
  if (existsSync(cached)) return readFileSync(cached, "utf8");
  const res = await fetch(url, {
    headers: { "User-Agent": "korat-closed/1.0 (+https://korat-is-korat.vercel.app)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  writeFileSync(cached, text);
  return text;
}

/** Maps our field names onto whatever column order this month happens to use. */
function headerIndex(header: string[]): Record<keyof typeof COL, number> {
  const norm = header.map((h) => h.replace(/﻿/g, "").trim());
  const idx = {} as Record<keyof typeof COL, number>;
  for (const [field, names] of Object.entries(COL) as [keyof typeof COL, readonly string[]][]) {
    const at = norm.findIndex((h) => names.includes(h));
    if (at === -1) throw new Error(`missing column for "${field}" in [${norm.join(", ")}]`);
    idx[field] = at;
  }
  return idx;
}

function toRows(csv: string, month: string, url: string): DbdRow[] {
  const records: string[][] = parse(csv.replace(/^﻿/, ""), {
    skip_empty_lines: true,
    relax_column_count: true,
  });
  const [header, ...body] = records;
  const i = headerIndex(header);
  const get = (r: string[], k: keyof typeof COL) => (r[i[k]] ?? "").trim();

  const rows: DbdRow[] = [];
  for (const r of body) {
    if (!get(r, "province").includes("นครราชสีมา")) continue;
    const capitalRaw = get(r, "capital").replace(/,/g, "");
    rows.push({
      registrationNo: get(r, "registrationNo"),
      name: get(r, "name"),
      dissolvedAt: get(r, "dissolvedAt"),
      capital: capitalRaw ? Number(capitalRaw) || null : null,
      purposeCode: get(r, "purposeCode"),
      purpose: get(r, "purpose"),
      address: get(r, "address"),
      subdistrict: get(r, "subdistrict"),
      district: get(r, "district"),
      province: get(r, "province"),
      postcode: get(r, "postcode"),
      sourceMonth: month,
      sourceUrl: url,
    });
  }
  return rows;
}

async function main() {
  mkdirSync(CACHE_DIR, { recursive: true });
  const resources = await resourceList();
  console.log(`months from ${FROM_YYYYMM}: ${resources.length}\n`);

  const all: DbdRow[] = [];
  for (const { month, url } of resources) {
    try {
      const rows = toRows(await getCsv(month, url), month, url);
      all.push(...rows);
      console.log(`  ${month}  korat=${String(rows.length).padStart(3)}  running=${all.length}`);
    } catch (err) {
      console.warn(`  ${month}  FAILED: ${(err as Error).message}`);
    }
  }

  writeFileSync(join(OUT_DIR, "dbd-korat-raw.json"), JSON.stringify(all, null, 2));

  const byDistrict = new Map<string, number>();
  for (const r of all) {
    const d = r.district.replace(/^อ\.?\s*/, "");
    byDistrict.set(d, (byDistrict.get(d) ?? 0) + 1);
  }
  console.log(`\ntotal Korat province rows: ${all.length}`);
  for (const [d, n] of [...byDistrict].sort((a, b) => b[1] - a[1]).slice(0, 6)) {
    console.log(`  ${String(n).padStart(4)}  ${d}`);
  }
}

main();
