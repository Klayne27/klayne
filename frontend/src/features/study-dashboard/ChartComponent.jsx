// Import from the specific 'es6' paths to help the bundler tree-shake effectively
import { ResponsiveContainer } from "recharts/es6/component/ResponsiveContainer"
import { BarChart } from "recharts/es6/chart/BarChart"
import { Bar } from "recharts/es6/cartesian/Bar"
import { LineChart } from "recharts/es6/chart/LineChart"
import { Line } from "recharts/es6/cartesian/Line"
import { XAxis } from "recharts/es6/cartesian/XAxis"
import { YAxis } from "recharts/es6/cartesian/YAxis"
import { Tooltip } from "recharts/es6/component/Tooltip"

import { CustomTooltip } from "../../components/common/CustomToolTip"

const ChartComponent = ({ data, view, type, color }) => {
  const isWeekly = view === "weekly"

  // Dynamic selection is fine as long as both are imported above
  const Chart = isWeekly ? BarChart : LineChart
  const DataComponent = isWeekly ? Bar : Line
  const bottomValue = isWeekly ? 0 : 5

  return (
    <div className="relative h-48">
      <ResponsiveContainer width="100%" height="100%">
        <Chart data={data} margin={{ top: 10, right: 10, left: 10, bottom: bottomValue }}>
          {!isWeekly ? (
            <XAxis dataKey="name" hide />
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

export default ChartComponent