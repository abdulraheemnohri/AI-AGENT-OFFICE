export type CsvTable = string[][];

/** Parse RFC-4180-style CSV, including escaped quotes and embedded newlines. */
export function parseCsv(input: string, delimiter = ","): CsvTable {
  if (delimiter.length !== 1 || delimiter === '"' || delimiter === "\r" || delimiter === "\n") {
    throw new Error("Delimiter must be one non-quote character");
  }
  const rows: CsvTable = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let closedQuote = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"') {
        if (input[i + 1] === '"') { cell += '"'; i++; }
        else { quoted = false; closedQuote = true; }
      } else cell += ch;
      continue;
    }
    if (closedQuote && ch !== delimiter && ch !== "\r" && ch !== "\n") {
      throw new Error("Unexpected character after a closing CSV quote");
    }
    if (ch === '"' && cell.length === 0 && !closedQuote) { quoted = true; continue; }
    if (ch === delimiter) { row.push(cell); cell = ""; closedQuote = false; continue; }
    if (ch === "\r" || ch === "\n") {
      if (ch === "\r" && input[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = ""; closedQuote = false; continue;
    }
    cell += ch;
    closedQuote = false;
  }
  if (quoted) throw new Error("CSV contains an unclosed quoted field");
  if (cell.length || row.length || closedQuote || input.length === 0) {
    row.push(cell); rows.push(row);
  }
  return rows;
}

export function stringifyCsv(rows: CsvTable, delimiter = ","): string {
  if (delimiter.length !== 1 || delimiter === '"' || delimiter === "\r" || delimiter === "\n") {
    throw new Error("Delimiter must be one non-quote character");
  }
  return rows.map(row => row.map(value => {
    const text = String(value ?? "");
    return text.includes(delimiter) || /["\r\n]/.test(text)
      ? '"' + text.replace(/"/g, '""') + '"'
      : text;
  }).join(delimiter)).join("\r\n");
}
