import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts"
import { CustomTooltip } from "../../components/common/CustomToolTip"

export const ChartComponent = ({ data, view, type, color, tooltipFormatter }) => {
  const isWeekly = view === "weekly"

  const tooltipStyles = {
    backgroundColor: "#1c1917",
    border: "none",
    borderRadius: "8px",
    fontSize: "12px",
  }
  const tooltipItemStyles = { color: "#e5e7eb" }

  const Chart = isWeekly ? BarChart : LineChart
  const DataComponent = isWeekly ? Bar : Line
  const bottomValue = isWeekly ? 0 : 5

  return (
    <div className="relative h-48">
      <ResponsiveContainer width="100%" height="100%">
        <Chart data={data} margin={{ top: 10, right: 10, left: 10, bottom: bottomValue }}>
          {!isWeekly ? (
            <XAxis datakey="name" hide />
          ) : (
            <XAxis dataKey="name" stroke="#525252" axisLine={false} tickLine={false} interval={0} />
          )}
          <YAxis hide />
          <Tooltip content={<CustomTooltip />} />
          <DataComponent
            type="monotone"
            dataKey={type}
            fill={isWeekly ? color : undefined}
            stroke={isWeekly ? undefined : color}
            radius={isWeekly ? [4, 4, 0, 0] : undefined}
          />
        </Chart>
      </ResponsiveContainer>
    </div>
  )
}
