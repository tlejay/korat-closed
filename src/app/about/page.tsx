import type { Metadata } from "next";
import Link from "next/link";
import excluded from "@/../data/excluded.json";
import { closures, newsClosures, dbdClosures, latestMonth, beYear } from "@/lib/data";

export const metadata: Metadata = {
  title: "ที่มาข้อมูล",
  description: "วิธีรวบรวมข้อมูล แหล่งที่มา และข้อจำกัดของชุดข้อมูลธุรกิจที่ปิดตัวในเมืองโคราช",
};

const accuracy = closures.reduce<Record<string, number>>(
  (a, c) => ({ ...a, [c.geoAccuracy]: (a[c.geoAccuracy] ?? 0) + 1 }),
  {},
);

export default function AboutPage() {
  const [y, m] = latestMonth.split("-");
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-12 [&_h2]:font-display [&_h2]:text-xl [&_p]:leading-relaxed">
      <h1 className="font-display text-3xl">ข้อมูลนี้มาจากไหน</h1>
      <p className="mt-4 text-[15px] text-muted-foreground">
        เว็บนี้เอ่ยชื่อธุรกิจจริงว่าปิดตัวลง ถ้าผิดก็ทำให้เจ้าของเสียหายได้จริง
        หน้านี้จึงบอกให้หมดว่าตัวเลขมาจากไหน เชื่อได้แค่ไหน และตรงไหนที่ยังไม่ควรเชื่อ
      </p>

      <section className="mt-10 space-y-3">
        <h2>สองแหล่ง</h2>
        <p className="text-[15px]">
          <strong>1. ข่าว ({newsClosures.length} ราย)</strong> — ค้นจากสำนักข่าวที่รายงานการปิดตัวของ
          ร้านในโคราช เช่น มติชน ไทยรัฐ ข่าวสด เดลินิวส์ กะปุก และสื่อท้องถิ่นอย่าง Korat Times
          ทุกรายการมีลิงก์ข่าวที่กดเข้าไปอ่านได้ กลุ่มนี้แม่นที่สุดแต่มีน้อยมาก
          เพราะร้านเล็กส่วนใหญ่ปิดโดยไม่มีใครทำข่าว
        </p>
        <p className="text-[15px]">
          <strong>2. ทะเบียนเลิกกิจการ ({dbdClosures.length.toLocaleString("th-TH")} ราย)</strong> —
          ชุดข้อมูลเปิด “นิติบุคคลจดทะเบียนเลิกกิจการ” รายเดือนของกรมพัฒนาธุรกิจการค้า
          เราดึงมา {(Number(y) - 2023) * 12 + Number(m)} เดือน (ม.ค. 2566 – {Number(m)}/{beYear(Number(y))}) แล้วกรองเฉพาะ
          อำเภอเมืองนครราชสีมา
        </p>
        <p className="text-sm text-muted-foreground">
          <a
            href="https://opendata.dbd.go.th/dataset/dataset_11_02"
            target="_blank"
            rel="noopener noreferrer"
            className="text-seng underline underline-offset-4"
          >
            ดูชุดข้อมูลต้นทางของ DBD
          </a>{" "}
          · สัญญาอนุญาต Open Data Common
        </p>
      </section>

      <section className="mt-10 space-y-3">
        <h2>ข้อจำกัดที่ต้องรู้ก่อนอ่านตัวเลข</h2>
        <ul className="space-y-3 text-[15px]">
          <li className="border-l-2 border-border pl-4">
            <strong>จดทะเบียนเลิก ≠ ร้านปิด</strong> — บริษัทอาจเลิกนิติบุคคลเพราะปรับโครงสร้าง
            ย้ายชื่อ หรือควบรวม โดยที่หน้าร้านยังเปิดอยู่ ในทางกลับกันร้านที่ปิดจริง
            บางรายก็ไม่เคยจดทะเบียนเลิก
          </li>
          <li className="border-l-2 border-border pl-4">
            <strong>ร้านที่ไม่ได้จดนิติบุคคลไม่อยู่ในนี้เลย</strong> — ร้านก๋วยเตี๋ยว รถเข็น
            ร้านตัดผม ที่เปิดในนามบุคคลธรรมดา ซึ่งเป็นธุรกิจส่วนใหญ่ของเมือง ไม่ปรากฏในทะเบียนนี้
          </li>
          <li className="border-l-2 border-border pl-4">
            <strong>ที่อยู่คือที่ตั้งสำนักงานใหญ่ที่จดทะเบียน</strong> — บางครั้งเป็นบ้านเจ้าของ
            หรือสำนักงานบัญชี ไม่ใช่ตำแหน่งหน้าร้านจริง
          </li>
          <li className="border-l-2 border-border pl-4">
            <strong>ความแม่นของพิกัด</strong> — ระบุถึงระดับซอย {accuracy.exact ?? 0} ราย,
            ระดับถนน {accuracy.road ?? 0} ราย, รู้แค่ตำบล {accuracy.zone ?? 0} ราย
            เพราะที่อยู่ในทะเบียนส่วนใหญ่เขียนแค่ “หมู่ที่ N”
            ด้วยเหตุนี้มุมมอง heatmap จึงใช้เฉพาะรายที่รู้พิกัดระดับถนนขึ้นไป
            ส่วนมุมมองรายตำบลใช้ข้อมูลได้ครบทุกราย
          </li>
        </ul>
      </section>

      <section className="mt-10 space-y-3">
        <h2>สิ่งที่เราลองแล้วแต่ใช้ไม่ได้</h2>
        <p className="text-[15px]">
          <strong>Google Maps</strong> — Places API ตัดสถานที่ที่ปิดถาวรออกจากผลค้นหาโดยอัตโนมัติ
          และไม่มีตัวเลือกให้เปิด จึงใช้ “ไล่หาร้านที่ปิดในพื้นที่” ไม่ได้ ทำได้แค่ตรวจสถานะของร้านที่รู้จักอยู่แล้ว
        </p>
        <p className="text-[15px]">
          <strong>OpenStreetMap</strong> — มีแท็ก <code className="font-mono text-xs">disused:shop</code>{" "}
          สำหรับร้านที่เลิกกิจการ แต่แทบไม่มีใครในไทยกลับไปแก้แท็กให้ ข้อมูลจึงบางเกินใช้
        </p>
      </section>

      {excluded.length > 0 && (
        <section className="mt-10 space-y-3">
          <h2>รายการที่ตัดออก</h2>
          <p className="text-[15px] text-muted-foreground">
            ระหว่างรวบรวม เราเจอรายการที่ดูเหมือนเข้าข่ายแต่ตัดสินใจไม่ใส่ บันทึกไว้ตรงนี้
            เพื่อให้เห็นว่าใช้เกณฑ์อะไร
          </p>
          <ul className="space-y-3">
            {excluded.map((e) => (
              <li key={e.id} className="border border-border bg-card p-4 text-sm">
                <p className="font-medium">{e.nameTh}</p>
                <p className="mt-1 leading-relaxed text-muted-foreground">{e.reason}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10 space-y-3">
        <h2>เจอข้อมูลผิด หรือรู้ร้านที่ยังไม่มีในนี้</h2>
        <p className="text-[15px]">
          ข้อมูลชุดนี้ยังไม่ครบ และบางรายการอาจผิด{" "}
          <Link href="/submit" className="text-seng underline underline-offset-4">
            แจ้งเพิ่มหรือแจ้งแก้ไขได้ที่นี่
          </Link>{" "}
          ทุกเรื่องที่แจ้งเข้ามาจะถูกตรวจกับแหล่งอ้างอิงก่อนขึ้นเว็บ
        </p>
      </section>
    </div>
  );
}
