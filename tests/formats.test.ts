import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { exportDocx, exportPptx, exportXlsx, extractPdfPages, importDocx, importXlsx, mergePdfs, pdfPageCount, rotatePdfPage, deletePdfPage, stampPdfPage, importPptx, reorderPdfPages, duplicatePdfPage, insertBlankPdfPage } from "../src/lib/formats";

describe("Office format engines", () => {
  it("exports and imports a basic DOCX as editable text", async () => {
    const blob = await exportDocx("# Report\n\nA local document.");
    const text = await importDocx(await blob.arrayBuffer());
    expect(text).toContain("Report");
    expect(text).toContain("A local document.");
  });

  it("round-trips a workbook and formulas through XLSX", () => {
    const blob = exportXlsx([["Name", "Value"], ["Total", "=SUM(B2:B3)"], ["A", "10"], ["B", "20"]], "Budget");
    return blob.arrayBuffer().then((bytes) => {
      const workbook = importXlsx(bytes);
      expect(workbook.name).toBe("Budget");
      expect(workbook.cells[1][1]).toBe("=SUM(B2:B3)");
      expect(workbook.cells[2][1]).toBe("10");
    });
  });

  it("exports a basic RTF document", () => {
    const blob = exportRtf("# Report\\nA paragraph.");
    expect(blob.type).toBe("application/rtf");
    return blob.text().then((text) => expect(text).toContain("Report"));
  });

  it("exports a presentation as a PPTX Blob", async () => {
    const blob = await exportPptx([{ title: "Welcome", body: "Offline presentation" }]);
    expect(blob.size).toBeGreaterThan(100);
    expect(blob.type).toContain("presentation");
  });

  it("imports the generated PPTX slide titles and body text", async () => {\n    const blob = await exportPptx([{ title: "Title slide", body: "Body text" }, { title: "Second", body: "More text" }]);\n    const slides = await importPptx(await blob.arrayBuffer());\n    expect(slides).toHaveLength(2);\n    expect(slides[0].title).toBe("Title slide");\n    expect(slides[0].body).toContain("Body text");\n  });\n\n  it("reorders, duplicates and inserts blank PDF pages", async () => {\n    const doc = await PDFDocument.create();\n    doc.addPage([300, 400]); doc.addPage([400, 300]); doc.addPage([200, 200]);\n    const bytes = await doc.save();\n    const reordered = await reorderPdfPages(bytes, [3, 1, 2]);\n    expect(await pdfPageCount(reordered)).toBe(3);\n    const duplicated = await duplicatePdfPage(reordered, 2);\n    expect(await pdfPageCount(duplicated)).toBe(4);\n    const inserted = await insertBlankPdfPage(duplicated, 1);\n    expect(await pdfPageCount(inserted)).toBe(5);\n    await expect(reorderPdfPages(bytes, [1, 1, 3])).rejects.toThrow();\n  });\n\n  it("merges, extracts, rotates, stamps and deletes PDF pages", async () => {
    const source = await PDFDocument.create();
    source.addPage([300, 400]);
    source.addPage([400, 300]);
    const bytes = await source.save();
    const second = await PDFDocument.create();
    second.addPage([200, 200]);
    const merged = await mergePdfs([bytes, await second.save()]);
    expect(await pdfPageCount(merged)).toBe(3);
    const extracted = await extractPdfPages(merged, [1, 3]);
    expect(await pdfPageCount(extracted)).toBe(2);
    const rotated = await rotatePdfPage(merged, 1, 90);
    expect(await pdfPageCount(rotated)).toBe(3);
    const stamped = await stampPdfPage(rotated, 1, "Reviewed");
    expect(await pdfPageCount(stamped)).toBe(3);
    const deleted = await deletePdfPage(stamped, 2);
    expect(await pdfPageCount(deleted)).toBe(2);
  });
});
