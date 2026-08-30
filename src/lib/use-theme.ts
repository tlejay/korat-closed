"use client";

import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

/**
 * The site follows the OS rather than offering a switch.
 *
 * Returns null until the preference is known, so <Map> mounts once on the right
 * basemap instead of loading the light style and swapping to dark a tick later.
 */
export function useSystemTheme(): Theme | null {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    // Page colours come from a prefers-color-scheme block in globals.css; this
    // hook exists only to tell MapLibre which basemap to load.
    const apply = () => setTheme(query.matches ? "dark" : "light");
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  return theme;
}
