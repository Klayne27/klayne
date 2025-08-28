
import { formatShortDuration } from "../../utils/dashboardUtils"

export const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    // The name we need for the tooltip is in the payload.name property of the first element
    const data = payload[0].payload
    const value = payload[0].value

    // Determine the type (time or count)
    const type = payload[0].dataKey
    const valueLabel = type === "time" ? `${formatShortDuration(value)}` : `${value} tasks`

    return (
      <div className="rounded-md border border-gray-700 bg-gray-800/90 p-2 text-xs text-gray-200">
        <p className="font-semibold text-white">{data.tooltipName}</p>
        <p className="text-gray-400">{valueLabel}</p>
      </div>
    )
  }
  return null
}
