function FloatingPomodoroSkeleton() {
  return (
    <div className="mt-2 rounded-2xl border border-accent bg-base-100 p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pomodoro</span>

        <div className="skeleton h-3 w-10"></div>
      </div>

      <div className="flex items-center gap-4">
        {/* Circular timer placeholder */}
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center">
          <div className="skeleton h-12 w-12 rounded-full"></div>
        </div>

        {/* Text content */}
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-28"></div>
          <div className="skeleton h-3 w-20"></div>
        </div>

        {/* Play/Pause button */}
        <div className="skeleton h-8 w-8 rounded-full"></div>
      </div>
    </div>
  )
}

export default FloatingPomodoroSkeleton
