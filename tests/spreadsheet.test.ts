import { describe, expect, it } from "vitest";
import { columnIndex, columnLabel, evaluateWorkbook, parseCellAddress } from "../src/lib/spreadsheet";

describe("spreadsheet address helpers", () => {
  it("converts spreadsheet columns in both directions", () => { expect(columnIndex("A")).toBe(0); expect(columnIndex("Z")).toBe(25); expect(columnIndex("AA")).toBe(26); expect(columnLabel(0)).toBe("A"); expect(columnLabel(25)).toBe("Z"); expect(columnLabel(26)).toBe("AA"); expect(columnLabel(701)).toBe("ZZ"); });
  it("parses absolute and relative cell addresses", () => { expect(parseCellAddress("$BC$12")).toEqual({ row: 11, col: 54 }); expect(parseCellAddress("A0")).toBeNull(); });
});
describe("spreadsheet formula engine", () => {
  it("evaluates arithmetic and cell references with precedence", () => {
    const out=evaluateWorkbook([["2","3","=A1+B1*4","=(A1+B1)*4"]]);
    expect(out[0]).toEqual([2,3,14,20]);
  });
  it("evaluates aggregate functions and ranges", () => {
    const out=evaluateWorkbook([["1"],["2"],["3"],["=SUM(A1:A3)","=AVERAGE(A1:A3)","=MIN(A1:A3)","=MAX(A1:A3)","=COUNT(A1:A3)"]]);
    expect(out[3]).toEqual([6,2,1,3,3]);
  });
  it("supports additional numeric and statistical functions", () => {
    const out=evaluateWorkbook([["-8","2","3","=ABS(A1)","=SQRT(B1)","=POWER(B1,C1)","=MOD(-7,3)","=PRODUCT(B1:C1)","=MEDIAN(A1:C1)","=ROUND(1.256,2)","=ROUNDUP(1.231,2)","=ROUNDDOWN(-1.239,2)"]]);
    expect(out[0].slice(3)).toEqual([8,1.4142135624,8,2,6,2,1.26,1.24,-1.23]);
  });
  it("returns formula errors for invalid numeric function arguments", () => {
    expect(evaluateWorkbook([["=SQRT(-1)","=ROUND(1,11)","=MOD(1,0)","=ABS(1,2)"]])[0]).toEqual(["#ERROR!","#ERROR!","#DIV/0!","#ERROR!"]);
  });
  it("detects circular references and division by zero", () => {
    const out=evaluateWorkbook([["=B1","=A1","=1/0"]]);
    expect(out[0]).toEqual(["#CYCLE!","#CYCLE!","#DIV/0!"]);
  });
  it("returns an error for unsupported or malformed formulas", () => {
    expect(evaluateWorkbook([["=POWER(2,3)","=1+"]])[0]).toEqual([8,"#ERROR!"]);
  });
});

describe("spreadsheet sorting and filtering", () => {
  it("sorts by numeric or text values, keeps blanks last and preserves stable ties", async () => {
    const { sortWorkbookRows } = await import("../src/lib/spreadsheet");
    expect(sortWorkbookRows([["Name","Score"],["A","10"],["B","2"],["C",""],["D","2"]],1,"ascending",true))
      .toEqual([["Name","Score"],["B","2"],["D","2"],["A","10"],["C",""]]);
    expect(sortWorkbookRows([["A"],["c"],["a"],["b"]],0,"descending"))
      .toEqual([["c"],["b"],["A"],["a"]]);
    expect(sortWorkbookRows([["Item","=2"],["A","=10"],["B","=3"]],1,"ascending",true,[["Item",2],["A",10],["B",3]]))
      .toEqual([["Item","=2"],["B","=3"],["A","=10"]]);
  });
  it("filters by raw or calculated cell text and returns original row indexes", async () => {
    const { filterWorkbookRowIndexes } = await import("../src/lib/spreadsheet");
    const raw = [["Item","Formula"],["Lamp","=2+2"],["Fan","=3+3"],["Lamp shade",""]];
    const calculated = [["Item","Formula"],["Lamp",4],["Fan",6],["Lamp shade",""]];
    expect(filterWorkbookRowIndexes(raw,"lamp",calculated)).toEqual([1,3]);
    expect(filterWorkbookRowIndexes(raw,"6",calculated)).toEqual([2]);
    expect(filterWorkbookRowIndexes(raw,"")).toEqual([0,1,2,3]);
  });
});

describe("spreadsheet row and column editing", () => {
  it("inserts and deletes rows at selected positions without mutating input", async () => {
    const { insertWorkbookRow, deleteWorkbookRow } = await import("../src/lib/spreadsheet");
    const source = [["a","b"],["c","d"]];
    expect(insertWorkbookRow(source,1)).toEqual([["a","b"],["",""],["c","d"]]);
    expect(deleteWorkbookRow(source,0)).toEqual([["c","d"]]);
    expect(source).toEqual([["a","b"],["c","d"]]);
    expect(deleteWorkbookRow([["only"]],0)).toEqual([[""]]);
  });
  it("inserts and deletes columns across all rows", async () => {
    const { insertWorkbookColumn, deleteWorkbookColumn } = await import("../src/lib/spreadsheet");
    expect(insertWorkbookColumn([["a","b"],["c"]],1)).toEqual([["a","","b"],["c",""]]);
    expect(deleteWorkbookColumn([["a","b"],["c","d"]],0)).toEqual([["b"],["d"]]);
  });
});

describe("spreadsheet validation backup normalization", () => {
  it("keeps only bounded, valid column dropdown lists from imported data", async () => {
    const { sanitizeColumnValidations } = await import("../src/lib/spreadsheet");
    expect(sanitizeColumnValidations({ "0": [" Open ", "Done", "Open"], "2": ["A".repeat(2)], "-1": ["bad"], "x": ["bad"], "3": "bad" }))
      .toEqual({ "0": ["Open", "Done"], "2": ["AA"] });
    expect(sanitizeColumnValidations(null)).toEqual({});
  });
});

describe("spreadsheet dropdown validation", () => {
  it("accepts allowed values case-insensitively and permits blanks by default", async () => {
    const { validateCellValue } = await import("../src/lib/spreadsheet");
    const rule = { type: "list" as const, options: ["Open", "In progress", "Done"] };
    expect(validateCellValue("open", rule).valid).toBe(true);
    expect(validateCellValue("", rule).valid).toBe(true);
    expect(validateCellValue("=A1", rule).valid).toBe(true);
  });
  it("rejects values outside the dropdown and can disallow blanks", async () => {
    const { validateCellValue } = await import("../src/lib/spreadsheet");
    const rule = { type: "list" as const, options: ["Red", "Green"], allowBlank: false };
    expect(validateCellValue("Blue", rule)).toEqual({ valid: false, reason: "Choose a value from the column dropdown list." });
    expect(validateCellValue("", rule).valid).toBe(false);
    expect(validateCellValue("Green", rule).valid).toBe(true);
  });
});

describe("spreadsheet numeric and date validation", () => {
  it("validates numeric values, inclusive bounds, blanks and formulas", async () => {
    const { validateNumericDateCellValue } = await import("../src/lib/spreadsheet");
    const rule = { type: "number" as const, min: 1, max: 10, allowBlank: false };
    expect(validateNumericDateCellValue("5", rule).valid).toBe(true);
    expect(validateNumericDateCellValue("0", rule).valid).toBe(false);
    expect(validateNumericDateCellValue("11", rule).valid).toBe(false);
    expect(validateNumericDateCellValue("five", rule).valid).toBe(false);
    expect(validateNumericDateCellValue("", rule).valid).toBe(false);
    expect(validateNumericDateCellValue("=A1", rule).valid).toBe(true);
  });
  it("validates real ISO dates and date bounds", async () => {
    const { validateNumericDateCellValue } = await import("../src/lib/spreadsheet");
    const rule = { type: "date" as const, min: "2026-01-01", max: "2026-12-31" };
    expect(validateNumericDateCellValue("2026-06-15", rule).valid).toBe(true);
    expect(validateNumericDateCellValue("2025-12-31", rule).valid).toBe(false);
    expect(validateNumericDateCellValue("2027-01-01", rule).valid).toBe(false);
    expect(validateNumericDateCellValue("2026-02-30", rule).valid).toBe(false);
    expect(validateNumericDateCellValue("", rule).valid).toBe(true);
  });
  it("sanitizes persisted numeric/date rules and drops inverted bounds", async () => {
    const { sanitizeColumnConstraints } = await import("../src/lib/spreadsheet");
    expect(sanitizeColumnConstraints({ "0": { type: "number", min: 1, max: 5, allowBlank: false }, "1": { type: "date", min: "2026-01-01" }, "2": { type: "number", min: 9, max: 2 }, "bad": { type: "number" } }))
      .toEqual({ "0": { type: "number", min: 1, max: 5, allowBlank: false }, "1": { type: "date", min: "2026-01-01", allowBlank: true } });
  });
});


describe("spreadsheet cell formatting", () => {
  it("sanitizes cell formatting and rejects malformed keys and unsafe colors", async () => {
    const { sanitizeCellFormats } = await import("../src/lib/spreadsheet");
    expect(sanitizeCellFormats({
      "0:0": { bold: true, italic: false, align: "center", numberFormat: "currency", fillColor: "#aabbcc", textColor: "red", wrap: true },
      "1:2": { underline: true, align: "diagonal", fillColor: "url(javascript:alert(1))" },
      "-1:0": { bold: true },
      "2:3": "invalid"
    })).toEqual({
      "0:0": { bold: true, italic: false, align: "center", numberFormat: "currency", fillColor: "#AABBCC", wrap: true },
      "1:2": { underline: true }
    });
    expect(sanitizeCellFormats(null)).toEqual({});
  });

  it("formats numeric display values without changing source cell values", async () => {
    const { formatCellDisplay } = await import("../src/lib/spreadsheet");
    expect(formatCellDisplay(0.25, { numberFormat: "percent" })).toBe("25%");
    expect(formatCellDisplay(1234.5, { numberFormat: "number" })).toContain("1,234.5");
    expect(formatCellDisplay("not numeric", { numberFormat: "currency" })).toBe("not numeric");
    expect(formatCellDisplay(42, { numberFormat: "general" })).toBe("42");
  });
});
