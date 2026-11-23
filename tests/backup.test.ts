import { describe, expect, it } from "vitest";
import { createBackup, parseBackup } from "../src/lib/backup";

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
  it("rejects oversized backups", () => {
    expect(() => parseBackup(" ".repeat(20 * 1024 * 1024 + 1))).toThrow(/20 MB/);
  });
});
