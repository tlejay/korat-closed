import type { Theme } from "./use-theme";

/**
 * The heat ramp, cool → hot, in one place.
 *
 * MapLibre paint properties take literal colours, not CSS variables, so the
 * ramp has to exist in JS as well as in globals.css. Keeping map fills, the
 * heatmap and the legend on this single array is what stops the legend from
 * describing colours the map isn't using.
 *
 * Both ramps run cool → hot in one direction only, so a reader never has to
 * ask which of two colours means "more". On the pale basemap that means
 * getting darker (sand → deep ember); on the dark basemap it means getting
 * brighter and moving red → gold, the way heated metal does.
 */
export const HEAT_RAMP: Record<Theme, [string, string, string, string, string]> = {
  light: ["#ded9c4", "#e6c877", "#dd9a3d", "#c9642c", "#8d2118"],
  dark: ["#3a2f26", "#7a2a1c", "#b4491f", "#dd8a2a", "#f5cf6a"],
};

export const rampFor = (theme: Theme | null) => HEAT_RAMP[theme ?? "light"];

/** Outline colour for subdistrict boundaries, tuned per basemap. */
export const BOUNDARY_COLOR: Record<Theme, string> = {
  light: "#8d2118",
  dark: "#f2b23c",
};

/** Subdistrict label colour and halo, tuned per basemap. */
export const LABEL_STYLE: Record<Theme, { color: string; halo: string }> = {
  light: { color: "#211e19", halo: "rgba(246,245,241,0.9)" },
  dark: { color: "#ede9e0", halo: "rgba(23,21,15,0.85)" },
};

/** Cluster bubble fills (small, medium, large) — the hot end of the ramp. */
export const clusterColorsFor = (theme: Theme | null): [string, string, string] => {
  const ramp = rampFor(theme);
  return [ramp[2], ramp[3], ramp[4]];
};

/** Single unclustered pin: the site's accent, matched to the basemap. */
export const PIN_COLOR: Record<Theme, string> = {
  light: "#c9372a",
  dark: "#e8574a",
};
