import { CircularProgressbar, buildStyles } from "react-circular-progressbar"
import "react-circular-progressbar/dist/styles.css"
import { getCssVar } from "../../utils/dashboardUtils"
import { BentoCard } from "../../components/common/BentoCard"

export const GoalProgressCard = ({
  title,
  dailyLabel,
  weeklyLabel,
  goalView,
  setGoalView,
  progress,
  currentCount,
  currentGoal,
  color,
  unit,
}) => {
  const baseContentInverseColor = getCssVar("--text-on-base-color")

  const progressBarColor = color === "purple" ? "168, 85, 247" : "34, 197, 94"

  return (
    <BentoCard className="md:col-span-1">
      <div className="mb-4 flex flex-col items-center justify-between md:flex-row">
        <h3 className="text-md mb-1 font-semibold">
          {goalView === "daily" ? dailyLabel : weeklyLabel}
        </h3>
        <div className="flex">
          <button
            onClick={() => setGoalView("daily")}
            className={`rounded-l-md px-3 py-1 text-xs font-bold transition-colors md:text-sm ${
              goalView === "daily"
                ? `bg-${color}-600 text-white`
                : "bg-base-300 text-neutral-400 hover:bg-secondary"
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setGoalView("weekly")}
            className={`rounded-r-md px-3 py-1 text-xs font-bold transition-colors md:text-sm ${
              goalView === "weekly"
                ? `bg-${color}-600 text-white`
                : "bg-base-300 text-neutral-400 hover:bg-secondary"
            }`}
          >
            Weekly
          </button>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="h-32 w-32">
          <CircularProgressbar
            value={progress}
            text={`${progress.toFixed(1)}%`}
            styles={buildStyles({
              pathColor: `rgba(${progressBarColor}, ${Math.max(progress / 100, 0.3)})`,
              trailColor: "#262626",
              textColor: baseContentInverseColor || "white",
              strokeLinecap: "round",
            })}
          />
        </div>
        <p className="text-sm font-medium text-neutral-400">
          {currentCount} of {currentGoal} {goalView} {unit}
        </p>
      </div>
    </BentoCard>
  )
}
