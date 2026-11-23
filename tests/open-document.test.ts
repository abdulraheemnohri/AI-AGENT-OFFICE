import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import {
  exportOdt, importOdt, exportOdsWorkbook, importOdsWorkbook,
  exportOdp, importOdp, importRtf
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

  it("rejects invalid ODF package types", async () => {
    const zip = new JSZip();
    zip.file("content.xml", "<office:document-content/>");
    const blob = await zip.generateAsync({ type: "arraybuffer" });
    await expect(importOdt(blob)).rejects.toThrow(/not a text document/);
    await expect(importOdsWorkbook(blob)).rejects.toThrow(/not a spreadsheet/);
    await expect(importOdp(blob)).rejects.toThrow(/not a presentation/);
  });
});
