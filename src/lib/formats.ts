import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import * as XLSX from "xlsx";
import PptxGenJS from "pptxgenjs";
import { PDFDocument, degrees } from "pdf-lib";
import JSZip from "jszip";

export async function importDocx(bytes: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(bytes);
  const documentXml = zip.file("word/document.xml");
  if (!documentXml) throw new Error("The DOCX package has no Word document body");
  const xml = await documentXml.async("text");
  const paragraphs = [...xml.matchAll(/<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g)].map((match) =>
    [...match[1].matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map((part) => decodeXmlText(part[1])).join("")
  );
  return paragraphs.join("\n");
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
      sheet[address] = { t: "n", f: value.slice(1), v: 0 };
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
  const generated = await pptx.write({ outputType: "blob" }) as Blob;
  return new Blob([await generated.arrayBuffer()], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
}


function decodeXmlText(value: string): string {
  return value.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}

export async function importPptx(bytes: ArrayBuffer): Promise<{ title: string; body: string }[]> {
  const zip = await JSZip.loadAsync(bytes);
  const paths = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => Number(a.match(/slide(\d+)/)?.[1] || 0) - Number(b.match(/slide(\d+)/)?.[1] || 0));
  if (!paths.length) throw new Error("The PowerPoint file contains no readable slides");
  const slides: { title: string; body: string }[] = [];
  for (const path of paths) {
    const file = zip.file(path);
    if (!file) continue;
    const xml = await file.async("text");
    const paragraphs = [...xml.matchAll(/<a:p(?:\s[^>]*)?>([\s\S]*?)<\/a:p>/g)].map((match) =>
      [...match[1].matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g)].map((part) => decodeXmlText(part[1])).join("")
    ).map((line) => line.trim()).filter(Boolean);
    const useful = paragraphs.filter((line) => line !== "Created with AI Agent Office");
    slides.push({ title: useful[0] || "Untitled slide", body: useful.slice(1).join("\n") });
  }
  return slides;
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

export type XlsxWorksheet = { name: string; cells: string[][] };

/** Import every worksheet in workbook order; formulas remain editable strings. */
export function importXlsxWorkbook(bytes: ArrayBuffer): XlsxWorksheet[] {
  const workbook = XLSX.read(bytes, { type: "array", cellFormula: true });
  if (!workbook.SheetNames.length) throw new Error("The workbook contains no worksheets");
  return workbook.SheetNames.map((name) => {
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
  });
}

/** Export all worksheets, retaining formulas as native Excel formula cells. */
export function exportXlsxWorkbook(sheets: XlsxWorksheet[]): Blob {
  if (!sheets.length) throw new Error("Add at least one worksheet before exporting");
  const workbook = XLSX.utils.book_new();
  const used = new Set<string>();
  for (const item of sheets) {
    const base = (item.name.trim() || "Sheet").replace(/[\\\\/?*\\[\\]:]/g, " ").slice(0, 31) || "Sheet";
    let name = base;
    let suffix = 2;
    while (used.has(name.toLowerCase())) {
      const tail = " (" + suffix++ + ")";
      name = base.slice(0, 31 - tail.length) + tail;
    }
    used.add(name.toLowerCase());
    const sheet = XLSX.utils.aoa_to_sheet(item.cells.map((row) => row.map((value) => value.startsWith("=") ? null : value)));
    item.cells.forEach((row, r) => row.forEach((value, c) => {
      if (value.startsWith("=")) {
        const address = XLSX.utils.encode_cell({ r, c });
        sheet[address] = { t: "n", f: value.slice(1), v: 0 };
      }
    }));
    XLSX.utils.book_append_sheet(workbook, sheet, name);
  }
  const output = XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  return new Blob([output], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}


function xmlEscape(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function decodeXmlEntities(value: string): string {
  return decodeXmlText(value)
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)));
}

function odfInlineText(fragment: string): string {
  return fragment
    .replace(/<text:line-break\s*\/>/g, "\n")
    .replace(/<text:tab\s*\/>/g, "\t")
    .replace(/<\/text:p>\s*<text:p[^>]*>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function odfParagraphs(xml: string): string[] {
  const paragraphs: string[] = [];
  const pattern = /<text:(h|p)\b([^>]*)>([\s\S]*?)<\/text:\1>/g;
  for (const match of xml.matchAll(pattern)) {
    const text = decodeXmlEntities(odfInlineText(match[3])).trim();
    if (!text) continue;
    if (match[1] === "h") {
      const level = Number(match[2].match(/text:outline-level="(\d+)"/)?.[1] || 1);
      paragraphs.push("#".repeat(Math.max(1, Math.min(6, level))) + " " + text);
    } else {
      paragraphs.push(text);
    }
  }
  return paragraphs;
}

const ODF_NAMESPACES = 'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0"';

async function createOdfPackage(mimetype: string, contentXml: string): Promise<Blob> {
  const zip = new JSZip();
  zip.file("mimetype", mimetype, { compression: "STORE" });
  zip.file("content.xml", contentXml);
  zip.file("styles.xml", '<?xml version="1.0" encoding="UTF-8"?><office:document-styles ' + ODF_NAMESPACES + ' office:version="1.3"><office:styles/><office:automatic-styles/><office:master-styles/></office:document-styles>');
  zip.file("meta.xml", '<?xml version="1.0" encoding="UTF-8"?><office:document-meta ' + ODF_NAMESPACES + ' office:version="1.3"><office:meta/></office:document-meta>');
  zip.file("settings.xml", '<?xml version="1.0" encoding="UTF-8"?><office:document-settings ' + ODF_NAMESPACES + ' office:version="1.3"><office:settings/></office:document-settings>');
  const manifest = '<?xml version="1.0" encoding="UTF-8"?><manifest:manifest ' + ODF_NAMESPACES + ' manifest:version="1.3"><manifest:file-entry manifest:full-path="/" manifest:media-type="' + mimetype + '"/><manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/><manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/><manifest:file-entry manifest:full-path="meta.xml" manifest:media-type="text/xml"/><manifest:file-entry manifest:full-path="settings.xml" manifest:media-type="text/xml"/></manifest:manifest>';
  zip.folder("META-INF")!.file("manifest.xml", manifest);
  return zip.generateAsync({ type: "blob", compression: "DEFLATE", mimeType: mimetype });
}

/** Import the text structure of RTF. Rich page layout and embedded objects are intentionally not converted. */
export function importRtf(source: string): string {
  if (!source.trimStart().startsWith("{\\rtf")) throw new Error("The file does not begin with a valid RTF document header");
  if (source.length > 20 * 1024 * 1024) throw new Error("RTF exceeds the 20 MB import limit");
  const output: string[] = [];
  const stack: { skip: boolean }[] = [];
  let skip = false;
  let uc = 1;
  let fallback = 0;
  for (let i = 0; i < source.length;) {
    const ch = source[i];
    if (ch === "{") {
      stack.push({ skip });
      i++;
      const destination = source.slice(i).match(/^(?:\\\*\\)?(fonttbl|colortbl|stylesheet|info|pict|object|header\d?|footer\d?|filetbl|listtable|listoverridetable)\b/i);
      if (destination) skip = true;
      continue;
    }
    if (ch === "}") {
      const previous = stack.pop();
      skip = previous?.skip ?? false;
      i++;
      continue;
    }
    if (ch !== "\\") {
      if (!skip) {
        if (fallback > 0) fallback--;
        else if (ch !== "\r" && ch !== "\n") output.push(ch);
      }
      i++;
      continue;
    }
    i++;
    if (i >= source.length) break;
    const symbol = source[i];
    if (symbol === "\\" || symbol === "{" || symbol === "}") {
      if (!skip && fallback === 0) output.push(symbol);
      else if (fallback > 0) fallback--;
      i++;
      continue;
    }
    if (symbol === "'") {
      const hex = source.slice(i + 1, i + 3);
      if (/^[0-9a-f]{2}$/i.test(hex)) {
        if (!skip && fallback === 0) output.push(new TextDecoder("windows-1252").decode(Uint8Array.of(parseInt(hex, 16))));
        else if (fallback > 0) fallback--;
        i += 3;
      } else i++;
      continue;
    }
    if (symbol === "~" || symbol === "_" || symbol === "-") {
      if (!skip && fallback === 0) output.push(symbol === "~" ? "\u00a0" : symbol === "_" ? "\u2011" : "");
      else if (fallback > 0) fallback--;
      i++;
      continue;
    }
    if (!/[a-z]/i.test(symbol)) { i++; continue; }
    const token = source.slice(i).match(/^([a-z]+)(-?\d+)? ?/i);
    if (!token) continue;
    i += token[0].length;
    const word = token[1].toLowerCase();
    const value = token[2] === undefined ? undefined : Number(token[2]);
    if (word === "uc" && value !== undefined) uc = Math.max(0, Math.min(16, value));
    if (word === "u" && value !== undefined && !skip) {
      output.push(String.fromCharCode((value + 65536) % 65536));
      fallback = uc;
    } else if (!skip && fallback === 0) {
      if (word === "par" || word === "line") output.push("\n");
      else if (word === "tab") output.push("\t");
      else if (word === "emdash") output.push("\u2014");
      else if (word === "endash") output.push("\u2013");
      else if (word === "bullet") output.push("\u2022");
      else if (word === "lquote") output.push("\u2018");
      else if (word === "rquote") output.push("\u2019");
      else if (word === "ldblquote") output.push("\u201c");
      else if (word === "rdblquote") output.push("\u201d");
    }
  }
  return output.join("").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export async function importOdt(bytes: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(bytes);
  const content = zip.file("content.xml");
  if (!content) throw new Error("ODT package is missing content.xml");
  const xml = await content.async("text");
  if (!/<office:body\b/.test(xml) || !/<office:text\b/.test(xml)) throw new Error("The OpenDocument package is not a text document");
  return odfParagraphs(xml).join("\n");
}

export async function exportOdt(markdown: string): Promise<Blob> {
  const paragraphs = markdown.split(/\r?\n/).map(line => {
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) return '<text:h text:outline-level="' + heading[1].length + '">' + xmlEscape(heading[2]) + '</text:h>';
    return "<text:p>" + xmlEscape(line) + "</text:p>";
  }).join("");
  const xml = '<?xml version="1.0" encoding="UTF-8"?><office:document-content ' + ODF_NAMESPACES + ' office:version="1.3"><office:automatic-styles/><office:body><office:text>' + paragraphs + '</office:text></office:body></office:document-content>';
  return createOdfPackage("application/vnd.oasis.opendocument.text", xml);
}

export type OdsWorksheet = { name: string; cells: string[][] };

function repeatedCount(attributes: string, name: string, max: number): number {
  const value = Number(attributes.match(new RegExp(name + '="(\\\\d+)"'))?.[1] || 1);
  return Number.isFinite(value) ? Math.max(1, Math.min(max, value)) : 1;
}

/** Import plain values and basic OpenFormula expressions from every ODS sheet. */
export async function importOdsWorkbook(bytes: ArrayBuffer): Promise<OdsWorksheet[]> {
  const zip = await JSZip.loadAsync(bytes);
  const content = zip.file("content.xml");
  if (!content) throw new Error("ODS package is missing content.xml");
  const xml = await content.async("text");
  if (!/<office:spreadsheet\b/.test(xml)) throw new Error("The OpenDocument package is not a spreadsheet");
  const sheets: OdsWorksheet[] = [];
  for (const table of xml.matchAll(/<table:table\b([^>]*)>([\s\S]*?)<\/table:table>/g)) {
    const name = decodeXmlEntities(table[1].match(/table:name="([^"]*)"/)?.[1] || "Sheet" + (sheets.length + 1));
    const rows: string[][] = [];
    for (const rowMatch of table[2].matchAll(/<table:table-row\b([^>]*)>([\s\S]*?)<\/table:table-row>/g)) {
      const rowAttrs = rowMatch[1];
      const rowContent = rowMatch[2];
      const rowCopies = repeatedCount(rowAttrs, "table:number-rows-repeated", 1000);
      const cells: string[] = [];
      const cellPattern = /<table:(table-cell|covered-table-cell)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/table:\1>)/g;
      for (const cell of rowContent.matchAll(cellPattern)) {
        const attrs = cell[2];
        const body = cell[3] || "";
        const formula = attrs.match(/table:formula="([^"]*)"/)?.[1];
        let value = "";
        if (formula) value = "=" + decodeXmlEntities(formula.replace(/^of:=/, "").replace(/\[\./g, "").replace(/\]/g, "").replace(/;/g, ","));
        else {
          const text = odfParagraphs(body).join("\n");
          value = text || decodeXmlEntities(attrs.match(/office:(?:string-value|value|date-value|time-value)="([^"]*)"/)?.[1] || "");
        }
        const copies = repeatedCount(attrs, "table:number-columns-repeated", 1000);
        for (let n = 0; n < copies && cells.length < 1000; n++) cells.push(value);
      }
      for (let n = 0; n < rowCopies && rows.length < 10000; n++) rows.push(cells.slice());
      if (rows.length * Math.max(1, ...rows.map(r => r.length)) > 200000) throw new Error("ODS workbook exceeds the 200,000-cell import safety limit");
    }
    if (rows.length) sheets.push({ name, cells: rows });
    if (sheets.length >= 100) break;
  }
  if (!sheets.length) throw new Error("ODS workbook contains no readable worksheets");
  return sheets;
}

function odfFormula(value: string): string {
  return value.slice(1).replace(/(\$?[A-Z]{1,3}\$?\d+)/g, "[$.$1]").replace(/,/g, ";");
}

export async function exportOdsWorkbook(sheets: OdsWorksheet[]): Promise<Blob> {
  if (!sheets.length) throw new Error("An ODS workbook must contain at least one worksheet");
  if (sheets.length > 100) throw new Error("ODS export supports at most 100 worksheets");
  const tables = sheets.map((sheet, index) => {
    const rows = sheet.cells.map(row => "<table:table-row>" + row.map(value => {
      if (value.startsWith("=")) return '<table:table-cell table:formula="of:=' + xmlEscape(odfFormula(value)) + '" office:value-type="float" office:value="0"/>';
      return '<table:table-cell office:value-type="string"><text:p>' + xmlEscape(value) + "</text:p></table:table-cell>";
    }).join("") + "</table:table-row>").join("");
    return '<table:table table:name="' + xmlEscape((sheet.name || "Sheet" + (index + 1)).slice(0, 31)) + '">' + rows + "</table:table>";
  }).join("");
  const xml = '<?xml version="1.0" encoding="UTF-8"?><office:document-content ' + ODF_NAMESPACES + ' office:version="1.3"><office:automatic-styles/><office:body><office:spreadsheet>' + tables + '</office:spreadsheet></office:body></office:document-content>';
  return createOdfPackage("application/vnd.oasis.opendocument.spreadsheet", xml);
}

export async function importOdp(bytes: ArrayBuffer): Promise<{ title: string; body: string }[]> {
  const zip = await JSZip.loadAsync(bytes);
  const content = zip.file("content.xml");
  if (!content) throw new Error("ODP package is missing content.xml");
  const xml = await content.async("text");
  if (!/<office:presentation\b/.test(xml)) throw new Error("The OpenDocument package is not a presentation");
  const slides: { title: string; body: string }[] = [];
  for (const page of xml.matchAll(/<draw:page\b[^>]*>([\s\S]*?)<\/draw:page>/g)) {
    const paragraphs = odfParagraphs(page[1]).filter(Boolean);
    slides.push({ title: paragraphs[0]?.replace(/^#{1,6}\s+/, "") || "Untitled slide", body: paragraphs.slice(1).join("\n") });
  }
  if (!slides.length) throw new Error("ODP presentation contains no slides");
  return slides;
}

export async function exportOdp(slides: { title: string; body: string }[]): Promise<Blob> {
  if (!slides.length) throw new Error("A presentation must contain at least one slide");
  if (slides.length > 500) throw new Error("ODP export supports at most 500 slides");
  const pages = slides.map((slide, index) => {
    const text = [slide.title, ...slide.body.split(/\r?\n/)].map(line => "<text:p>" + xmlEscape(line) + "</text:p>").join("");
    return '<draw:page draw:name="page' + (index + 1) + '" draw:style-name="dp1"><draw:frame draw:style-name="gr1" svg:width="24cm" svg:height="15cm" svg:x="2cm" svg:y="2cm"><draw:text-box>' + text + "</draw:text-box></draw:frame></draw:page>";
  }).join("");
  const xml = '<?xml version="1.0" encoding="UTF-8"?><office:document-content ' + ODF_NAMESPACES + ' office:version="1.3"><office:automatic-styles><style:style style:name="dp1" style:family="drawing-page"/><style:style style:name="gr1" style:family="graphic"/></office:automatic-styles><office:body><office:presentation>' + pages + '</office:presentation></office:body></office:document-content>';
  return createOdfPackage("application/vnd.oasis.opendocument.presentation", xml);
}
