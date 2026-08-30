"use client";

import { useState } from "react";
import { CATEGORIES } from "@/lib/categories";

const REPO = "https://github.com/tlejay/korat-closed";

/**
 * No backend: the form composes a prefilled GitHub issue. Reports land where
 * the data lives, and the review trail is public.
 */
export function SubmitForm() {
  const [f, setF] = useState({
    name: "", category: "", tambon: "", address: "", closedAt: "", reason: "", source: "", note: "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value });

  const ready = f.name.trim().length > 1 && f.source.trim().length > 4;

  const url =
    `${REPO}/issues/new?labels=closure-report&title=${encodeURIComponent(`[แจ้งร้านปิด] ${f.name}`)}` +
    `&body=${encodeURIComponent(
      [
        `**ชื่อร้าน/ธุรกิจ:** ${f.name}`,
        `**ประเภท:** ${f.category || "-"}`,
        `**ตำบล:** ${f.tambon || "-"}`,
        `**ที่อยู่ / จุดสังเกต:** ${f.address || "-"}`,
        `**ปิดเมื่อ:** ${f.closedAt || "-"}`,
        `**เหตุผลที่ทราบ:** ${f.reason || "-"}`,
        `**แหล่งอ้างอิง (ลิงก์ข่าว / โพสต์ / Google Maps):**`,
        f.source,
        "",
        `**อื่น ๆ:** ${f.note || "-"}`,
      ].join("\n"),
    )}`;

  const field = "w-full border border-border bg-card px-3 py-2 text-sm outline-none focus:border-seng";
  const label = "font-mono text-[11px] uppercase tracking-wider text-muted-foreground";

  return (
    <form className="mt-8 space-y-5" onSubmit={(e) => e.preventDefault()}>
      <div>
        <label className={label} htmlFor="name">ชื่อร้าน / ธุรกิจ *</label>
        <input id="name" className={`${field} mt-1.5`} value={f.name} onChange={set("name")} placeholder="เช่น ร้านก๋วยเตี๋ยวเจ๊หมวย" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="category">ประเภท</label>
          <select id="category" className={`${field} mt-1.5`} value={f.category} onChange={set("category")}>
            <option value="">— เลือก —</option>
            {Object.entries(CATEGORIES).map(([k, v]) => (
              <option key={k} value={v.labelTh}>{v.labelTh}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="closedAt">ปิดเมื่อไหร่</label>
          <input id="closedAt" className={`${field} mt-1.5`} value={f.closedAt} onChange={set("closedAt")} placeholder="เช่น มีนาคม 2568" />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="tambon">ตำบล</label>
          <input id="tambon" className={`${field} mt-1.5`} value={f.tambon} onChange={set("tambon")} placeholder="เช่น ในเมือง" />
        </div>
        <div>
          <label className={label} htmlFor="address">ที่อยู่ หรือจุดสังเกต</label>
          <input id="address" className={`${field} mt-1.5`} value={f.address} onChange={set("address")} placeholder="เช่น ถนนมิตรภาพ ตรงข้ามปั๊ม ปตท." />
        </div>
      </div>

      <div>
        <label className={label} htmlFor="source">แหล่งอ้างอิง *</label>
        <textarea id="source" rows={3} className={`${field} mt-1.5`} value={f.source} onChange={set("source")}
          placeholder="ลิงก์ข่าว โพสต์ Facebook หรือลิงก์ Google Maps ที่ขึ้นว่าปิดถาวร — ถ้าไม่มีลิงก์ ให้บอกว่ารู้มาจากไหน" />
        <p className="mt-1.5 text-xs text-muted-foreground">
          ต้องมีอย่างน้อยหนึ่งอย่างที่คนอื่นตามไปตรวจได้ รายการที่ไม่มีแหล่งอ้างอิงจะไม่ขึ้นเว็บ
        </p>
      </div>

      <div>
        <label className={label} htmlFor="reason">เหตุผลที่ปิด (ถ้าทราบ)</label>
        <input id="reason" className={`${field} mt-1.5`} value={f.reason} onChange={set("reason")} placeholder="เช่น หมดสัญญาเช่า" />
      </div>

      <div>
        <label className={label} htmlFor="note">อยากบอกอะไรเพิ่ม</label>
        <textarea id="note" rows={2} className={`${field} mt-1.5`} value={f.note} onChange={set("note")} />
      </div>

      <a
        href={ready ? url : undefined}
        target="_blank"
        rel="noopener noreferrer"
        aria-disabled={!ready}
        className={
          "inline-block px-5 py-2.5 text-sm transition-opacity " +
          (ready ? "bg-seng text-white hover:opacity-90" : "pointer-events-none bg-muted text-muted-foreground")
        }
      >
        ส่งเข้า GitHub →
      </a>
      {!ready && (
        <p className="text-xs text-muted-foreground">กรอกชื่อร้านและแหล่งอ้างอิงก่อนจึงจะส่งได้</p>
      )}
    </form>
  );
}
