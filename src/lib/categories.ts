/**
 * Business categories, derived from the 2-digit TSIC division in the DBD
 * "รหัสวัตถุประสงค์" column.
 *
 * `storefront` marks the kinds of business an ordinary person walks past and
 * notices when it disappears. It is the default filter on the map, because a
 * dissolved holding company tells you nothing about a neighbourhood while a
 * dissolved restaurant does.
 */
export const CATEGORIES = {
  restaurant: { labelTh: "ร้านอาหาร / เครื่องดื่ม", storefront: true },
  retail: { labelTh: "ค้าปลีก / ร้านค้า", storefront: true },
  hotel: { labelTh: "ที่พัก / โรงแรม", storefront: true },
  automotive: { labelTh: "รถยนต์ ขาย/ซ่อม", storefront: true },
  health: { labelTh: "คลินิก / สุขภาพ", storefront: true },
  education: { labelTh: "โรงเรียน / สถาบันสอน", storefront: true },
  personal: { labelTh: "บริการส่วนบุคคล", storefront: true },
  entertainment: { labelTh: "บันเทิง / กีฬา", storefront: true },
  wholesale: { labelTh: "ค้าส่ง", storefront: false },
  construction: { labelTh: "ก่อสร้าง / รับเหมา", storefront: false },
  realestate: { labelTh: "อสังหาริมทรัพย์", storefront: false },
  logistics: { labelTh: "ขนส่ง / คลังสินค้า", storefront: false },
  factory: { labelTh: "โรงงาน / การผลิต", storefront: false },
  agriculture: { labelTh: "เกษตร", storefront: false },
  professional: { labelTh: "สำนักงาน / วิชาชีพ", storefront: false },
  other: { labelTh: "อื่น ๆ", storefront: false },
} as const;

export type Category = keyof typeof CATEGORIES;

/** TSIC division (first two digits) → category. */
const DIVISION: Record<string, Category> = {
  "56": "restaurant",
  "47": "retail",
  "55": "hotel",
  "45": "automotive",
  "86": "health", "87": "health", "75": "health",
  "85": "education",
  "96": "personal", "95": "personal",
  "90": "entertainment", "91": "entertainment", "92": "entertainment",
  "93": "entertainment", "59": "entertainment", "79": "entertainment",
  "46": "wholesale",
  "41": "construction", "42": "construction", "43": "construction",
  "68": "realestate",
  "49": "logistics", "50": "logistics", "51": "logistics",
  "52": "logistics", "53": "logistics",
  "01": "agriculture", "02": "agriculture", "03": "agriculture",
  "05": "factory", "06": "factory", "07": "factory", "08": "factory", "09": "factory",
  "35": "factory", "36": "factory", "37": "factory", "38": "factory", "39": "factory",
  "58": "professional", "62": "professional", "63": "professional",
  "64": "professional", "65": "professional", "66": "professional",
  "69": "professional", "70": "professional", "71": "professional",
  "72": "professional", "73": "professional", "74": "professional",
  "77": "professional", "78": "professional", "80": "professional",
  "81": "professional", "82": "professional", "84": "professional",
  "94": "other", "97": "other", "98": "other", "99": "other",
};

export function categoryFor(purposeCode: string): Category {
  const div = purposeCode.trim().slice(0, 2);
  if (DIVISION[div]) return DIVISION[div];
  // 10–33 is the manufacturing block; anything left over there is a factory.
  const n = Number(div);
  if (n >= 10 && n <= 33) return "factory";
  return "other";
}

export const isStorefront = (c: Category) => CATEGORIES[c].storefront;
