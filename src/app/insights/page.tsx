import type { Metadata } from "next";
import Link from "next/link";
import { closures, byYear, byCategory, byTambon, beYear, latestMonth, newsClosures } from "@/lib/data";

export const metadata: Metadata = {
  title: "ตัวเลข",
  description: "สถิติการปิดตัวของธุรกิจในเมืองโคราช แยกตามปี ประเภทธุรกิจ และตำบล",
};

function Bar({ value, max, tone }: { value: number; max: number; tone: string }) {
  return (
    <span className="flex-1">
      <span className={`block h-6 ${tone}`} style={{ width: `${Math.max(2, (value / max) * 100)}%` }} />
    </span>
  );
}

export default function InsightsPage() {
  const years = byYear();
  const cats = byCategory();
  const tambons = byTambon().slice(0, 12);
  const [lastYear, lastMonth] = latestMonth.split("-");
  const partialYear = Number(lastYear);
  const fullYears = years.filter((y) => y.year !== partialYear);
  const peak = fullYears.reduce((a, b) => (b.count > a.count ? b : a), fullYears[0]);
  const latest = fullYears.at(-1)!;

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-12">
      <h1 className="font-display text-3xl">ตัวเลข</h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
        ตัวเลขทั้งหมดนับจาก {closures.length.toLocaleString("th-TH")} รายการในฐานข้อมูลนี้
        ซึ่งเป็นภาพของ{" "}
        <span className="text-foreground">นิติบุคคลที่จดทะเบียนเลิกกิจการในเขตอำเภอเมืองนครราชสีมา</span>{" "}
        บวกกับ {newsClosures.length} ร้านที่มีข่าวรายงาน — ไม่ใช่จำนวนร้านที่ปิดจริงทั้งหมด
        เพราะร้านที่ไม่ได้จดทะเบียนนิติบุคคลไม่ปรากฏในข้อมูลชุดนี้
      </p>

      <section className="mt-12">
        <h2 className="font-display text-xl">ปิดปีละเท่าไหร่</h2>
        <ul className="mt-5 space-y-2">
          {years.map((y) => (
            <li key={y.year} className="flex items-center gap-3">
              <span className="w-14 font-mono text-sm text-muted-foreground">{y.beYear}</span>
              <Bar value={y.count} max={Math.max(...years.map((v) => v.count))} tone="bg-heat-4" />
              <span className="w-20 font-mono text-sm">
                {y.count}
                {y.year === partialYear && (
                  <span className="ml-1 text-[10px] text-muted-foreground">*</span>
                )}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          * ปี {beYear(partialYear)} นับถึงเดือน {Number(lastMonth)} เท่านั้น จึงเทียบกับปีเต็มไม่ได้
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed">
          ในปีที่มีข้อมูลครบ จำนวนการเลิกกิจการสูงสุดอยู่ที่ปี {peak.beYear} ({peak.count} ราย)
          และปี {latest.beYear} อยู่ที่ {latest.count} ราย —{" "}
          {latest.count < peak.count
            ? "แนวโน้มลดลงจากจุดสูงสุด ซึ่งสวนทางกับความรู้สึกว่า “ปิดกันเยอะขึ้นทุกปี” ตัวเลขทะเบียนไม่ได้บอกว่าเศรษฐกิจดีขึ้น แต่บอกว่าจำนวนนิติบุคคลที่ยื่นเลิกกิจการลดลง"
            : "แนวโน้มเพิ่มขึ้นจากจุดต่ำสุด"}
        </p>
      </section>

      <section className="mt-14">
        <h2 className="font-display text-xl">ธุรกิจประเภทไหนปิดมากที่สุด</h2>
        <ul className="mt-5 space-y-2">
          {cats.map((c) => (
            <li key={c.category} className="flex items-center gap-3">
              <span className="w-40 truncate text-sm text-muted-foreground">{c.labelTh}</span>
              <Bar value={c.count} max={cats[0].count} tone={c.storefront ? "bg-seng" : "bg-steel"} />
              <span className="w-12 font-mono text-sm">{c.count}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-2"><span className="size-3 bg-seng" /> มีหน้าร้าน</span>
          <span className="flex items-center gap-2"><span className="size-3 bg-steel" /> ไม่มีหน้าร้าน</span>
        </p>
      </section>

      <section className="mt-14">
        <h2 className="font-display text-xl">ตำบลที่ปิดมากที่สุด</h2>
        <ul className="mt-5 space-y-2">
          {tambons.map((t) => (
            <li key={t.tambon} className="flex items-center gap-3">
              <span className="w-28 truncate text-sm text-muted-foreground">{t.tambon}</span>
              <Bar value={t.count} max={tambons[0].count} tone="bg-heat-3" />
              <span className="w-12 font-mono text-sm">{t.count}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          ตัวเลขนี้ไม่ได้ปรับตามขนาดของตำบล ตำบลในเมืองมีธุรกิจหนาแน่นที่สุดอยู่แล้ว
          จึงมีทั้งจำนวนธุรกิจและจำนวนที่ปิดมากที่สุดตามไปด้วย{" "}
          <Link href="/map" className="text-seng underline underline-offset-4">
            ดูบนแผนที่
          </Link>
        </p>
      </section>
    </div>
  );
}
