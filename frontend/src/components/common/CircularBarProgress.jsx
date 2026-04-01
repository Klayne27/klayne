
const CircularBarProgress = ({ progress, size, strokeWidth, progressColor }) => {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        className="text-gray-700"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="transparent"
        r={radius}
        cx={size / 2}
        cy={size / 2}
      />
      <circle
        className={`transition-colors duration-300 ${progressColor}`}
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth={strokeWidth}
        fill="transparent"
        r={radius}
        cx={size / 2}
        cy={size / 2}
        strokeDasharray={circumference}
        style={{
          transition: "stroke-dashoffset 0.35s",
          strokeDashoffset: strokeDashoffset,
          transform: "rotate(-90deg)",
          transformOrigin: "50% 50%",
        }}
        aria-valuenow={progress}
        aria-valuemin="0"
        aria-valuemax="100"
      />
    </svg>
  )
}

export default CircularBarProgress
