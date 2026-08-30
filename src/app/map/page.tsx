import type { Metadata } from "next";
import { MapExplorer } from "@/components/map/map-explorer";
import { closures } from "@/lib/data";

export const metadata: Metadata = {
  title: "แผนที่",
  description:
    "แผนที่และ heatmap ธุรกิจที่ปิดตัวลงในเขตอำเภอเมืองนครราชสีมา กรองตามปี ประเภทธุรกิจ และตำบลได้",
};

export default function MapPage() {
  return <MapExplorer closures={closures} />;
}
