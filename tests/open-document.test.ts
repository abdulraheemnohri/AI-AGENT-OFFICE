import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import {
  exportOdt, importOdt, exportOdsWorkbook, importOdsWorkbook,
  exportOdp, importOdp, importRtf, importDocx, exportDocx
} from "../src/lib/formats";

describe("OpenDocument and RTF interoperability", () => {
  it("imports common RTF paragraphs, escaped braces and Unicode", () => {
    const rtf = String.raw`{\rtf1\ansi Hello\par {\b bold} \u233? and \{safe\}}`;
    expect(importRtf(rtf)).toBe("Hello\nbold é and {safe}");
  });

  it("exports and imports basic ODT text and headings", async () => {
    const blob = await exportOdt("# Heading\n\nText & more");
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    expect(await zip.file("mimetype")!.async("text")).toBe("application/vnd.oasis.opendocument.text");
    expect(await importOdt(await blob.arrayBuffer())).toBe("# Heading\n\nText & more");
  });

  it("round-trips multiple ODS worksheets and basic formulas", async () => {
    const source = [
      { name: "Budget", cells: [["Income", "100"], ["Expense", "25"], ["Balance", "=SUM(B1:B2)"]] },
      { name: "Notes", cells: [["Item", "Value"], ["Rent", "Paid"]] }
    ];
    const blob = await exportOdsWorkbook(source);
    const imported = await importOdsWorkbook(await blob.arrayBuffer());
    expect(imported).toHaveLength(2);
    expect(imported[0].name).toBe("Budget");
    expect(imported[0].cells[2][1]).toBe("=SUM(B1:B2)");
    expect(imported[1].cells[1]).toEqual(["Rent", "Paid"]);
  });

  it("round-trips ODP slide text", async () => {
    const source = [{ title: "First slide", body: "Line one\nLine two" }, { title: "Second", body: "More" }];
    const blob = await exportOdp(source);
    const imported = await importOdp(await blob.arrayBuffer());
    expect(imported).toEqual(source);
  });

  it("imports DOCX headings, inline emphasis and simple tables", async () => {
    const zip = new JSZip();
    zip.file("word/document.xml", '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Title</w:t></w:r></w:p><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Bold</w:t></w:r><w:r><w:rPr><w:i/></w:rPr><w:t> italic</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Name</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Value</w:t></w:r></w:p></w:tc></w:tr><w:tr><w:tc><w:p><w:r><w:t>Meter</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>10</w:t></w:r></w:p></w:tc></w:tr></w:tbl><w:sectPr/></w:body></w:document>');
    const bytes = await zip.generateAsync({ type: "arraybuffer" });
    expect(await importDocx(bytes)).toBe("# Title\n**Bold** *italic*\n| Name | Value |\n| --- | --- |\n| Meter | 10 |");
  });

  it("exports Markdown emphasis and headings into editable DOCX runs", async () => {
    const markdown = "# Heading\n**bold** and *italic* and " + String.fromCharCode(96) + "code" + String.fromCharCode(96);
    const blob = await exportDocx(markdown);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const xml = await zip.file("word/document.xml")!.async("text");
    expect(xml).toContain("Heading");
    expect(xml).toContain("bold");
    expect(xml).toContain("italic");
    expect(xml).toContain("code");
    expect(xml).toMatch(/<w:b\/>/);
    expect(xml).toMatch(/<w:i\/>/);
  });

  it("rejects invalid ODF package types", async () => {
    const zip = new JSZip();
    zip.file("content.xml", "<office:document-content/>");
    const blob = await zip.generateAsync({ type: "arraybuffer" });
    await expect(importOdt(blob)).rejects.toThrow(/not a text document/);
    await expect(importOdsWorkbook(blob)).rejects.toThrow(/not a spreadsheet/);
    await expect(importOdp(blob)).rejects.toThrow(/not a presentation/);
  });
});
