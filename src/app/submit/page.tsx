import type { Metadata } from "next";
import { SubmitForm } from "@/components/submit-form";

export const metadata: Metadata = {
  title: "แจ้งร้านที่ปิด",
  description: "แจ้งเพิ่มหรือแจ้งแก้ไขข้อมูลธุรกิจที่ปิดตัวลงในเมืองโคราช",
};

export default function SubmitPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-12">
      <h1 className="font-display text-3xl">แจ้งร้านที่ปิด</h1>
      <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
        รู้จักร้านที่ปิดไปแล้วแต่ยังไม่มีในนี้ หรือเจอรายการที่ผิด — กรอกแล้วกดส่ง
        ระบบจะเปิดหน้า GitHub พร้อมข้อความที่กรอกไว้ให้ กด Submit อีกครั้งเป็นอันเสร็จ
        (ต้องมีบัญชี GitHub)
      </p>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        ทุกเรื่องที่แจ้งเข้ามาจะถูกตรวจกับแหล่งอ้างอิงก่อน ถ้าตรวจแล้วยืนยันไม่ได้ เราจะไม่ใส่ลงเว็บ
        และจะตอบกลับในเธรดว่าติดตรงไหน
      </p>
      <SubmitForm />
    </div>
  );
}
