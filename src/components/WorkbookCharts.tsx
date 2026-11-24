import { useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";
import { columnLabel } from "../lib/spreadsheet";
import { buildWorkbookChartData, type WorkbookChart, type WorkbookChartKind } from "../lib/charts";

type Props = {
  workbook: string[][];
  calculated: (string | number)[][];
  charts: WorkbookChart[];
  onChange: (charts: WorkbookChart[]) => void;
};

const palette = ["#4f8cff", "#16a085", "#e67e22", "#9b59b6", "#d35400", "#2c9cdb"];

export function WorkbookCharts({ workbook, calculated, charts, onChange }: Props) {
  const [title, setTitle] = useState("Sales by category");
  const [kind, setKind] = useState<WorkbookChartKind>("bar");
  const [categoryColumn, setCategoryColumn] = useState(0);
  const [valueColumns, setValueColumns] = useState<number[]>([1]);
  const columnCount = Math.max(1, 8, ...workbook.map(row => row.length));
  const columns = Array.from({ length: Math.min(columnCount, 100) }, (_, index) => ({
    value: index,
    label: String(workbook[0]?.[index] || columnLabel(index)).slice(0, 32)
  }));

  const addChart = () => {
    if (!valueColumns.length) return;
    const chart: WorkbookChart = {
      id: crypto.randomUUID(),
      title: title.trim().slice(0, 120) || "Untitled chart",
      kind,
      categoryColumn,
      valueColumns: kind === "pie" ? valueColumns.slice(0, 1) : valueColumns,
      hasHeader: true
    };
    onChange([...charts, chart]);
  };

  return <section style={{ marginTop: 18, padding: 16, border: "1px solid var(--border, #343a46)", borderRadius: 12, background: "var(--panel, #171b24)" }}>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
      <div><h2 style={{ margin: 0, fontSize: 18 }}>Charts</h2><p style={{ margin: "4px 0 0", opacity: .7, fontSize: 12 }}>Create local charts from this worksheet. Formula results are plotted without changing cells.</p></div>
      <strong style={{ fontSize: 12, opacity: .75 }}>{charts.length} saved</strong>
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "end", margin: "14px 0" }}>
      <label style={{ display: "grid", gap: 4, fontSize: 12 }}>Chart title<input value={title} maxLength={120} onChange={event => setTitle(event.target.value)} style={{ minWidth: 170 }}/></label>
      <label style={{ display: "grid", gap: 4, fontSize: 12 }}>Type<select value={kind} onChange={event => setKind(event.target.value as WorkbookChartKind)}><option value="bar">Bar</option><option value="line">Line</option><option value="pie">Pie</option></select></label>
      <label style={{ display: "grid", gap: 4, fontSize: 12 }}>Category column<select value={categoryColumn} onChange={event => setCategoryColumn(Number(event.target.value))}>{columns.map(column => <option key={column.value} value={column.value}>{columnLabel(column.value)} · {column.label}</option>)}</select></label>
      <label style={{ display: "grid", gap: 4, fontSize: 12 }}>Value columns<select multiple size={3} value={valueColumns.map(String)} onChange={event => setValueColumns(Array.from(event.target.selectedOptions, option => Number(option.value)))} style={{ minWidth: 170 }}>{columns.filter(column => column.value !== categoryColumn).map(column => <option key={column.value} value={column.value}>{columnLabel(column.value)} · {column.label}</option>)}</select></label>
      <button type="button" onClick={addChart} disabled={!valueColumns.length}>Add chart</button>
    </div>
    {!charts.length && <p style={{ opacity: .7, fontSize: 13 }}>No charts yet. Choose a category column and one or more numeric value columns, then add a chart.</p>}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))", gap: 12 }}>
      {charts.map(chart => {
        const data = buildWorkbookChartData(workbook, calculated, chart);
        return <article key={chart.id} style={{ minWidth: 0, padding: 12, border: "1px solid var(--border, #343a46)", borderRadius: 10, background: "var(--surface, #10141b)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}><h3 style={{ margin: 0, fontSize: 14 }}>{chart.title}</h3><button type="button" className="secondary" onClick={() => onChange(charts.filter(item => item.id !== chart.id))}>Remove</button></div>
          {data.length === 0 ? <p style={{ padding: 30, textAlign: "center", opacity: .7 }}>No numeric values to chart. Check the selected columns.</p> : <div style={{ width: "100%", height: 280, marginTop: 8 }}>
            <ResponsiveContainer width="100%" height="100%">
              {chart.kind === "bar" ? <BarChart data={data} margin={{ top: 10, right: 12, left: -12, bottom: 24 }}><CartesianGrid strokeDasharray="3 3" opacity={.2}/><XAxis dataKey="name" tick={{ fontSize: 11 }} interval="preserveStartEnd"/><YAxis tick={{ fontSize: 11 }}/><Tooltip/><Legend/>{chart.valueColumns.map((column, index) => <Bar key={column} dataKey={"series" + column} name={String(workbook[0]?.[column] || columnLabel(column))} fill={palette[index % palette.length]}/>)}</BarChart>
                : chart.kind === "line" ? <LineChart data={data} margin={{ top: 10, right: 12, left: -12, bottom: 24 }}><CartesianGrid strokeDasharray="3 3" opacity={.2}/><XAxis dataKey="name" tick={{ fontSize: 11 }} interval="preserveStartEnd"/><YAxis tick={{ fontSize: 11 }}/><Tooltip/><Legend/>{chart.valueColumns.map((column, index) => <Line key={column} type="monotone" dataKey={"series" + column} name={String(workbook[0]?.[column] || columnLabel(column))} stroke={palette[index % palette.length]} strokeWidth={2} dot={false}/>)}</LineChart>
                  : <PieChart><Tooltip/><Legend/><Pie data={data} dataKey={"series" + chart.valueColumns[0]} nameKey="name" cx="50%" cy="50%" outerRadius="76%" label>{data.map((item, index) => <Cell key={item.name + index} fill={palette[index % palette.length]}/>)}</Pie></PieChart>}
            </ResponsiveContainer>
          </div>}
          <p style={{ margin: "6px 0 0", opacity: .65, fontSize: 11 }}>{chart.kind.toUpperCase()} · {data.length} data rows · {chart.valueColumns.length} value series</p>
        </article>;
      })}
    </div>
  </section>;
}
