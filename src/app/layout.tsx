import type { Metadata } from "next";
import { Chonburi, IBM_Plex_Sans_Thai, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

// Chonburi is drawn after Thai vernacular shop lettering — the same hand that
// paints the signs this site is a record of. One weight only, so it stays loud
// exactly where we want it and nowhere else.
const chonburi = Chonburi({
  variable: "--font-chonburi",
  subsets: ["thai", "latin"],
  weight: "400",
  display: "swap",
});

const plexThai = IBM_Plex_Sans_Thai({
  variable: "--font-plex-thai",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const SITE = "https://korat-is-korat.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "ธุรกิจในโคราชที่ปิดตัวลง — แผนที่และบันทึก พ.ศ. 2566–2569",
    template: "%s · ธุรกิจในโคราชที่ปิดตัวลง",
  },
  description:
    "บันทึกธุรกิจในเขตอำเภอเมืองนครราชสีมาที่ปิดตัวลงระหว่างปี 2566–2569 รวบรวมจากข่าวและข้อมูลจดทะเบียนเลิกกิจการของกรมพัฒนาธุรกิจการค้า พร้อมแผนที่และ heatmap รายตำบล",
  keywords: ["โคราช", "นครราชสีมา", "ธุรกิจปิดตัว", "ร้านปิด", "เลิกกิจการ", "heatmap", "แผนที่"],
  openGraph: {
    type: "website",
    locale: "th_TH",
    url: SITE,
    siteName: "ธุรกิจในโคราชที่ปิดตัวลง",
    title: "ธุรกิจในโคราชที่ปิดตัวลง",
    description: "บันทึกธุรกิจในเขตอำเภอเมืองนครราชสีมาที่ปิดตัวลง พร้อมแผนที่และ heatmap รายตำบล",
  },
  robots: { index: true, follow: true },
};

const NAV = [
  { href: "/", label: "หน้าแรก" },
  { href: "/map", label: "แผนที่" },
  { href: "/insights", label: "ตัวเลข" },
  { href: "/about", label: "ที่มาข้อมูล" },
  { href: "/submit", label: "แจ้งร้านที่ปิด" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      className={`${chonburi.variable} ${plexThai.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="border-b border-border">
          <nav className="mx-auto flex w-full max-w-[1400px] flex-wrap items-baseline gap-x-6 gap-y-2 px-5 py-3">
            <Link href="/" className="font-display text-base text-seng">
              ธุรกิจในโคราชที่ปิดตัวลง
            </Link>
            <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
              {NAV.slice(1).map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="transition-colors hover:text-foreground focus-visible:text-foreground"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-border">
          <div className="mx-auto w-full max-w-[1400px] px-5 py-8 text-sm text-muted-foreground">
            <p className="max-w-2xl">
              ข้อมูลรวบรวมจากแหล่งเปิด — ข่าวที่เผยแพร่ต่อสาธารณะ และชุดข้อมูลนิติบุคคลจดทะเบียนเลิกกิจการ
              ของกรมพัฒนาธุรกิจการค้า ทุกรายการมีลิงก์ไปยังแหล่งที่มา หากพบข้อมูลคลาดเคลื่อน{" "}
              <Link href="/submit" className="text-seng underline underline-offset-4">
                แจ้งแก้ไขได้ที่นี่
              </Link>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
