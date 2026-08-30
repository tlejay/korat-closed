import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { closures, findClosure, thaiDate, TIER_LABEL, ACCURACY_LABEL } from "@/lib/data";
import { CATEGORIES, type Category } from "@/lib/categories";

export function generateStaticParams() {
  return closures.map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: PageProps<"/business/[id]">): Promise<Metadata> {
  const { id } = await params;
  const c = findClosure(id);
  if (!c) return { title: "ไม่พบข้อมูล" };
  return {
    title: c.nameTh,
    description: `${c.nameTh} — ปิดตัวเมื่อ ${thaiDate(c.closedAt)} ต.${c.tambon} อ.${c.district}`,
  };
}

const CONFIDENCE = {
  high: "ยืนยันได้ชัดเจน",
  medium: "ค่อนข้างมั่นใจ",
  low: "ต้องตรวจสอบเพิ่ม",
} as const;

export default async function BusinessPage({ params }: PageProps<"/business/[id]">) {
  const { id } = await params;
  const c = findClosure(id);
  if (!c) notFound();

  const facts: [string, string][] = [
    ["ประเภท", CATEGORIES[c.category as Category].labelTh],
    ["ที่ตั้ง", `${c.address ? c.address + " " : ""}ต.${c.tambon} อ.${c.district}`],
    ["ปิดเมื่อ", thaiDate(c.closedAt)],
    ...(c.openedAt ? ([["เปิดเมื่อ", thaiDate(c.openedAt)]] as [string, string][]) : []),
    ["ที่มาของข้อมูล", TIER_LABEL[c.tier]],
    ["ความมั่นใจ", CONFIDENCE[c.confidence]],
    ["ความแม่นยำของพิกัด", ACCURACY_LABEL[c.geoAccuracy]],
    ...(c.registrationNo ? ([["เลขทะเบียนนิติบุคคล", c.registrationNo]] as [string, string][]) : []),
    ...(c.capital ? ([["ทุนจดทะเบียน", `${c.capital.toLocaleString("th-TH")} บาท`]] as [string, string][]) : []),
  ];

  return (
    <article className="mx-auto w-full max-w-3xl px-5 py-12">
      <Link href="/map" className="font-mono text-xs text-muted-foreground hover:text-foreground">
        ← กลับไปที่แผนที่
      </Link>

      <h1 className="mt-5 font-display text-3xl leading-snug">{c.nameTh}</h1>
      {c.nameEn && <p className="mt-1 text-sm text-muted-foreground">{c.nameEn}</p>}

      <p className="mt-4 inline-block bg-seng px-2.5 py-1 text-xs text-white">
        ปิดเมื่อ {thaiDate(c.closedAt)}
      </p>

      {c.reason && (
        <p className="mt-6 border-l-2 border-seng pl-4 text-[15px] leading-relaxed">{c.reason}</p>
      )}

      {c.purpose && (
        <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
          <span className="text-foreground">วัตถุประสงค์ที่จดทะเบียนไว้:</span> {c.purpose}
        </p>
      )}

      <dl className="mt-8 grid gap-px border border-border bg-border sm:grid-cols-2">
        {facts.map(([k, v]) => (
          <div key={k} className="bg-background p-4">
            <dt className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{k}</dt>
            <dd className="mt-1 text-sm">{v}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-10">
        <h2 className="font-display text-lg">แหล่งที่มา</h2>
        <ul className="mt-3 space-y-2">
          {c.sources.map((s) => (
            <li key={s.url} className="text-sm">
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-seng underline underline-offset-4"
              >
                {s.publisher ?? s.url}
              </a>
              {s.date && <span className="ml-2 font-mono text-xs text-muted-foreground">{s.date}</span>}
              {s.quote && <p className="mt-1 text-muted-foreground">“{s.quote}”</p>}
            </li>
          ))}
        </ul>
      </section>

      {c.tier === "dbd" && (
        <p className="mt-8 border border-border bg-card p-4 text-sm leading-relaxed text-muted-foreground">
          รายการนี้มาจากทะเบียนนิติบุคคลที่จดทะเบียนเลิกกิจการ ซึ่งหมายความว่า
          <span className="text-foreground"> นิติบุคคลนี้เลิกจดทะเบียนแล้ว</span> —
          ไม่ได้แปลว่าหน้าร้านหรือกิจการปิดลงเสมอไป บางรายอาจย้าย เปลี่ยนชื่อ หรือปรับโครงสร้างบริษัท
          ถ้าคุณรู้ข้อมูลจริงของที่นี่{" "}
          <Link href="/submit" className="text-seng underline underline-offset-4">
            ช่วยแจ้งให้เราแก้ได้
          </Link>
        </p>
      )}
    </article>
  );
}
