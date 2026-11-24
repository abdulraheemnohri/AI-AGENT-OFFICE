export type ConditionalRuleOperator = "greaterThan" | "lessThan" | "equal" | "notEqual" | "between" | "contains";

export type ConditionalFormatRule = {
  id: string;
  column: number;
  operator: ConditionalRuleOperator;
  value: string;
  value2?: string;
  backgroundColor?: string;
  textColor?: string;
  enabled: boolean;
};

export type ConditionalCellStyle = {
  backgroundColor?: string;
  color?: string;
};

const validColor = (value: unknown): string | undefined =>
  typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value.toUpperCase() : undefined;

export function sanitizeConditionalRules(value: unknown): Record<string, ConditionalFormatRule[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: Record<string, ConditionalFormatRule[]> = {};
  for (const [sheetKey, rawRules] of Object.entries(value as Record<string, unknown>)) {
    if (!/^(0|[1-9]\d{0,2})$/.test(sheetKey) || !Array.isArray(rawRules)) continue;
    const rules: ConditionalFormatRule[] = [];
    for (const raw of rawRules.slice(0, 100)) {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
      const item = raw as Record<string, unknown>;
      if (typeof item.id !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(item.id)) continue;
      if (!Number.isInteger(item.column) || (item.column as number) < 0 || (item.column as number) > 999) continue;
      const operators: ConditionalRuleOperator[] = ["greaterThan", "lessThan", "equal", "notEqual", "between", "contains"];
      if (!operators.includes(item.operator as ConditionalRuleOperator) || typeof item.value !== "string") continue;
      const backgroundColor = validColor(item.backgroundColor);
      const textColor = validColor(item.textColor);
      rules.push({
        id: item.id,
        column: item.column as number,
        operator: item.operator as ConditionalRuleOperator,
        value: item.value.slice(0, 120),
        ...(typeof item.value2 === "string" ? { value2: item.value2.slice(0, 120) } : {}),
        ...(backgroundColor ? { backgroundColor } : {}),
        ...(textColor ? { textColor } : {}),
        enabled: item.enabled !== false
      });
    }
    if (rules.length) result[sheetKey] = rules;
  }
  return result;
}

function numericValue(value: string | number): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function matchesConditionalRule(value: string | number, rule: ConditionalFormatRule): boolean {
  if (!rule.enabled) return false;
  if (rule.operator === "contains") return String(value).toLocaleLowerCase().includes(rule.value.toLocaleLowerCase());
  if (rule.operator === "equal" || rule.operator === "notEqual") {
    const leftNumber = numericValue(value);
    const rightNumber = numericValue(rule.value);
    const equal = leftNumber !== null && rightNumber !== null
      ? leftNumber === rightNumber
      : String(value).localeCompare(rule.value, undefined, { sensitivity: "accent" }) === 0;
    return rule.operator === "equal" ? equal : !equal;
  }
  const current = numericValue(value);
  const first = numericValue(rule.value);
  if (current === null || first === null) return false;
  if (rule.operator === "greaterThan") return current > first;
  if (rule.operator === "lessThan") return current < first;
  if (rule.operator === "between") {
    const second = rule.value2 === undefined ? null : numericValue(rule.value2);
    return second !== null && current >= Math.min(first, second) && current <= Math.max(first, second);
  }
  return false;
}

/** First matching enabled rule wins, matching the familiar spreadsheet rule-priority model. */
export function getConditionalCellStyle(
  value: string | number,
  rules: ConditionalFormatRule[],
  column: number
): ConditionalCellStyle {
  const rule = rules.find(item => item.column === column && matchesConditionalRule(value, item));
  if (!rule) return {};
  const backgroundColor = validColor(rule.backgroundColor);
  const color = validColor(rule.textColor);
  return {
    ...(backgroundColor ? { backgroundColor } : {}),
    ...(color ? { color } : {})
  };
}
