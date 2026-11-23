import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import PptxGenJS from "pptxgenjs";
import { PDFDocument, degrees } from "pdf-lib";
import JSZip from "jszip";

export async function importDocx(bytes: ArrayBuffer): Promise<string> {
  const result = await mammoth.extractRawText({ arrayBuffer: bytes });
  return result.value;
}

export async function exportDocx(markdown: string): Promise<Blob> {
  const children = markdown.split(/\r?\n/).map((line) => {
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length === 1 ? HeadingLevel.HEADING_1 : heading[1].length === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3;
      return new Paragraph({ text: heading[2], heading: level });
    }
    if (line.startsWith("- ")) return new Paragraph({ text: line.slice(2), bullet: { level: 0 } });
    return new Paragraph({ children: [new TextRun(line)] });
  });
  return Packer.toBlob(new Document({ sections: [{ children }] }));
}

export function importXlsx(bytes: ArrayBuffer): { name: string; cells: string[][] } {
  const workbook = XLSX.read(bytes, { type: "array", cellFormula: true });
  const name = workbook.SheetNames[0];
  if (!name) throw new Error("The workbook contains no worksheets");
  const sheet = workbook.Sheets[name];
  const range = sheet["!ref"] ? XLSX.utils.decode_range(sheet["!ref"]) : { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };
  const cells: string[][] = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    const row: string[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })] as XLSX.CellObject | undefined;
      row.push(cell?.f ? "=" + cell.f : cell?.w ?? (cell?.v == null ? "" : String(cell.v)));
    }
    cells.push(row);
  }
  return { name, cells };
}

export function exportXlsx(cells: string[][], sheetName = "Sheet1"): Blob {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(cells.map((row) => row.map((value) => value.startsWith("=") ? null : value)));
  cells.forEach((row, r) => row.forEach((value, c) => {
    if (value.startsWith("=")) {
      const address = XLSX.utils.encode_cell({ r, c });
      sheet[address] = { t: "n", f: value.slice(1) };
    }
  }));
  XLSX.utils.book_append_sheet(workbook, sheet, (sheetName || "Sheet1").slice(0, 31));
  const output = XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  return new Blob([output], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export async function exportPptx(slides: { title: string; body: string }[]): Promise<Blob> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "AI Agent Office";
  pptx.subject = "Presentation exported from AI Agent Office";
  pptx.title = "AI Agent Office presentation";
  for (const item of slides) {
    const slide = pptx.addSlide();
    slide.background = { color: "F7F9FC" };
    slide.addText(item.title || "Untitled slide", { x: 0.65, y: 0.55, w: 12, h: 0.8, fontFace: "Aptos Display", fontSize: 28, bold: true, color: "17243A", breakLine: false });
    slide.addText(item.body || "", { x: 0.75, y: 1.65, w: 11.7, h: 5.2, fontFace: "Aptos", fontSize: 18, color: "34445D", valign: "top", breakLine: false, paraSpaceAfter: 12 });
    slide.addText("Created with AI Agent Office", { x: 0.75, y: 7.05, w: 11.7, h: 0.2, fontSize: 8, color: "8290A5" });
  }
  return await pptx.write({ outputType: "blob" }) as Blob;
}

export async function pdfPageCount(bytes: Uint8Array): Promise<number> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: false });
  return doc.getPageCount();
}

export async function mergePdfs(files: Uint8Array[]): Promise<Uint8Array> {
  if (files.length < 2) throw new Error("Select at least two PDF files to merge");
  const merged = await PDFDocument.create();
  for (const bytes of files) {
    const source = await PDFDocument.load(bytes);
    const pages = await merged.copyPages(source, source.getPageIndices());
    pages.forEach((page) => merged.addPage(page));
  }
  return merged.save();
}

export async function extractPdfPages(bytes: Uint8Array, pageNumbers: number[]): Promise<Uint8Array> {
  if (!pageNumbers.length) throw new Error("Enter at least one page number");
  const source = await PDFDocument.load(bytes);
  const output = await PDFDocument.create();
  const unique = [...new Set(pageNumbers)];
  for (const page of unique) {
    if (!Number.isInteger(page) || page < 1 || page > source.getPageCount()) throw new Error("Page numbers must be between 1 and " + source.getPageCount());
  }
  const copied = await output.copyPages(source, unique.map((n) => n - 1));
  copied.forEach((page) => output.addPage(page));
  return output.save();
}

export async function rotatePdfPage(bytes: Uint8Array, pageNumber: number, angle: number): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes);
  if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > doc.getPageCount()) throw new Error("Invalid PDF page number");
  const page = doc.getPage(pageNumber - 1);
  page.setRotation(degrees((page.getRotation().angle + angle + 360) % 360));
  return doc.save();
}

export async function deletePdfPage(bytes: Uint8Array, pageNumber: number): Promise<Uint8Array> {
  const source = await PDFDocument.load(bytes);
  if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > source.getPageCount()) throw new Error("Invalid PDF page number");
  if (source.getPageCount() === 1) throw new Error("A PDF must contain at least one page");
  source.removePage(pageNumber - 1);
  return source.save();
}

export async function stampPdfPage(bytes: Uint8Array, pageNumber: number, text: string): Promise<Uint8Array> {
  if (!text.trim() || text.length > 300) throw new Error("Stamp text must contain 1 to 300 characters");
  const doc = await PDFDocument.load(bytes);
  if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > doc.getPageCount()) throw new Error("Invalid PDF page number");
  const page = doc.getPage(pageNumber - 1);
  page.drawText(text, { x: 48, y: 36, size: 11, opacity: 0.8 });
  return doc.save();
}

function decodeXml(value: string): string {
  return value.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}

export async function importPptx(bytes: ArrayBuffer): Promise<{ title: string; body: string }[]> {
  const zip = await JSZip.loadAsync(bytes);
  const paths = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => Number(a.match(/slide(\d+)/)?.[1] || 0) - Number(b.match(/slide(\d+)/)?.[1] || 0));
  if (!paths.length) throw new Error("The PowerPoint file contains no readable slides");
  const slides: { title: string; body: string }[] = [];
  for (const path of paths) {
    const xml = await zip.file(path)!.async("text");
    const paragraphs = [...xml.matchAll(/<a:p(?:\s[^>]*)?>([\s\S]*?)<\/a:p>/g)].map((match) =>
      [...match[1].matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g)].map((part) => decodeXml(part[1])).join("")
    ).map((line) => line.trim()).filter(Boolean);
    const useful = paragraphs.filter((line) => line !== "Created with AI Agent Office");
    slides.push({ title: useful[0] || "Untitled slide", body: useful.slice(1).join("\n") });
  }
  return slides;
}

export async function reorderPdfPages(bytes: Uint8Array, pageOrder: number[]): Promise<Uint8Array> {
  const source = await PDFDocument.load(bytes);
  const count = source.getPageCount();
  if (pageOrder.length !== count || new Set(pageOrder).size !== count ||
      pageOrder.some((n) => !Number.isInteger(n) || n < 1 || n > count)) {
    throw new Error("Enter every page exactly once, for example 3,1,2");
  }
  const output = await PDFDocument.create();
  const copied = await output.copyPages(source, pageOrder.map((n) => n - 1));
  copied.forEach((page) => output.addPage(page));
  return output.save();
}

export async function duplicatePdfPage(bytes: Uint8Array, pageNumber: number): Promise<Uint8Array> {
  const source = await PDFDocument.load(bytes);
  if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > source.getPageCount()) throw new Error("Invalid PDF page number");
  const [copy] = await source.copyPages(source, [pageNumber - 1]);
  source.insertPage(pageNumber, copy);
  return source.save();
}

export async function insertBlankPdfPage(bytes: Uint8Array, afterPage: number): Promise<Uint8Array> {
  const source = await PDFDocument.load(bytes);
  if (!Number.isInteger(afterPage) || afterPage < 0 || afterPage > source.getPageCount()) throw new Error("Invalid insertion position");
  const reference = source.getPage(Math.max(0, Math.min(afterPage - 1, source.getPageCount() - 1)));
  const size = reference.getSize();
  source.insertPage(afterPage, [size.width, size.height]);
  return source.save();
}

export async function importPptx(bytes: ArrayBuffer): Promise<{ title: string; body: string }[]> {
  const zip = await (await import("jszip")).default.loadAsync(bytes);
  const names = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => Number(a.match(/slide(\d+)/)?.[1] || 0) - Number(b.match(/slide(\d+)/)?.[1] || 0));
  if (!names.length) throw new Error("No presentation slides were found");
  const slides: { title: string; body: string }[] = [];
  for (const name of names) {
    const file = zip.file(name);
    if (!file) continue;
    const xml = await file.async("string");
    const parsed = new DOMParser().parseFromString(xml, "application/xml");
    const text = Array.from(parsed.getElementsByTagName("a:t")).map((node) => node.textContent || "").filter(Boolean);
    slides.push({ title: text.shift() || "Slide " + (slides.length + 1), body: text.join("\n") });
  }
  return slides;
}

export function exportRtf(markdown: string): Blob {
  const escape = (value: string) => value.replace(/\\/g, "\\\\").replace(/{/g, "\\{").replace(/}/g, "\\}").replace(/[^\x00-\x7F]/g, (char) => "\\u" + (char.charCodeAt(0) > 32767 ? char.charCodeAt(0) - 65536 : char.charCodeAt(0)) + "?");
  const paragraphs = markdown.split(/\r?\n/).map((line) => {
    const heading = line.match(/^#{1,3}\s+(.*)$/);
    if (heading) return "\\pard\\b\\fs30 " + escape(heading[1]) + "\\b0\\fs22\\par";
    if (line.startsWith("- ")) return "\\pard\\li360\\fi-180 \\bullet\\tab " + escape(line.slice(2)) + "\\par";
    return "\\pard " + escape(line) + "\\par";
  }).join("");
  return new Blob(["{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Arial;}}\\viewkind4\\uc1\\f0\\fs22 ", paragraphs, "}"], { type: "application/rtf" });
}
