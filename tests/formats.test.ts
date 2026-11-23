import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { exportDocx, exportPptx, exportXlsx, exportOdt, importOdt, importRtf, extractPdfPages, importDocx, importXlsx, mergePdfs, pdfPageCount, rotatePdfPage, deletePdfPage, stampPdfPage, listPdfFormFields, fillPdfForm, importPptx, exportRtf, reorderPdfPages, duplicatePdfPage, insertBlankPdfPage, highlightPdfArea, addPdfNote, importXlsxWorkbook, exportXlsxWorkbook, importOdsWorkbook, exportOdsWorkbook, importOdp, exportOdp } from "../src/lib/formats";

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


  it("round-trips every worksheet and formulas in a multi-sheet XLSX", async () => {
    const blob = exportXlsxWorkbook([
      { name: "Summary", cells: [["Metric", "Value"], ["Total", "=SUM(B3:B4)"], ["A", "12"], ["B", "8"]] },
      { name: "Details", cells: [["Item", "Count"], ["Cable", "4"], ["Switch", "2"]] }
    ]);
    const sheets = importXlsxWorkbook(await blob.arrayBuffer());
    expect(sheets).toHaveLength(2);
    expect(sheets.map(sheet => sheet.name)).toEqual(["Summary", "Details"]);
    expect(sheets[0].cells[1][1]).toBe("=SUM(B3:B4)");
    expect(sheets[1].cells[1][0]).toBe("Cable");
  });

  it("creates unique valid worksheet names on export", async () => {
    const blob = exportXlsxWorkbook([
      { name: "Budget/2026", cells: [["1"]] },
      { name: "budget 2026", cells: [["2"]] }
    ]);
    const sheets = importXlsxWorkbook(await blob.arrayBuffer());
    expect(sheets).toHaveLength(2);
    expect(new Set(sheets.map(sheet => sheet.name.toLowerCase())).size).toBe(2);
    expect(sheets[0].name).not.toContain("/");
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

  it("imports the generated PPTX slide titles and body text", async () => {
    const blob = await exportPptx([{ title: "Title slide", body: "Body text" }, { title: "Second", body: "More text" }]);
    const slides = await importPptx(await blob.arrayBuffer());
    expect(slides).toHaveLength(2);
    expect(slides[0].title).toBe("Title slide");
    expect(slides[0].body).toContain("Body text");
  });

  it("reorders, duplicates and inserts blank PDF pages", async () => {
    const doc = await PDFDocument.create();
    doc.addPage([300, 400]); doc.addPage([400, 300]); doc.addPage([200, 200]);
    const bytes = await doc.save();
    const reordered = await reorderPdfPages(bytes, [3, 1, 2]);
    expect(await pdfPageCount(reordered)).toBe(3);
    const duplicated = await duplicatePdfPage(reordered, 2);
    expect(await pdfPageCount(duplicated)).toBe(4);
    const inserted = await insertBlankPdfPage(duplicated, 1);
    expect(await pdfPageCount(inserted)).toBe(5);
    await expect(reorderPdfPages(bytes, [1, 1, 3])).rejects.toThrow();
  });

  it("merges, extracts, rotates, stamps and deletes PDF pages", async () => {
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

  it("inspects and fills standard PDF text and checkbox fields", async () => {
    const source = await PDFDocument.create();
    const page = source.addPage([400, 500]);
    const form = source.getForm();
    const name = form.createTextField("Full Name");
    name.addToPage(page);
    const consent = form.createCheckBox("Consent");
    consent.addToPage(page);
    const original = await source.save();
    const fields = await listPdfFormFields(original);
    expect(fields.map(field => field.name)).toEqual(["Full Name", "Consent"]);
    const updated = await fillPdfForm(original, { "Full Name": "Abdul", Consent: true });
    const reopened = await PDFDocument.load(updated);
    expect(reopened.getForm().getTextField("Full Name").getText()).toBe("Abdul");
    expect(reopened.getForm().getCheckBox("Consent").isChecked()).toBe(true);
    await expect(fillPdfForm(original, { Unknown: "x" })).rejects.toThrow(/Unknown PDF form field/);
  });

  it("adds bounded flattened highlights and note boxes to PDF pages", async () => {
    const source = await PDFDocument.create();
    source.addPage([600, 800]);
    const bytes = await source.save();
    const highlighted = await highlightPdfArea(bytes, 1, 10, 10, 30, 15);
    expect(await pdfPageCount(highlighted)).toBe(1);
    const noted = await addPdfNote(highlighted, 1, 10, 10, 35, 20, "Review this area");
    expect(await pdfPageCount(noted)).toBe(1);
    await expect(highlightPdfArea(bytes, 1, 90, 90, 20, 20)).rejects.toThrow(/inside the page/);
    await expect(addPdfNote(bytes, 1, 10, 10, 2, 2, "Too small")).rejects.toThrow(/too small/);
  });

  it("round-trips editable ODT paragraphs and headings", async () => {
    const blob = await exportOdt("# Annual report\n\nLocal document\n- First item");
    expect(blob.type).toBe("application/vnd.oasis.opendocument.text");
    const text = await importOdt(await blob.arrayBuffer());
    expect(text).toContain("Annual report");
    expect(text).toContain("Local document");
    expect(text).toContain("- First item");
  });

  it("imports common RTF paragraphs, escaped characters and Unicode", () => {
    const text = importRtf("{\\rtf1\\ansi Hello \\b bold\\b0\\par Next \\{safe\\} \\u8217?}");
    expect(text).toContain("Hello bold");
    expect(text).toContain("Next {safe}");
    expect(text).toContain("’");
  });

  it("rejects malformed RTF input", () => {
    expect(() => importRtf("not an RTF file")).toThrow();
  });


  it("round-trips multi-sheet ODS data and formulas", async () => {
    const blob = await exportOdsWorkbook([
      { name: "Summary", cells: [["Total", "=SUM(B2:B3)"], ["A", "5"], ["B", "7"]] },
      { name: "Details", cells: [["Item"], ["Cable"]] }
    ]);
    const sheets = await importOdsWorkbook(await blob.arrayBuffer());
    expect(sheets).toHaveLength(2);
    expect(sheets[0].cells[0][0]).toBe("Total");
    expect(sheets[0].cells[0][1]).toContain("SUM");
    expect(sheets[1].cells[1][0]).toBe("Cable");
  });

  it("round-trips ODP slide titles and body text", async () => {
    const blob = await exportOdp([{ title: "Safety", body: "Isolate first\nVerify absence of voltage" }]);
    const slides = await importOdp(await blob.arrayBuffer());
    expect(slides).toHaveLength(1);
    expect(slides[0].title).toBe("Safety");
    expect(slides[0].body).toContain("Isolate first");
  });


  it("adds a bounded translucent PDF highlight overlay", async () => {
    const source = await PDFDocument.create();
    source.addPage([612, 792]);
    const bytes = await source.save();
    const highlighted = await highlightPdfArea(bytes, 1, { x: 40, y: 50, width: 120, height: 24 }, "green");
    expect(await pdfPageCount(highlighted)).toBe(1);
    const reopened = await PDFDocument.load(highlighted);
    expect(reopened.getPage(0).getSize().width).toBe(612);
  });

  it("rejects highlight rectangles outside the page", async () => {
    const source = await PDFDocument.create();
    source.addPage([100, 100]);
    const bytes = await source.save();
    await expect(highlightPdfArea(bytes, 1, { x: 90, y: 90, width: 20, height: 20 })).rejects.toThrow(/fit inside/);
    await expect(highlightPdfArea(bytes, 2, { x: 1, y: 1, width: 10, height: 10 })).rejects.toThrow(/page number/);
  });

});
