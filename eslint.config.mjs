import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored from the mapcn registry (`shadcn add @mapcn/map`). It gets
    // re-added wholesale on upgrade, so we don't hand-fix its lint findings.
    "src/components/ui/map.tsx",
  ]),
]);

export default eslintConfig;
