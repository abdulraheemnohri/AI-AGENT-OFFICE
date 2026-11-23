import { describe, expect, it } from "vitest";
import { parseCsv, stringifyCsv } from "../src/lib/csv";

describe("CSV parser and serializer", () => {
  it("parses commas, quoted commas and escaped quotes", () => {
    expect(parseCsv('name,notes\r\nAbdul,"hello, world"\r\nA,"say ""yes"""')).toEqual([
      ["name", "notes"], ["Abdul", "hello, world"], ["A", 'say "yes"']
    ]);
  });
  it("preserves embedded newlines and trailing empty cells", () => {
    expect(parseCsv('a,"line 1\nline 2",\r\nx,y,')).toEqual([
      ["a", "line 1\nline 2", ""], ["x", "y", ""]
    ]);
  });
  it("round trips arbitrary cell content", () => {
    const table = [["a,b", 'a"b', "two\nlines", ""], ["1", "2", "3", ""]];
    expect(parseCsv(stringifyCsv(table))).toEqual(table);
  });
  it("rejects malformed quote placement", () => {
    expect(() => parseCsv('a,"unfinished')).toThrow(/unclosed/);
    expect(() => parseCsv('"quoted"x,2')).toThrow(/after a closing/);
  });
  it("supports a custom one-character delimiter", () => {
    expect(parseCsv("a;b\n1;2", ";")).toEqual([["a", "b"], ["1", "2"]]);
  });
});
