import { useState } from "react";
import { columnLabel } from "../lib/spreadsheet";
import type { ConditionalFormatRule, ConditionalRuleOperator } from "../lib/conditional-format";

type Props = {
  rules: ConditionalFormatRule[];
  onChange: (rules: ConditionalFormatRule[]) => void;
  columnCount: number;
  headers: string[];
};

const operators: { value: ConditionalRuleOperator; label: string }[] = [
  { value: "greaterThan", label: "Greater than" },
  { value: "lessThan", label: "Less than" },
  { value: "equal", label: "Equals" },
  { value: "notEqual", label: "Does not equal" },
  { value: "between", label: "Between" },
  { value: "contains", label: "Text contains" }
];

export function ConditionalFormattingPanel({ rules, onChange, columnCount, headers }: Props) {
  const [column, setColumn] = useState(0);
  const [operator, setOperator] = useState<ConditionalRuleOperator>("greaterThan");
  const [value, setValue] = useState("0");
  const [value2, setValue2] = useState("100");
  const [backgroundColor, setBackgroundColor] = useState("#fff2cc");
  const [textColor, setTextColor] = useState("#7f3f00");
  const addRule = () => {
    const rule: ConditionalFormatRule = {
      id: crypto.randomUUID(),
      column,
      operator,
      value: value.slice(0, 120),
      ...(operator === "between" ? { value2: value2.slice(0, 120) } : {}),
      backgroundColor,
      textColor,
      enabled: true
    };
    onChange([...rules, rule]);
  };
  return <section style={{ margin: "12px 0", padding: 14, border: "1px solid var(--border, #343a46)", borderRadius: 10, background: "var(--panel, #171b24)" }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
      <strong style={{ fontSize: 14 }}>Conditional formatting</strong><span style={{ opacity: .7, fontSize: 12 }}>{rules.length} rules</span>
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "end", gap: 8, marginTop: 10 }}>
      <label style={{ display: "grid", gap: 4, fontSize: 12 }}>Column<select value={column} onChange={event => setColumn(Number(event.target.value))}>{Array.from({ length: Math.max(1, Math.min(100, columnCount)) }, (_, index) => <option key={index} value={index}>{columnLabel(index)} · {headers[index] || "Column " + columnLabel(index)}</option>)}</select></label>
      <label style={{ display: "grid", gap: 4, fontSize: 12 }}>Condition<select value={operator} onChange={event => setOperator(event.target.value as ConditionalRuleOperator)}>{operators.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      <label style={{ display: "grid", gap: 4, fontSize: 12 }}>{operator === "contains" ? "Text" : "Value"}<input value={value} onChange={event => setValue(event.target.value)} maxLength={120}/></label>
      {operator === "between" && <label style={{ display: "grid", gap: 4, fontSize: 12 }}>And<input value={value2} onChange={event => setValue2(event.target.value)} maxLength={120}/></label>}
      <label style={{ display: "grid", gap: 4, fontSize: 12 }}>Fill<input type="color" value={backgroundColor} onChange={event => setBackgroundColor(event.target.value)}/></label>
      <label style={{ display: "grid", gap: 4, fontSize: 12 }}>Text<input type="color" value={textColor} onChange={event => setTextColor(event.target.value)}/></label>
      <button type="button" onClick={addRule} disabled={!value.trim() || (operator === "between" && !value2.trim())}>Add rule</button>
    </div>
    {!!rules.length && <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>{rules.map(rule => <span key={rule.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 8px", borderRadius: 7, background: rule.backgroundColor || "var(--surface, #10141b)", color: rule.textColor || "inherit", border: "1px solid var(--border, #343a46)", fontSize: 11 }}><span>{columnLabel(rule.column)} {operators.find(item => item.value === rule.operator)?.label} {rule.value}{rule.operator === "between" ? " – " + rule.value2 : ""}</span><button type="button" className="secondary" onClick={() => onChange(rules.filter(item => item.id !== rule.id))}>×</button></span>)}</div>}
    <p style={{ margin: "8px 0 0", opacity: .65, fontSize: 11 }}>Rules apply to calculated cell values. The first matching rule for a column wins.</p>
  </section>;
}
