/**
 * Flat exports for journalists / video makers (data/exports/).
 *
 *  closures-mueang.csv       1 row per closure on the site (954), enriched with
 *                            entity type, registration year and business code
 *  registrations-mueang.csv  1 row per NEW juristic person in อ.เมือง, same 43 months
 *  monthly.csv               registered vs dissolved per month
 *  tambon.csv                registered vs dissolved per subdistrict
 *
 * New registrations come from DBD dataset_11_01 ("นิติบุคคลจดทะเบียนตั้งใหม่").
 * Same URL trap as the dissolution set: the catalog points June 2026 at the
 * dissolution file, and March 2026 lives on a different host, so both are pinned.
 */
import { parse } from "csv-parse/sync";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const p = (...s: string[]) => join(process.cwd(), ...s);
const CACHE_DIR = p("data", "raw", "dbd-reg-csv");
const OUT_DIR = p("data", "exports");
const UA = "korat-closed/1.0 (+https://korat-is-korat.vercel.app)";

const REG_URL = (m: string) => `https://openapi.dbd.go.th/juristic_person/registration/99_${m}_1.csv`;
const REG_OVERRIDES: Record<string, string> = {
  "202603":
    "https://opendata.dbd.go.th/dataset/7948eb08-ad66-4ff0-8c57-fcf6dd3aa494/resource/40bbb7e7-5f80-4903-9f15-ca92dc7b90fb/download/99_202603_1.csv",
};

const cleanTambon = (s: string) => s.replace(/^(ต\.|ตำบล)\s*/, "").trim();

/** 13-digit juristic id: 0 · office(2) · type(1) · BE year(3) · running(5) · check(1). */
const ENTITY: Record<string, string> = {
  "2": "ห้างหุ้นส่วนสามัญนิติบุคคล",
  "3": "ห้างหุ้นส่วนจำกัด",
  "5": "บริษัทจำกัด",
  "7": "บริษัทมหาชนจำกัด",
};
function decodeId(id: string) {
  if (!/^\d{13}$/.test(id)) return { entityType: "", registeredYearBE: "" };
  return { entityType: ENTITY[id[3]] ?? `อื่น (${id[3]})`, registeredYearBE: String(2000 + Number(id.slice(4, 7))) };
}

function months(): string[] {
  const out: string[] = [];
  for (let y = 2023; y <= 2026; y++)
    for (let m = 1; m <= 12; m++) {
      const ym = `${y}${String(m).padStart(2, "0")}`;
      if (ym <= "202607") out.push(ym);
    }
  return out;
}

async function getRegCsv(month: string): Promise<string> {
  const cached = join(CACHE_DIR, `${month}.csv`);
  if (existsSync(cached)) return readFileSync(cached, "utf8");
  const res = await fetch(REG_OVERRIDES[month] ?? REG_URL(month), { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`registration ${month}: HTTP ${res.status}`);
  const text = await res.text();
  if (!text.includes("เลขทะเบียน")) throw new Error(`registration ${month}: not a CSV`);
  writeFileSync(cached, text);
  return text;
}

type Reg = { registrationNo: string; name: string; registeredAt: string; capital: string; purposeCode: string; purpose: string; tambon: string; sourceMonth: string };

function regRows(csv: string, month: string): Reg[] {
  const [header, ...body]: string[][] = parse(csv.replace(/^﻿/, ""), { skip_empty_lines: true, relax_column_count: true });
  const h = header.map((x) => x.replace(/﻿/g, "").trim());
  const col = (n: string) => {
    const i = h.indexOf(n);
    if (i === -1) throw new Error(`registration ${month}: missing column ${n}`);
    return i;
  };
  const c = {
    id: col("เลขทะเบียน"), name: col("ชื่อนิติบุคคล"), date: col("วันที่จดทะเบียน"), cap: col("ทุนจดทะเบียน"),
    code: col("รหัสวัตถุประสงค์"), purpose: col("วัตถุประสงค์"), tambon: col("ตำบล"), amphoe: col("อำเภอ"), prov: col("จังหวัด"),
  };
  return body
    .filter((r) => (r[c.prov] ?? "").includes("นครราชสีมา") && (r[c.amphoe] ?? "").includes("เมืองนครราชสีมา"))
    .map((r) => ({
      registrationNo: r[c.id].trim(),
      name: r[c.name].trim(),
      registeredAt: r[c.date].trim(),
      capital: r[c.cap].replace(/,/g, "").trim(),
      purposeCode: r[c.code].trim(),
      purpose: r[c.purpose].trim(),
      tambon: cleanTambon(r[c.tambon]),
      sourceMonth: month,
    }));
}

function toCsv(rows: Record<string, unknown>[]): string {
  const keys = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n") + "\n";
}

type Closure = {
  id: string; nameTh: string; category: string; tier: string; tambon: string; district: string; address?: string;
  lat: number; lng: number; geoAccuracy: string; closedAt: string; confidence: string; registrationNo?: string;
  capital?: number; purpose?: string; reason?: string; sources: { type: string; url: string; publisher: string; date: string }[];
};

async function main() {
  mkdirSync(CACHE_DIR, { recursive: true });
  mkdirSync(OUT_DIR, { recursive: true });

  const regs: Reg[] = [];
  for (const m of months()) regs.push(...regRows(await getRegCsv(m), m));

  const closures: Closure[] = JSON.parse(readFileSync(p("src", "data", "closures.json"), "utf8"));
  const raw: { registrationNo: string; purposeCode: string; sourceMonth: string }[] = JSON.parse(
    readFileSync(p("data", "raw", "dbd-mueang-geocoded.json"), "utf8"),
  );
  const rawById = new Map(raw.map((r) => [r.registrationNo, r]));

  const closureRows = closures.map((c) => {
    const id = decodeId(c.registrationNo ?? "");
    const closedYearBE = Number(c.closedAt.slice(0, 4)) + 543;
    return {
      id: c.id,
      tier: c.tier,
      nameTh: c.nameTh,
      registrationNo: c.registrationNo ?? "",
      entityType: id.entityType,
      registeredYearBE: id.registeredYearBE,
      closedAt: c.closedAt,
      approxAgeYears: id.registeredYearBE ? closedYearBE - Number(id.registeredYearBE) : "",
      purposeCode: rawById.get(c.registrationNo ?? "")?.purposeCode ?? "",
      purpose: c.purpose ?? "",
      category: c.category,
      capital: c.capital ?? "",
      tambon: c.tambon,
      district: c.district,
      lat: c.lat,
      lng: c.lng,
      geoAccuracy: c.geoAccuracy,
      confidence: c.confidence,
      reason: c.reason ?? "",
      sourceMonth: rawById.get(c.registrationNo ?? "")?.sourceMonth ?? "",
      sourceUrls: c.sources.map((s) => s.url).join(" "),
    };
  });

  const regRowsOut = regs.map((r) => ({ ...r, ...decodeId(r.registrationNo) }));

  // Monthly: dissolutions bucketed by DBD file month (what DBD published), news by closedAt month.
  const monthly = months().map((m) => {
    const ym = `${m.slice(0, 4)}-${m.slice(4)}`;
    return {
      month: ym,
      registered: regs.filter((r) => r.sourceMonth === m).length,
      dissolved_dbd: closureRows.filter((c) => c.tier === "dbd" && c.sourceMonth === m).length,
      closed_news: closureRows.filter((c) => c.tier === "news" && c.closedAt.startsWith(ym)).length,
    };
  });

  const tambons = [...new Set([...regs.map((r) => r.tambon), ...closures.map((c) => c.tambon)])];
  const tambon = tambons
    .map((t) => ({
      tambon: t,
      registered: regs.filter((r) => r.tambon === t).length,
      dissolved_dbd: closures.filter((c) => c.tier === "dbd" && c.tambon === t).length,
      closed_news: closures.filter((c) => c.tier === "news" && c.tambon === t).length,
    }))
    .sort((a, b) => b.registered + b.dissolved_dbd - (a.registered + a.dissolved_dbd));

  writeFileSync(join(OUT_DIR, "closures-mueang.csv"), toCsv(closureRows));
  writeFileSync(join(OUT_DIR, "registrations-mueang.csv"), toCsv(regRowsOut));
  writeFileSync(join(OUT_DIR, "monthly.csv"), toCsv(monthly));
  writeFileSync(join(OUT_DIR, "tambon.csv"), toCsv(tambon));

  console.log(`closures: ${closureRows.length} · new registrations (อ.เมือง): ${regs.length} · tambons: ${tambon.length}`);
}

main();
