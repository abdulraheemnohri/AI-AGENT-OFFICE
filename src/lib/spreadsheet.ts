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
              switch(name){case "SUM":return flat.reduce((a,b)=>a+b,0);case "AVERAGE":return flat.length?flat.reduce((a,b)=>a+b,0)/flat.length:0;case "MIN":return flat.length?Math.min(...flat):0;case "MAX":return flat.length?Math.max(...flat):0;case "COUNT":return flat.length;default:throw new Error("Unknown function");}
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
