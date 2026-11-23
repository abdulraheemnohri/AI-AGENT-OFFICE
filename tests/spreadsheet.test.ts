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
