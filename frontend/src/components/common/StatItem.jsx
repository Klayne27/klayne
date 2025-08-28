export const StatItem = ({ label, value, colorClass, icon }) => (
  <div className="flex items-center space-x-3">
    <div className={`rounded-full p-2 ${colorClass}`}>{icon}</div>
    <div className="flex flex-col">
      <span className="text-lg font-bold text-base-content-inverse">{value}</span>
      <span className="text-xs text-neutral-400">{label}</span>
    </div>
  </div>
)
