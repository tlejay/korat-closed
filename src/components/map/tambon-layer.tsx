"use client";

import { useEffect, useId, useMemo } from "react";
import type { GeoJSONSource, MapLayerMouseEvent } from "maplibre-gl";
import { useMap } from "@/components/ui/map";
import { rampFor, BOUNDARY_COLOR, LABEL_STYLE } from "@/lib/heat";
import type { Theme } from "@/lib/use-theme";

/**
 * Subdistrict choropleth.
 *
 * Three quarters of the DBD addresses resolve no further than their ตำบล, so
 * drawing them as dots would invent precision that isn't in the data. Shading
 * the whole subdistrict is the honest rendering of "somewhere in here".
 */
export function TambonLayer({
  boundaries,
  counts,
  visible,
  theme,
  onSelect,
}: {
  boundaries: GeoJSON.FeatureCollection | null;
  counts: Map<string, number>;
  visible: boolean;
  theme: Theme;
  onSelect?: (tambon: string) => void;
}) {
  const STEPS = rampFor(theme);
  const { map, isLoaded } = useMap();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const sourceId = `tambon-src-${uid}`;
  const fillId = `tambon-fill-${uid}`;
  const lineId = `tambon-line-${uid}`;
  const labelId = `tambon-label-${uid}`;

  // Quantile breaks, not equal intervals. ตำบลในเมือง has roughly four times
  // the closures of the next subdistrict, so splitting the range evenly would
  // paint it hot and flatten all 23 others into the bottom colour. Quantiles
  // keep the middle of the city legible, and they re-derive under every filter.
  const { data, breaks } = useMemo(() => {
    if (!boundaries) return { data: null, breaks: [1, 2, 3, 4] };
    const features = boundaries.features.map((f) => ({
      ...f,
      properties: {
        ...f.properties,
        count: counts.get(String(f.properties?.tambon)) ?? 0,
      },
    }));
    const values = features
      .map((f) => Number(f.properties.count))
      .filter((n) => n > 0)
      .sort((a, b) => a - b);
    const quantile = (q: number) =>
      values.length ? values[Math.min(values.length - 1, Math.floor(values.length * q))] : 1;
    // Strictly increasing, so MapLibre's `step` expression stays valid even when
    // a filter leaves only a handful of subdistricts with any closures at all.
    const raw = [quantile(0.25), quantile(0.5), quantile(0.75), quantile(0.9)];
    const b = raw.reduce<number[]>((acc, v) => [...acc, Math.max(v, (acc.at(-1) ?? 0) + 1)], []);
    return { data: { type: "FeatureCollection" as const, features }, breaks: b };
  }, [boundaries, counts]);

  useEffect(() => {
    if (!map || !isLoaded || !data) return;
    if (map.getSource(sourceId)) return;

    map.addSource(sourceId, { type: "geojson", data });
    map.addLayer({
      id: fillId,
      type: "fill",
      source: sourceId,
      paint: { "fill-color": STEPS[0], "fill-opacity": 0.6 },
    });
    map.addLayer({
      id: lineId,
      type: "line",
      source: sourceId,
      paint: { "line-color": BOUNDARY_COLOR[theme], "line-width": 0.6, "line-opacity": 0.45 },
    });
    map.addLayer({
      id: labelId,
      type: "symbol",
      source: sourceId,
      layout: {
        "text-field": ["concat", ["get", "tambon"], "  ", ["to-string", ["get", "count"]]],
        "text-size": 11,
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": LABEL_STYLE[theme].color,
        "text-halo-color": LABEL_STYLE[theme].halo,
        "text-halo-width": 1.4,
      },
    });

    const click = (e: MapLayerMouseEvent) => {
      const t = e.features?.[0]?.properties?.tambon;
      if (t) onSelect?.(String(t));
    };
    const enter = () => (map.getCanvas().style.cursor = "pointer");
    const leave = () => (map.getCanvas().style.cursor = "");
    map.on("click", fillId, click);
    map.on("mouseenter", fillId, enter);
    map.on("mouseleave", fillId, leave);

    return () => {
      map.off("click", fillId, click);
      map.off("mouseenter", fillId, enter);
      map.off("mouseleave", fillId, leave);
      for (const id of [labelId, lineId, fillId]) if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [map, isLoaded, Boolean(data), theme]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!map || !isLoaded || !data || !map.getLayer(fillId)) return;
    (map.getSource(sourceId) as GeoJSONSource | undefined)?.setData(data);
    map.setPaintProperty(fillId, "fill-color", [
      "step", ["get", "count"],
      "rgba(0,0,0,0.04)",
      1, STEPS[0],
      breaks[0], STEPS[1],
      breaks[1], STEPS[2],
      breaks[2], STEPS[3],
      breaks[3], STEPS[4],
    ]);
  }, [map, isLoaded, data, breaks, sourceId, fillId, STEPS]);

  useEffect(() => {
    if (!map || !isLoaded) return;
    for (const id of [fillId, lineId, labelId]) {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
    }
  }, [map, isLoaded, visible, fillId, lineId, labelId]);

  return null;
}
