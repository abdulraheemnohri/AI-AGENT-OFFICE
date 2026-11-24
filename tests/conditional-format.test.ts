import { describe, expect, it } from "vitest";
import { getConditionalCellStyle, matchesConditionalRule, sanitizeConditionalRules } from "../src/lib/conditional-format";

describe("conditional formatting", () => {
  it("matches numeric comparison and inclusive between rules", () => {
    const greater = { id: "g1", column: 1, operator: "greaterThan" as const, value: "10", backgroundColor: "#ff0000", enabled: true };
    const between = { id: "b1", column: 1, operator: "between" as const, value: "5", value2: "15", enabled: true };
    expect(matchesConditionalRule(11, greater)).toBe(true);
    expect(matchesConditionalRule(10, greater)).toBe(false);
    expect(matchesConditionalRule(15, between)).toBe(true);
    expect(matchesConditionalRule("not a number", between)).toBe(false);
  });

  it("supports case-insensitive text matching and disabled rules", () => {
    const contains = { id: "c1", column: 0, operator: "contains" as const, value: "lamp", enabled: true };
    const disabled = { ...contains, enabled: false };
    expect(matchesConditionalRule("Desk Lamp", contains)).toBe(true);
    expect(matchesConditionalRule("Desk fan", contains)).toBe(false);
    expect(matchesConditionalRule("Desk Lamp", disabled)).toBe(false);
  });

  it("uses first matching rule and restricts rules to their configured column", () => {
    const rules = [
      { id: "first", column: 2, operator: "greaterThan" as const, value: "5", backgroundColor: "#aabbcc", enabled: true },
      { id: "second", column: 2, operator: "greaterThan" as const, value: "1", textColor: "#112233", enabled: true }
    ];
    expect(getConditionalCellStyle(8, rules, 2)).toEqual({ backgroundColor: "#AABBCC" });
    expect(getConditionalCellStyle(8, rules, 1)).toEqual({});
  });

  it("sanitizes imported rule metadata and rejects unsafe colors and invalid columns", () => {
    expect(sanitizeConditionalRules({
      "0": [{ id: "rule_1", column: 1, operator: "between", value: "2", value2: "8", backgroundColor: "#aabbcc", textColor: "red", enabled: true }],
      "-1": [{ id: "bad", column: 0, operator: "equal", value: "x" }],
      "1": [{ id: "bad", column: -1, operator: "equal", value: "x" }]
    })).toEqual({
      "0": [{ id: "rule_1", column: 1, operator: "between", value: "2", value2: "8", backgroundColor: "#AABBCC", enabled: true }]
    });
    expect(sanitizeConditionalRules(null)).toEqual({});
  });
});
