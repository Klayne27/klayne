export const ActivityFeedSkeleton = () => (
  <div className="flex flex-col gap-1 rounded-2xl border border-accent/10 bg-base-200/40 p-3">
    <div className="flex items-center">
      {/* Avatar */}
      <div className="skeleton size-12 shrink-0 rounded-full"></div>

      {/* Name & Level */}
      <div className="ml-4 flex-1 space-y-2">
        <div className="skeleton h-4 w-32"></div>
        <div className="skeleton h-3 w-16"></div>
      </div>

      {/* Status/Duration area */}
      <div className="flex flex-col items-end gap-2">
        <div className="skeleton h-4 w-20"></div>
        <div className="skeleton h-5 w-12"></div>
      </div>
    </div>

    {/* Footer Timestamp Area */}
    <div className="mt-4 flex justify-between border-t border-accent/5 pt-3">
      <div className="skeleton h-3 w-16"></div>
      <div className="skeleton h-3 w-24"></div>
    </div>
  </div>
)
