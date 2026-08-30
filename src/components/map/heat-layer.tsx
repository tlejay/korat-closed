"use client";

import { useEffect, useId } from "react";
import type { GeoJSONSource } from "maplibre-gl";
import { useMap } from "@/components/ui/map";
import { rampFor } from "@/lib/heat";
import type { Theme } from "@/lib/use-theme";

/**
 * MapLibre heatmap driven by a FeatureCollection we own, so it re-renders the
 * instant a filter changes instead of refetching a static file.
 *
 * The ramp is the site's heat scale rather than the usual blue-to-red: this is
 * a map about small businesses, not weather.
 */
export function HeatLayer({
  data,
  visible,
  theme,
}: {
  data: GeoJSON.FeatureCollection<GeoJSON.Point>;
  visible: boolean;
  theme: Theme;
}) {
  const RAMP = rampFor(theme);
  const { map, isLoaded } = useMap();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const sourceId = `heat-src-${uid}`;
  const layerId = `heat-lyr-${uid}`;

  useEffect(() => {
    if (!map || !isLoaded) return;

    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, { type: "geojson", data });
    }
    if (!map.getLayer(layerId)) {
      map.addLayer({
        id: layerId,
        type: "heatmap",
        source: sourceId,
        maxzoom: 16,
        paint: {
          "heatmap-weight": 1,
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 9, 0.7, 15, 2.2],
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0, "rgba(0,0,0,0)",
            0.15, RAMP[0],
            0.35, RAMP[1],
            0.55, RAMP[2],
            0.78, RAMP[3],
            1, RAMP[4],
          ],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 9, 14, 13, 26, 16, 46],
          "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 13, 0.85, 16, 0.35],
        },
      });
    }

    return () => {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [map, isLoaded, sourceId, layerId, theme]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!map || !isLoaded) return;
    const source = map.getSource(sourceId) as GeoJSONSource | undefined;
    source?.setData(data);
  }, [map, isLoaded, data, sourceId]);

  useEffect(() => {
    if (!map || !isLoaded || !map.getLayer(layerId)) return;
    map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
  }, [map, isLoaded, visible, layerId]);

  return null;
}
