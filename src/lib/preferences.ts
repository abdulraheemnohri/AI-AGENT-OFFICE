export type PreferenceDefaults = {
  offline: boolean;
  theme: "dark" | "light" | "system";
  autosave: boolean;
  autosaveDelay: number;
  fontSize: number;
  confirmOverwrite: boolean;
  telemetry: boolean;
  confirmRestore: boolean;
  defaultFormat: string;
  printPaper: "A4" | "Letter";
  printOrientation: "portrait" | "landscape";
  printMargins: number;
  csvDelimiter: "," | ";" | "\\t";
  spellCheck: boolean;
  spellLanguage: "en" | "ur";
  density: "comfortable" | "compact";
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Validate persisted or imported preferences before they reach React state. */
export function sanitizePreferences(
  defaults: PreferenceDefaults,
  input: unknown
): PreferenceDefaults {
  const raw = isRecord(input) ? input : {};
  const pick = <T extends string>(key: string, fallback: T, allowed: readonly T[]): T =>
    typeof raw[key] === "string" && allowed.includes(raw[key] as T) ? raw[key] as T : fallback;
  const bool = (key: string, fallback: boolean) =>
    typeof raw[key] === "boolean" ? raw[key] as boolean : fallback;
  const number = (key: string, fallback: number, min: number, max: number) => {
    const value = raw[key];
    return typeof value === "number" && Number.isFinite(value)
      ? Math.min(max, Math.max(min, value))
      : fallback;
  };
  const format = raw.defaultFormat;
  return {
    offline: bool("offline", defaults.offline),
    theme: pick("theme", defaults.theme, ["dark", "light", "system"]),
    autosave: bool("autosave", defaults.autosave),
    autosaveDelay: number("autosaveDelay", defaults.autosaveDelay, 500, 5000),
    fontSize: number("fontSize", defaults.fontSize, 12, 24),
    confirmOverwrite: bool("confirmOverwrite", defaults.confirmOverwrite),
    telemetry: bool("telemetry", defaults.telemetry),
    confirmRestore: bool("confirmRestore", defaults.confirmRestore),
    defaultFormat: format === "Plain text (.txt)" ? format : "Markdown (.md)",
    printPaper: pick("printPaper", defaults.printPaper, ["A4", "Letter"]),
    printOrientation: pick("printOrientation", defaults.printOrientation, ["portrait", "landscape"]),
    printMargins: number("printMargins", defaults.printMargins, 10, 20),
    csvDelimiter: pick("csvDelimiter", defaults.csvDelimiter, [",", ";", "\\t"]),
    spellCheck: bool("spellCheck", defaults.spellCheck),
    spellLanguage: pick("spellLanguage", defaults.spellLanguage, ["en", "ur"]),
    density: pick("density", defaults.density, ["comfortable", "compact"])
  };
}
