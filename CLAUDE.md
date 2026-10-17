# CLAUDE.md — ธุรกิจในโคราชที่ปิดตัวลง (korat-closed)

เว็บรวมธุรกิจในเขตอำเภอเมืองนครราชสีมาที่ปิดตัวลง พ.ศ. 2566–2569 + แผนที่ + heatmap
Deploy: `korat-is-korat.vercel.app` · repo **public** `github.com/tlejay/korat-closed`

## กฎเหล็กของโปรเจคนี้

เว็บนี้เอ่ยชื่อธุรกิจจริงว่า "ปิดแล้ว" ถ้าผิดคือทำให้เจ้าของเสียหายจริง

1. **ทุกรายการต้องมี `sources` อย่างน้อย 1 URL ที่เปิดได้** — `scripts/build-data.ts` ตรวจด้วย zod
   และ `pnpm build` จะ fail ถ้าไม่ผ่าน อย่าปิด validation เพื่อให้ build ผ่าน
2. **ห้ามแต่งชื่อร้าน วันที่ หรือพิกัด เพื่อให้ครบจำนวน** — ถ้าค้นแล้วไม่เจอ ให้รายงานตัวเลขจริง
3. `tier` (news / dbd) และ `geoAccuracy` (exact / road / zone) ต้องแสดงบนหน้าเว็บเสมอ
   ห้ามซ่อนความไม่แน่นอนของข้อมูล
4. รายการที่พิจารณาแล้ว **ไม่รับ** ให้บันทึกเหตุผลลง `data/excluded.json` เพื่อให้เกณฑ์ตรวจสอบได้

## ท่อข้อมูล

```
pnpm data:fetch    scripts/fetch-dbd.ts       DBD CSV ตั้งแต่ ม.ค. 2566 → data/raw/dbd-korat-raw.json
pnpm data:geocode  scripts/geocode.ts         Nominatim → data/raw/dbd-mueang-geocoded.json
pnpm data:tambons  scripts/fetch-tambons.ts   ขอบเขตตำบล → data/raw/korat-tambons.geojson
pnpm data:build    scripts/build-data.ts      รวม + validate → src/data/closures.json
                                                             + public/data/tambons.geojson
```

`pnpm data:all` รันครบทั้งสี่ · `prebuild` เรียก `data:build` ให้อัตโนมัติ

### กับดักของข้อมูล DBD ที่แก้ไปแล้ว — อย่าถอยกลับ

- **CSV มี 2 สคีมา** บางเดือนมีคอลัมน์ `เดือน,ปี` นำหน้า → `fetch-dbd.ts` อ่านคอลัมน์**ตามชื่อหัวตาราง** ห้ามอ่านตามตำแหน่ง
- **วันที่มี 6 รูปแบบ** รวมทั้ง `YYYY-DD-MM` ที่สลับวัน/เดือน และ Excel serial ที่นับปีเป็น พ.ศ.
  → `build-data.ts` สร้างทุกการตีความแล้วเลือกอันที่ตรงกับ**เดือนของไฟล์ต้นทาง** ห้ามกลับไป parse ตรง ๆ
  (ก่อนแก้ มีรายการวันปิดเป็น ธ.ค. 2569 ซึ่งเป็นอนาคต)
- **DBD สลับ URL เดือน มิ.ย. 2569** dataset "เลิกกิจการ" ชี้ไปไฟล์ "ตั้งใหม่" → มี `URL_OVERRIDES` ใน `fetch-dbd.ts`
- **ชุดขอบเขตตำบลขาด ต.ในเมือง กับ ต.บ้านใหม่** → เติม ต.ในเมือง จาก OSM (ต้องกรอง `category === "boundary"`
  ไม่งั้นได้สถานีรถไฟ) ส่วน ต.บ้านใหม่ OSM ไม่มี polygon จึงไม่มีในภาพระบายสี

## แผนที่

- `src/components/ui/map.tsx` = **mapcn ที่ vendor มา** (`pnpm dlx shadcn@latest add @mapcn/map`)
  อย่าแก้ด้วยมือ — ถูก ignore ใน eslint ไว้แล้ว ถ้าจะอัปเกรดให้ add ทับ
- ชุดสี heatmap อยู่ที่ `src/lib/heat.ts` **ที่เดียว** — แผนที่ ระบายสีตำบล คลัสเตอร์ และคำอธิบายสี
  ต้องอ่านจากไฟล์นี้ทั้งหมด (เคยพลาดมาแล้ว: แผนที่ใช้ชุดสีสว่างขณะที่คำอธิบายใช้ชุดมืด)
- ระบายสีตำบลใช้ **ควอนไทล์** ไม่ใช่ช่วงเท่ากัน เพราะ ต.ในเมือง (360) มากกว่าอันดับสองราว 4 เท่า
  ถ้าแบ่งช่วงเท่ากันตำบลอื่นจะกลืนเป็นสีเดียวหมด
- heatmap **ตัดรายการที่รู้แค่ระดับตำบลออก** เพราะหลายร้อยจุดซ้อนบนจุดกึ่งกลางตำบลจะสร้างจุดร้อนปลอม
  ส่วนภาพระบายสีรายตำบลใช้ข้อมูลครบทุกราย

## ⚠️ การทดสอบแผนที่ในเบราว์เซอร์อัตโนมัติ

แท็บที่ claude-in-chrome เปิดมี `document.visibilityState === "hidden"` → `requestAnimationFrame`
ไม่ทำงาน → **MapLibre ไม่ render และไม่ขอไทล์เลย** แผนที่จะค้างที่ตัวโหลดตลอดทั้งที่โค้ดถูกต้อง

อย่าไปไล่แก้โค้ดแผนที่จากอาการนี้ (เคยเสียเวลาไปกับการเปลี่ยนเวอร์ชัน MapLibre และ self-host worker
ทั้งที่ไม่ใช่สาเหตุ) วิธีตรวจคือหา instance ผ่าน React fiber แล้วเรียก `map.redraw()` เอง:

```js
const el = document.querySelector('.maplibregl-map');
const key = Object.keys(el).find(k => k.startsWith('__reactFiber$'));
// เดินขึ้น fiber หา object ที่มี getStyle + redraw แล้วเรียก redraw() ซ้ำ ๆ
```

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui · mapcn (MapLibre GL) · zod · pnpm
ไม่มี DB ไม่มี API route — static ทั้งหมด ข้อมูลใหม่เข้าทาง GitHub issue แล้ว commit เอง

## ดีไซน์

โทน memorial — ชุดสีมาจากป้าย "เซ้งร้าน" แดงบนเหลืองที่แปะหน้าร้านปิด
`--seng` (แดง) ใช้เป็นสีเน้นที่เดียว · `--banner` · `--steel` (ประตูม้วน)
ตัวอักษร: Chonburi (หัวเรื่อง ล้อป้ายร้านไทย) · IBM Plex Sans Thai (เนื้อหา) · IBM Plex Mono (ตัวเลข/วันที่)
ธีมตามระบบด้วย `prefers-color-scheme` ไม่มีปุ่มสลับ

Hero คือ **กำแพงชื่อร้านจริงทั้ง 954 ชื่อ** ไม่ใช่ตัวเลขใหญ่ ๆ — ความหมายอยู่ที่ปริมาณของชื่อ
