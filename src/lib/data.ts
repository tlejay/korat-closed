import raw from "@/data/closures.json";
import { CATEGORIES, type Category } from "./categories";
import type { Closure } from "./types";

export const closures = raw as Closure[];

export const newsClosures = closures.filter((c) => c.tier === "news");
export const dbdClosures = closures.filter((c) => c.tier === "dbd");

export const YEARS = [...new Set(closures.map((c) => Number(c.closedAt.slice(0, 4))))].sort();
export const beYear = (gregorian: number) => gregorian + 543;

/** The month the DBD data currently runs to, so we never imply a full year. */
export const latestMonth = closures
  .map((c) => c.closedAt.slice(0, 7))
  .sort()
  .at(-1)!;

export function countBy<K extends string>(list: Closure[], key: (c: Closure) => K) {
  const out = new Map<K, number>();
  for (const c of list) out.set(key(c), (out.get(key(c)) ?? 0) + 1);
  return out;
}

export const byYear = (list = closures) =>
  YEARS.map((year) => ({
    year,
    beYear: beYear(year),
    count: list.filter((c) => Number(c.closedAt.slice(0, 4)) === year).length,
  }));

export const byCategory = (list = closures) =>
  [...countBy(list, (c) => c.category as Category)]
    .map(([category, count]) => ({
      category,
      count,
      labelTh: CATEGORIES[category].labelTh,
      storefront: CATEGORIES[category].storefront,
    }))
    .sort((a, b) => b.count - a.count);

export const byTambon = (list = closures) =>
  [...countBy(list, (c) => c.tambon)]
    .map(([tambon, count]) => ({ tambon, count }))
    .sort((a, b) => b.count - a.count);

export const findClosure = (id: string) => closures.find((c) => c.id === id);

/** Thai-style date: "8 พฤษภาคม 2569". Falls back gracefully to month or year. */
const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

export function thaiDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  const be = Number(y) + 543;
  if (!m) return `ปี ${be}`;
  const month = THAI_MONTHS[Number(m) - 1] ?? "";
  return d ? `${Number(d)} ${month} ${be}` : `${month} ${be}`;
}

export const TIER_LABEL = {
  news: "ยืนยันจากข่าว",
  dbd: "จดทะเบียนเลิกกิจการ",
  community: "แจ้งโดยชุมชน",
} as const;

export const ACCURACY_LABEL = {
  exact: "พิกัดระดับซอย",
  road: "พิกัดระดับถนน",
  zone: "รู้แค่ระดับตำบล",
} as const;
