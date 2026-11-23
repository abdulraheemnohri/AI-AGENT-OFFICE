import { describe, expect, it } from "vitest";
import { createBackup, parseBackup, encryptBackupText, decryptBackupText } from "../src/lib/backup";

const data = {
  document: { content: "Hello", name: "notes.md" },
  workbook: { name: "Budget", cells: [["A", "1"]] },
  slides: [{ title: "Intro", body: "Welcome" }],
  tasks: [{ id: 1, title: "Review", done: false }],
  preferences: { theme: "dark" },
  recovery: null
};

describe("workspace backup", () => {
  it("creates a versioned backup and parses it", () => {
    const backup = createBackup(data, new Date("2026-01-01T00:00:00.000Z"));
    expect(parseBackup(JSON.stringify(backup)).data).toEqual(data);
    expect(backup.schemaVersion).toBe(1);
  });
  it("rejects unknown versions and malformed sections", () => {
    expect(() => parseBackup(JSON.stringify({ ...createBackup(data), schemaVersion: 9 }))).toThrow(/Unsupported/);
    expect(() => parseBackup(JSON.stringify({ ...createBackup(data), data: { ...data, workbook: { name: "bad", cells: [1] } } }))).toThrow(/workbook/);
  });
  it("round-trips multiple worksheets and rejects malformed sheet collections", () => {
    const backup = createBackup({ ...data, workbook: { ...data.workbook, sheets: [{ name: "Budget", cells: [["A", "1"]] }, { name: "Forecast", cells: [["B", "2"]] }] } });
    expect(parseBackup(JSON.stringify(backup)).data.workbook.sheets).toHaveLength(2);
    const invalid = { ...backup, data: { ...backup.data, workbook: { ...backup.data.workbook, sheets: [{ name: "Bad", cells: [1] }] } } };
    expect(() => parseBackup(JSON.stringify(invalid))).toThrow(/worksheets/);
  });

  it("round-trips a small PDF payload and rejects invalid PDF backup data", () => {
    const backup = createBackup({ ...data, pdf: { name: "sample.pdf", base64: "JVBERi0=" } });
    expect(parseBackup(JSON.stringify(backup)).data.pdf).toEqual({ name: "sample.pdf", base64: "JVBERi0=" });
    const invalid = { ...backup, data: { ...backup.data, pdf: { name: "bad.pdf", base64: "not base64!" } } };
    expect(() => parseBackup(JSON.stringify(invalid))).toThrow(/PDF section/);
  });

  it("encrypts and decrypts backups with authenticated AES-GCM", async () => {
    const raw = JSON.stringify(createBackup(data));
    const encrypted = await encryptBackupText(raw, "correct horse battery");
    expect(encrypted).not.toContain("Hello");
    expect(await decryptBackupText(encrypted, "correct horse battery")).toBe(raw);
    await expect(decryptBackupText(encrypted, "wrong password")).rejects.toThrow(/incorrect|modified/);
  });

  it("rejects weak passwords and invalid encrypted backup envelopes", async () => {
    await expect(encryptBackupText("{}", "short")).rejects.toThrow(/10 and 1024/);
    await expect(decryptBackupText('{"format":"unknown"}', "password")).rejects.toThrow(/Unsupported/);
  });

  it("rejects oversized backups", () => {
    expect(() => parseBackup(" ".repeat(20 * 1024 * 1024 + 1))).toThrow(/20 MB/);
  });
});
