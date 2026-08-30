import { z } from "zod";
import { CATEGORIES } from "./categories";

/**
 * One closed business.
 *
 * `tier` is the whole trust story of this site and is always shown next to the
 * record:
 *   news — a journalist named the shop and said it closed
 *   dbd  — the company registered its dissolution with the Department of
 *          Business Development. Official, but a juristic person dissolving is
 *          not always a shopfront going dark.
 */
export const SourceSchema = z.object({
  type: z.enum(["news", "facebook", "gmaps", "dbd", "community"]),
  url: z.string().url(),
  publisher: z.string().optional(),
  date: z.string().optional(),
  quote: z.string().optional(),
});

export const ClosureSchema = z.object({
  id: z.string().min(1),
  nameTh: z.string().min(1),
  nameEn: z.string().optional(),
  category: z.enum(Object.keys(CATEGORIES) as [string, ...string[]]),
  tier: z.enum(["news", "dbd", "community"]),
  tambon: z.string().min(1),
  district: z.string().min(1),
  address: z.string().optional(),
  lat: z.number().min(14.5).max(15.5),
  lng: z.number().min(101.5).max(102.6),
  geoAccuracy: z.enum(["exact", "road", "zone"]),
  closedAt: z.string().regex(/^\d{4}(-\d{2}){0,2}$/),
  openedAt: z.string().optional(),
  reason: z.string().optional(),
  reasonCategory: z
    .enum(["economy", "rent", "lease_end", "covid", "relocated", "restructure", "owner", "unknown"])
    .optional(),
  confidence: z.enum(["high", "medium", "low"]),
  registrationNo: z.string().optional(),
  capital: z.number().nullable().optional(),
  purpose: z.string().optional(),
  // Every record must be traceable back to something a reader can open.
  sources: z.array(SourceSchema).min(1),
});

export type Closure = z.infer<typeof ClosureSchema>;
export type Source = z.infer<typeof SourceSchema>;

export const closedYear = (c: Pick<Closure, "closedAt">) => Number(c.closedAt.slice(0, 4));
/** Buddhist-era year, which is how Thai readers date things. */
export const closedYearBE = (c: Pick<Closure, "closedAt">) => closedYear(c) + 543;
