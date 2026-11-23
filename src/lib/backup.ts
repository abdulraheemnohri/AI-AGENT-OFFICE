export type WorkspaceBackup = {
  schemaVersion: 1;
  app: "AI Agent Office";
  exportedAt: string;
  data: {
    document: { content: string; name: string };
    workbook: { name: string; cells: string[][] };
    slides: { title: string; body: string }[];
    tasks: { id: number; title: string; done: boolean }[];
    preferences: Record<string, unknown>;
    recovery: unknown;
  };
};

export function createBackup(data: WorkspaceBackup["data"], now = new Date()): WorkspaceBackup {
  return { schemaVersion: 1, app: "AI Agent Office", exportedAt: now.toISOString(), data };
}

export function parseBackup(raw: string): WorkspaceBackup {
  if (raw.length > 20 * 1024 * 1024) throw new Error("Backup exceeds the 20 MB import limit");
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object") throw new Error("Backup must be a JSON object");
  const value = parsed as Partial<WorkspaceBackup>;
  if (value.app !== "AI Agent Office" || value.schemaVersion !== 1 || !value.data) {
    throw new Error("Unsupported backup file or schema version");
  }
  const d = value.data as WorkspaceBackup["data"];
  if (!d.document || typeof d.document.content !== "string" || typeof d.document.name !== "string") throw new Error("Backup document section is invalid");
  if (!d.workbook || typeof d.workbook.name !== "string" || !Array.isArray(d.workbook.cells) || !d.workbook.cells.every(row => Array.isArray(row) && row.every(cell => typeof cell === "string"))) throw new Error("Backup workbook section is invalid");
  if (!Array.isArray(d.slides) || !d.slides.every(s => s && typeof s.title === "string" && typeof s.body === "string")) throw new Error("Backup slides section is invalid");
  if (!Array.isArray(d.tasks) || !d.tasks.every(t => t && typeof t.id === "number" && typeof t.title === "string" && typeof t.done === "boolean")) throw new Error("Backup tasks section is invalid");
  if (!d.preferences || typeof d.preferences !== "object") throw new Error("Backup preferences section is invalid");
  return value as WorkspaceBackup;
}
