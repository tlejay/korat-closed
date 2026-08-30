import Link from "next/link";
import { NameWall } from "@/components/home/name-wall";
import {
  closures, newsClosures, dbdClosures, byYear, byTambon, byCategory,
  thaiDate, beYear, latestMonth,
} from "@/lib/data";
import { CATEGORIES } from "@/lib/categories";

export default function Home() {
  const years = byYear();
  const topTambons = byTambon().slice(0, 6);
  const storefront = byCategory().filter((c) => c.storefront);
  const storefrontTotal = storefront.reduce((n, c) => n + c.count, 0);
  const [lastYear, lastMonth] = latestMonth.split("-");

  return (
    <>
      {/* Hero — the list itself is the argument. */}
      <section className="mx-auto w-full max-w-[1400px] px-5 pt-12 pb-10">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          อำเภอเมืองนครราชสีมา · {beYear(years[0].year)}–{beYear(years.at(-1)!.year)}
        </p>

        <h1 className="mt-4 max-w-4xl font-display text-3xl leading-[1.4] sm:text-5xl">
          <span className="text-seng">{closures.length.toLocaleString("th-TH")}</span> ธุรกิจ
          <br className="hidden sm:block" /> ที่เคยอยู่ตรงนี้ แล้ววันหนึ่งก็ไม่อยู่แล้ว
        </h1>

        <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          ทุกชื่อข้างล่างนี้เคยเป็นร้าน เป็นโรงงาน เป็นที่ทำมาหากินของใครสักคนในเมืองโคราช
          รวบรวมจากข่าวที่รายงานการปิดตัว และทะเบียนเลิกกิจการของกรมพัฒนาธุรกิจการค้า
        </p>

        <div className="mt-9 border-t border-border pt-6">
          <NameWall names={closures.map((c) => ({ id: c.id, nameTh: c.nameTh }))} />
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/map"
            className="bg-seng px-5 py-2.5 text-sm text-white transition-opacity hover:opacity-90"
          >
            ดูบนแผนที่ →
          </Link>
          <Link
            href="/about"
            className="border border-border px-5 py-2.5 text-sm transition-colors hover:border-foreground"
          >
            ข้อมูลนี้มาจากไหน
          </Link>
        </div>
      </section>

      <div className="slats" aria-hidden />

      {/* What the two tiers actually mean — stated before any number is read. */}
      <section className="mx-auto w-full max-w-[1400px] px-5 py-12">
        <h2 className="font-display text-xl">ตัวเลขนี้ประกอบด้วยสองอย่าง</h2>
        <div className="mt-6 grid gap-px bg-border sm:grid-cols-2">
          <div className="bg-background p-6">
            <p className="font-mono text-3xl text-seng">{newsClosures.length}</p>
            <p className="mt-2 font-medium">ร้านที่มีข่าวรายงานว่าปิด</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              ร้านที่คนโคราชรู้จัก มีนักข่าวไปทำข่าววันปิด รู้ทั้งวันที่ ที่ตั้ง และเหตุผล
              — แต่มีอยู่น้อย เพราะร้านเล็กส่วนใหญ่ปิดเงียบ ไม่มีใครทำข่าว
            </p>
          </div>
          <div className="bg-background p-6">
            <p className="font-mono text-3xl text-steel">{dbdClosures.length.toLocaleString("th-TH")}</p>
            <p className="mt-2 font-medium">นิติบุคคลที่จดทะเบียนเลิกกิจการ</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              ข้อมูลราชการจากกรมพัฒนาธุรกิจการค้า ครบถ้วนและตรวจสอบได้
              แต่นับเฉพาะบริษัทกับห้างหุ้นส่วน ร้านที่ไม่ได้จดทะเบียนจะไม่อยู่ในนี้
              และการเลิกนิติบุคคลก็ไม่ได้แปลว่าหน้าร้านปิดเสมอไป
            </p>
          </div>
        </div>
      </section>

      {/* News tier — the shops people can picture. */}
      {newsClosures.length > 0 && (
        <section className="mx-auto w-full max-w-[1400px] px-5 pb-12">
          <h2 className="font-display text-xl">ร้านที่คนโคราชยังจำได้</h2>
          <ul className="mt-6 grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
            {newsClosures.map((c) => (
              <li key={c.id} className="bg-background">
                <Link href={`/business/${c.id}`} className="group block h-full p-6">
                  <p className="font-mono text-xs text-muted-foreground">{thaiDate(c.closedAt)}</p>
                  <p className="mt-2 font-display text-lg leading-snug group-hover:text-seng">
                    {c.nameTh}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {CATEGORIES[c.category as keyof typeof CATEGORIES].labelTh} · ต.{c.tambon}
                  </p>
                  {c.reason && (
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground line-clamp-3">
                      {c.reason}
                    </p>
                  )}
                </Link>
              </li>
            ))}
            {/* The hairline grid is drawn by the gap, so trailing empty cells
                would otherwise show as bare border-coloured blocks. */}
            {Array.from({ length: (3 - (newsClosures.length % 3)) % 3 }).map((_, i) => (
              <li key={`filler-${i}`} className="hidden bg-background lg:block" aria-hidden />
            ))}
          </ul>
        </section>
      )}

      <div className="slats" aria-hidden />

      {/* Two honest cuts of the data. */}
      <section className="mx-auto grid w-full max-w-[1400px] gap-10 px-5 py-12 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-xl">ปิดปีละเท่าไหร่</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            ปี {beYear(Number(lastYear))} นับถึงเดือน {Number(lastMonth)} เท่านั้น จึงยังเทียบกับปีเต็มไม่ได้
          </p>
          <ul className="mt-6 space-y-3">
            {years.map((y) => {
              const max = Math.max(...years.map((v) => v.count));
              return (
                <li key={y.year} className="flex items-center gap-4">
                  <span className="w-12 font-mono text-sm text-muted-foreground">{y.beYear}</span>
                  <span
                    className="h-5 bg-heat-4"
                    style={{ width: `${(y.count / max) * 100}%` }}
                  />
                  <span className="font-mono text-sm">{y.count}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <h2 className="font-display text-xl">ตำบลที่ปิดมากที่สุด</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            ตำบลในเมืองเป็นย่านการค้าเดิมของโคราช จึงมีทั้งธุรกิจมากที่สุดและปิดมากที่สุด
          </p>
          <ul className="mt-6 space-y-3">
            {topTambons.map((t) => (
              <li key={t.tambon} className="flex items-center gap-4">
                <span className="w-20 truncate text-sm text-muted-foreground">{t.tambon}</span>
                <span
                  className="h-5 bg-steel"
                  style={{ width: `${(t.count / topTambons[0].count) * 100}%` }}
                />
                <span className="font-mono text-sm">{t.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1400px] px-5 pb-16">
        <div className="border border-border bg-card p-6">
          <p className="text-sm leading-relaxed">
            ในจำนวนทั้งหมด มี{" "}
            <span className="font-mono text-seng">{storefrontTotal.toLocaleString("th-TH")}</span>{" "}
            รายที่เป็นธุรกิจแบบมีหน้าร้าน — ร้านอาหาร ร้านค้า ที่พัก คลินิก อู่รถ โรงเรียนกวดวิชา
            คือกลุ่มที่คนเดินผ่านแล้วเห็นว่าหายไป ที่เหลือเป็นบริษัทรับเหมา ค้าส่ง ขนส่ง
            และสำนักงาน ซึ่งปิดโดยไม่มีใครสังเกต{" "}
            <Link href="/map" className="text-seng underline underline-offset-4">
              กรองดูเฉพาะกลุ่มมีหน้าร้านบนแผนที่
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
