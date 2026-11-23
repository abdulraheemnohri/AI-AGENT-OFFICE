export type CellValue = number | string;
export type Workbook = string[][];

const cellPattern = /^\$?([A-Z]{1,3})\$?([1-9]\d*)$/i;
export function columnLabel(index: number): string {
  if (!Number.isInteger(index) || index < 0) throw new Error("Column index must be a non-negative integer");
  let n = index + 1; let label = "";
  while (n > 0) { const rem = (n - 1) % 26; label = String.fromCharCode(65 + rem) + label; n = Math.floor((n - 1) / 26); }
  return label;
}
export function columnIndex(label: string): number {
  let n = 0;
  for (const ch of label.toUpperCase()) n = n * 26 + ch.charCodeAt(0) - 64;
  return n - 1;
}
export function parseCellAddress(address: string): { row: number; col: number } | null {
  const m = address.match(cellPattern);
  return m ? { row: Number(m[2]) - 1, col: columnIndex(m[1]) } : null;
}
type Token = { type: "number" | "word" | "op" | "eof"; value: string };
function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  const re = /\s*(?:(\d+(?:\.\d*)?|\.\d+)|([A-Za-z]{1,3}[1-9]\d*|[A-Za-z]+)|([()+\-*/:,]))/gy;
  let pos = 0;
  while (pos < source.length) {
    re.lastIndex = pos;
    const m = re.exec(source);
    if (!m || m.index !== pos) throw new Error("Invalid formula token");
    tokens.push(m[1] ? { type: "number", value: m[1] } : m[2] ? { type: "word", value: m[2].toUpperCase() } : { type: "op", value: m[3] });
    pos = re.lastIndex;
  }
  tokens.push({ type: "eof", value: "" });
  return tokens;
}
type EvalValue = number | string | number[];
export function evaluateWorkbook(workbook: Workbook): CellValue[][] {
  const cache = new Map<string, CellValue>();
  const visiting = new Set<string>();
  const readCell = (row: number, col: number): CellValue => {
    if (row < 0 || col < 0 || row >= workbook.length || col >= (workbook[row]?.length || 0)) return 0;
    const key = row + ":" + col;
    if (cache.has(key)) return cache.get(key)!;
    if (visiting.has(key)) return "#CYCLE!";
    visiting.add(key);
    const raw = workbook[row][col] ?? "";
    let result: CellValue;
    if (!raw.startsWith("=")) {
      const trimmed = raw.trim();
      result = trimmed === "" ? "" : /^[-+]?(?:\d+\.?\d*|\.\d+)$/.test(trimmed) ? Number(trimmed) : raw;
    } else {
      try {
        const tokens = tokenize(raw.slice(1));
        let at = 0;
        const peek = () => tokens[at];
        const take = (value?: string) => { const t = tokens[at]; if (value && t.value !== value) throw new Error("Expected " + value); at++; return t; };
        const numeric = (v: EvalValue): number => { if (typeof v !== "number" || !Number.isFinite(v)) throw new Error("Expected number"); return v; };
        const expandRange = (a: string, b: string): number[] => {
          const aa = parseCellAddress(a), bb = parseCellAddress(b);
          if (!aa || !bb) throw new Error("Invalid range");
          const r1 = Math.min(aa.row, bb.row), r2 = Math.max(aa.row, bb.row);
          const c1 = Math.min(aa.col, bb.col), c2 = Math.max(aa.col, bb.col);
          if ((r2-r1+1)*(c2-c1+1) > 10000) throw new Error("Range too large");
          const values: number[] = [];
          for (let r=r1;r<=r2;r++) for(let c=c1;c<=c2;c++) values.push(numeric(readCell(r,c) === "" ? 0 : readCell(r,c)));
          return values;
        };
        function expression(): EvalValue { let v=term(); while(peek().value==="+"||peek().value==="-"){const op=take().value;const b=numeric(term());v=op==="+"?numeric(v)+b:numeric(v)-b;}return v; }
        function term(): EvalValue { let v=factor(); while(peek().value==="*"||peek().value==="/"){const op=take().value;const b=numeric(factor());if(op==="/"&&b===0)throw new Error("Division by zero");v=op==="*"?numeric(v)*b:numeric(v)/b;}return v; }
        function factor(): EvalValue {
          if(peek().value==="+"){take("+");return numeric(factor());}
          if(peek().value==="-"){take("-");return -numeric(factor());}
          if(peek().value==="("){take("(");const v=expression();take(")");return v;}
          if(peek().type==="number")return Number(take().value);
          if(peek().type==="word"){
            const name=take().value;
            if(peek().value==="("){
              take("(");const args:EvalValue[]=[];
              if(peek().value!==")"){while(true){if(peek().type==="word"&&parseCellAddress(peek().value)&&tokens[at+1]?.value===":"){const a=take().value;take(":");const b=take().value;args.push(expandRange(a,b));}else args.push(expression());if(peek().value!==",")break;take(",");}}
              take(")");
              const flat=args.flatMap(x=>Array.isArray(x)?x:[x]).map(numeric);
              const one=()=>{if(args.length!==1)throw new Error("Wrong argument count");return numeric(args[0]);};
              const two=()=>{if(args.length!==2)throw new Error("Wrong argument count");return [numeric(args[0]),numeric(args[1])] as const;};
              const rounded=(value:number,digits:number,mode:"nearest"|"up"|"down")=>{if(!Number.isInteger(digits)||Math.abs(digits)>10)throw new Error("Invalid decimal places");const scale=10**digits;const scaled=value*scale;const adjusted=mode==="up"?Math.sign(scaled)*Math.ceil(Math.abs(scaled)-1e-10):mode==="down"?Math.sign(scaled)*Math.floor(Math.abs(scaled)+1e-10):Math.sign(scaled)*Math.floor(Math.abs(scaled)+0.5+1e-10);return adjusted/scale;};
              switch(name){
                case "SUM":return flat.reduce((a,b)=>a+b,0);
                case "AVERAGE":return flat.length?flat.reduce((a,b)=>a+b,0)/flat.length:0;
                case "MIN":return flat.length?Math.min(...flat):0;
                case "MAX":return flat.length?Math.max(...flat):0;
                case "COUNT":return flat.length;
                case "PRODUCT":return flat.reduce((a,b)=>a*b,1);
                case "MEDIAN":{if(!flat.length)return 0;const sorted=[...flat].sort((a,b)=>a-b);const mid=Math.floor(sorted.length/2);return sorted.length%2?sorted[mid]:(sorted[mid-1]+sorted[mid])/2;}
                case "ABS":return Math.abs(one());
                case "SQRT":{const v=one();if(v<0)throw new Error("Invalid square root");return Math.sqrt(v);}
                case "POWER":{const [a,b]=two();return Math.pow(a,b);}
                case "MOD":{const [a,b]=two();if(b===0)throw new Error("Division by zero");return a-Math.floor(a/b)*b;}
                case "ROUND":case "ROUNDUP":case "ROUNDDOWN":{const [v,d]=two();return rounded(v,d,name==="ROUND"?"nearest":name==="ROUNDUP"?"up":"down");}
                default:throw new Error("Unknown function");
              }
            }
            const ref=parseCellAddress(name);if(!ref)throw new Error("Unknown name");
            const v=readCell(ref.row,ref.col);if(typeof v==="string"&&v.startsWith("#"))throw new Error(v);return v===""?0:numeric(v);
          }
          throw new Error("Unexpected formula value");
        };
        const value=expression();if(peek().type!=="eof")throw new Error("Unexpected formula content");
        result=typeof value==="number"&&Number.isFinite(value)?Number(value.toFixed(10)): "#ERROR!";
      } catch (e) { result = e instanceof Error && e.message === "#CYCLE!" ? "#CYCLE!" : e instanceof Error && e.message === "Division by zero" ? "#DIV/0!" : "#ERROR!"; }
    }
    visiting.delete(key);cache.set(key,result);return result;
  };
  return workbook.map((row,r)=>row.map((_,c)=>readCell(r,c)));
}

export type SortDirection = "ascending" | "descending";

/** Returns a sorted copy; the optional header row stays at index zero. */
export function sortWorkbookRows(workbook: Workbook, column: number, direction: SortDirection = "ascending", hasHeader = false, calculated?: (string | number)[][]): Workbook {
  if (!Number.isInteger(column) || column < 0) throw new Error("Column index must be a non-negative integer");
  const header = hasHeader && workbook.length ? [workbook[0]] : [];
  const start = header.length;
  const sign = direction === "ascending" ? 1 : -1;
  const sorted = workbook.slice(start).map((row, index) => ({ row, index })).sort((a, b) => {
    const left = String(calculated?.[a.index + start]?.[column] ?? a.row[column] ?? "").trim();
    const right = String(calculated?.[b.index + start]?.[column] ?? b.row[column] ?? "").trim();
    if (!left && !right) return a.index - b.index;
    if (!left) return 1;
    if (!right) return -1;
    const ln = Number(left), rn = Number(right);
    const bothNumeric = Number.isFinite(ln) && Number.isFinite(rn);
    const comparison = bothNumeric ? ln - rn : left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
    return comparison === 0 ? a.index - b.index : comparison * sign;
  }).map(item => item.row);
  return [...header, ...sorted];
}

/** Returns original row indexes matching a case-insensitive search across raw and calculated cells. */
export function filterWorkbookRowIndexes(workbook: Workbook, query: string, calculated?: (string | number)[][]): number[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return workbook.map((_, index) => index);
  return workbook.flatMap((row, index) => {
    const values = [...row, ...(calculated?.[index] ?? []).map(String)];
    return values.some(value => String(value ?? "").toLocaleLowerCase().includes(needle)) ? [index] : [];
  });
}

/** Insert an empty row at a zero-based position, clamped to the workbook bounds. */
export function insertWorkbookRow(workbook: Workbook, index: number): Workbook {
  const at = Math.max(0, Math.min(workbook.length, Math.trunc(index)));
  const width = Math.max(1, ...workbook.map(row => row.length));
  const next = workbook.map(row => [...row]);
  next.splice(at, 0, Array(width).fill(""));
  return next;
}

/** Delete a row by zero-based position. Keeps one empty row when deleting the final row. */
export function deleteWorkbookRow(workbook: Workbook, index: number): Workbook {
  if (!Number.isInteger(index) || index < 0 || index >= workbook.length) return workbook.map(row => [...row]);
  const next = workbook.filter((_, row) => row !== index).map(row => [...row]);
  return next.length ? next : [Array(Math.max(1, workbook[0]?.length ?? 1)).fill("")];
}

/** Insert an empty cell into every row at a zero-based column position. */
export function insertWorkbookColumn(workbook: Workbook, index: number): Workbook {
  const at = Math.max(0, Math.min(Math.max(1, ...workbook.map(row => row.length)), Math.trunc(index)));
  return workbook.map(row => { const next = [...row]; next.splice(at, 0, ""); return next; });
}

/** Delete a column by zero-based position. Keeps one column in each row. */
export function deleteWorkbookColumn(workbook: Workbook, index: number): Workbook {
  if (!Number.isInteger(index) || index < 0) return workbook.map(row => [...row]);
  return workbook.map(row => { const next = [...row]; if (index < next.length) next.splice(index, 1); return next.length ? next : [""]; });
}

export type ListValidationRule = { type: "list"; options: string[]; allowBlank?: boolean };

/** Validate a literal cell value against a configured dropdown list. Formulas remain permitted. */
export function validateCellValue(value: string, rule?: ListValidationRule): { valid: boolean; reason?: string } {
  if (!rule || rule.type !== "list") return { valid: true };
  const candidate = value.trim();
  if (!candidate && rule.allowBlank !== false) return { valid: true };
  if (candidate.startsWith("=")) return { valid: true };
  const options = rule.options.map(option => option.trim()).filter(Boolean);
  if (!options.length) return { valid: true };
  const valid = options.some(option => option.localeCompare(candidate, undefined, { sensitivity: "accent" }) === 0);
  return valid ? { valid: true } : { valid: false, reason: "Choose a value from the column dropdown list." };
}
