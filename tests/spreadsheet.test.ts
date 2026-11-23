import { describe, expect, it } from "vitest";
import { columnIndex, evaluateWorkbook, parseCellAddress } from "../src/lib/spreadsheet";

describe("spreadsheet address helpers", () => {
  it("converts spreadsheet columns", () => { expect(columnIndex("A")).toBe(0); expect(columnIndex("Z")).toBe(25); expect(columnIndex("AA")).toBe(26); });
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
  it("detects circular references and division by zero", () => {
    const out=evaluateWorkbook([["=B1","=A1","=1/0"]]);
    expect(out[0]).toEqual(["#CYCLE!","#CYCLE!","#DIV/0!"]);
  });
  it("returns an error for unsupported or malformed formulas", () => {
    expect(evaluateWorkbook([["=POWER(2,3)","=1+"]])[0]).toEqual(["#ERROR!","#ERROR!"]);
  });
});
