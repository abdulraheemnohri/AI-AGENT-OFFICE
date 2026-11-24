export type WorkbookChartKind = "bar" | "line" | "pie";

export type WorkbookChart = {
  id: string;
  title: string;
  kind: WorkbookChartKind;
  categoryColumn: number;
  valueColumns: number[];
  hasHeader: boolean;
};

export type WorkbookChartDatum = { name: string; [key: string]: string | number | null };

/** Keep only small, safe chart definitions from persisted or imported workspace data. */
export function sanitizeWorkbookCharts(value: unknown): Record<string, WorkbookChart[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: Record<string, WorkbookChart[]> = {};
  for (const [sheetKey, rawCharts] of Object.entries(value as Record<string, unknown>)) {
    if (!/^(0|[1-9]\\d{0,2})$/.test(sheetKey) || !Array.isArray(rawCharts)) continue;
    const charts: WorkbookChart[] = [];
    for (const raw of rawCharts.slice(0, 30)) {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
      const item = raw as Record<string, unknown>;
      if (typeof item.id !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(item.id)) continue;
      if (item.kind !== "bar" && item.kind !== "line" && item.kind !== "pie") continue;
      if (!Number.isInteger(item.categoryColumn) || (item.categoryColumn as number) < 0 || (item.categoryColumn as number) > 999) continue;
      if (!Array.isArray(item.valueColumns)) continue;
      const valueColumns = [...new Set(item.valueColumns.filter((column): column is number => Number.isInteger(column) && column >= 0 && column <= 999))].slice(0, 20);
      if (!valueColumns.length) continue;
      charts.push({
        id: item.id,
        title: typeof item.title === "string" ? item.title.trim().slice(0, 120) || "Untitled chart" : "Untitled chart",
        kind: item.kind,
        categoryColumn: item.categoryColumn as number,
        valueColumns: item.kind === "pie" ? valueColumns.slice(0, 1) : valueColumns,
        hasHeader: item.hasHeader !== false
      });
    }
    if (charts.length) result[sheetKey] = charts;
  }
  return result;
}

/** Build chart rows from calculated workbook values; formula results are plotted without mutating cells. */
export function buildWorkbookChartData(
  workbook: string[][],
  calculated: (string | number)[][],
  chart: WorkbookChart
): WorkbookChartDatum[] {
  const start = chart.hasHeader ? 1 : 0;
  return workbook.slice(start).map((row, offset) => {
    const source = calculated[start + offset] || row;
    const rawLabel = source[chart.categoryColumn] ?? row[chart.categoryColumn] ?? "";
    const datum: WorkbookChartDatum = { name: String(rawLabel || "Row " + (start + offset + 1)) };
    for (const column of chart.valueColumns) {
      const value = source[column] ?? row[column] ?? "";
      const numeric = typeof value === "number" ? value : value === "" ? null : Number(value);
      datum["series" + column] = numeric !== null && Number.isFinite(numeric) ? numeric : null;
    }
    return datum;
  }).filter(item => chart.valueColumns.some(column => typeof item["series" + column] === "number"));
}
