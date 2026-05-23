import { memo, useEffect, useRef, useState } from "react"
import { FaFlag, FaPause, FaPlay, FaRotateLeft } from "react-icons/fa6"
import { useStopwatchStore } from "../../../store/useStopwatchStore"

// ── Format: MM:SS.cc ──────────────────────────────────────────────────────────
const fmt = (ms) => {
  const cs = Math.floor(ms / 10) % 100
  const s = Math.floor(ms / 1000) % 60
  const m = Math.floor(ms / 60000)
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`
}

// ── SVG clock constants ───────────────────────────────────────────────────────
const CX = 100,
  CY = 100,
  R = 82
const toRad = (deg) => (deg * Math.PI) / 180
const pointAt = (r, deg, cx = CX, cy = CY) => ({
  x: cx + r * Math.cos(toRad(deg - 90)),
  y: cy + r * Math.sin(toRad(deg - 90)),
})

const TICKS = Array.from({ length: 60 }, (_, i) => {
  const deg = (i / 60) * 360
  const isVeryMajor = i % 15 === 0
  const isMajor = i % 5 === 0
  return {
    from: pointAt(isVeryMajor ? R - 14 : isMajor ? R - 9 : R - 5, deg),
    to: pointAt(R - 1, deg),
    isMajor,
    isVeryMajor,
  }
})

const LABELS = Array.from({ length: 12 }, (_, i) => i * 5).map((s) => ({
  s: s === 0 ? "60" : s,
  ...pointAt(R - 22, (s / 60) * 360),
}))

const MINI_CX = 100,
  MINI_CY = 142,
  MINI_R = 22

const MINI_TICKS = Array.from({ length: 30 }, (_, i) => {
  const deg = (i / 30) * 360
  const isMajor = i % 5 === 0
  return {
    from: pointAt(MINI_R - (isMajor ? 4 : 2), deg, MINI_CX, MINI_CY),
    to: pointAt(MINI_R, deg, MINI_CX, MINI_CY),
    isMajor,
  }
})

const MINI_LABELS = Array.from({ length: 6 }, (_, i) => i * 5).map((m) => ({
  m: m === 0 ? "30" : m,
  ...pointAt(MINI_R - 8, (m / 30) * 360, MINI_CX, MINI_CY),
}))

// ── Animated arm using CSS transform on a <g> ─────────────────────────────────
// We rotate the whole group around the pivot (cx, cy) so the arm always
// points correctly. Using a CSS rotate() instead of computing x2/y2 means
// we can attach a CSS transition and let the browser interpolate.
//
// Reset animation: when resetting we animate *forward* to 360° (≡ 0°) so the
// hand sweeps clockwise to the top rather than spinning backwards.
const Arm = ({
  cx,
  cy, // pivot point
  length, // arm length in SVG units
  strokeWidth = 2,
  deg, // current angle (0 = 12 o'clock)
  animating, // true during reset sweep
  className = "stroke-primary",
  children, // optional extra elements at the pivot
}) => {
  // tipY is above the pivot by `length`
  const tipX = cx
  const tipY = cy - length

  // During reset: animate to 360 (same as 0, but clockwise from current pos)
  const rotateTo = animating ? -360 : deg

  return (
    <g
      style={{
        transformOrigin: `${cx}px ${cy}px`,
        transform: `rotate(${rotateTo}deg)`,
        transition: animating ? "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)" : "none",
      }}
    >
      <line
        x1={cx}
        y1={cy}
        x2={tipX}
        y2={tipY}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        className={className}
      />
      {children}
    </g>
  )
}

// ── Clock face ────────────────────────────────────────────────────────────────
const Clock = memo(({ totalMs, lapMs, lapNum, resetting }) => {
  const mainDeg = ((totalMs % 60000) / 60000) * 360
  const minDeg = ((totalMs % 1800000) / 1800000) * 360

  return (
    <svg viewBox="0 0 200 200" className="h-full w-full select-none drop-shadow-sm">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* Main Face */}
      <circle cx={CX} cy={CY} r={R + 6} className="fill-base-200/50" />
      <circle cx={CX} cy={CY} r={R + 2} className="fill-base-100" />
      <circle cx={CX} cy={CY} r={R} className="fill-none stroke-base-300" strokeWidth={1} />

      {/* Main Ticks */}
      {TICKS.map(({ from, to, isMajor, isVeryMajor }, i) => (
        <line
          key={`tick-${i}`}
          x1={from.x}
          y1={from.y}
          x2={to.x}
          y2={to.y}
          strokeLinecap="round"
          strokeWidth={isVeryMajor ? 2.5 : isMajor ? 1.5 : 0.8}
          className={
            isVeryMajor
              ? "stroke-base-content/90"
              : isMajor
                ? "stroke-base-content/60"
                : "stroke-base-content/25"
          }
        />
      ))}

      {/* Main Labels */}
      {LABELS.map(({ s, x, y }) => (
        <text
          key={`label-${s}`}
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="8"
          fontWeight="600"
          style={{ fontFamily: "sans-serif" }}
          className="fill-base-content/40"
        >
          {s}
        </text>
      ))}

      {/* Mini Dial */}
      <circle cx={MINI_CX} cy={MINI_CY} r={MINI_R} className="fill-base-200/30" strokeWidth={1} />
      {MINI_TICKS.map(({ from, to, isMajor }, i) => (
        <line
          key={`min-tick-${i}`}
          x1={from.x}
          y1={from.y}
          x2={to.x}
          y2={to.y}
          strokeLinecap="round"
          strokeWidth={isMajor ? 1.5 : 0.8}
          className={isMajor ? "stroke-base-content/80" : "stroke-base-content/30"}
        />
      ))}
      {MINI_LABELS.map(({ m, x, y }) => (
        <text
          key={`min-label-${m}`}
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="5.5"
          fontWeight="bold"
          style={{ fontFamily: "sans-serif" }}
          className="fill-base-content/50"
        >
          {m}
        </text>
      ))}

      {/* Mini Arm — always rendered, animates on reset */}
      <Arm
        cx={MINI_CX}
        cy={MINI_CY}
        length={MINI_R - 2}
        strokeWidth={1.5}
        deg={minDeg}
        animating={resetting}
      >
        <circle cx={MINI_CX} cy={MINI_CY} r={2} className="fill-primary" />
        <circle cx={MINI_CX} cy={MINI_CY} r={0.75} className="fill-base-100" />
      </Arm>

      {/* Digital display */}
      <text
        x={CX}
        y={CY - 42}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="16"
        fontWeight="900"
        style={{ fontFamily: "monospace", fontVariantNumeric: "tabular-nums" }}
        className="fill-primary drop-shadow-sm"
      >
        {fmt(totalMs)}
      </text>

      {lapNum > 1 && (
        <text
          x={CX}
          y={CY - 22}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="10"
          fontWeight="700"
          style={{ fontFamily: "monospace", fontVariantNumeric: "tabular-nums" }}
          className="fill-slate-500/60 drop-shadow-sm"
        >
          {fmt(lapMs)}
        </text>
      )}

      {/* Main Arm — always rendered, animates on reset */}
      <Arm
        cx={CX}
        cy={CY}
        length={R - 15}
        strokeWidth={2}
        deg={mainDeg}
        animating={resetting}
        className="stroke-primary"
      />

      {/* Hub */}
      <circle cx={CX} cy={CY} r={4.5} className="fill-base-content" />
      <circle cx={CX} cy={CY} r={2} className="fill-base-100" />
    </svg>
  )
})

// ── Stopwatch ─────────────────────────────────────────────────────────────────
const Stopwatch = () => {
  const { isRunning, startTime, accumulatedMs, lapStartMs, laps, start, pause, lap, reset } =
    useStopwatchStore()

  const [now, setNow] = useState(Date.now)
  const [resetting, setResetting] = useState(false) // drives reset animation
  const rafRef = useRef(null)
  const resetTimerRef = useRef(null)

  // RAF ticker
  useEffect(() => {
    cancelAnimationFrame(rafRef.current)
    if (!isRunning) return
    const tick = () => {
      setNow(Date.now())
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [isRunning])

const totalMs = isRunning && startTime ? accumulatedMs + Math.max(0, now - startTime) : accumulatedMs  
const lapMs = totalMs - lapStartMs
  const started = totalMs > 0 || laps.length > 0

  const handleReset = () => {
    if (!started || isRunning) return

    // 1. Trigger the sweep-to-360 animation
    setResetting(true)

    // 2. After the transition (600ms) actually zero the store and un-flag
    clearTimeout(resetTimerRef.current)
    resetTimerRef.current = setTimeout(() => {
      reset()
      setResetting(false)
    }, 600)
  }

  useEffect(() => () => clearTimeout(resetTimerRef.current), [])

  const shortestMs = laps.length > 1 ? Math.min(...laps.map((l) => l.lapMs)) : null
  const longestMs = laps.length > 1 ? Math.max(...laps.map((l) => l.lapMs)) : null
  const hasColors = shortestMs !== null && shortestMs !== longestMs

  return (
    <section className="mx-auto w-full max-w-2xl px-4 pb-20">
      <div className="flex flex-col items-center">
        <div className="mt-4 w-full max-w-[320px]">
          <Clock totalMs={totalMs} lapMs={lapMs} lapNum={laps.length + 1} resetting={resetting} />
        </div>

        {/* Controls */}
        <div className="mt-8 flex items-center justify-center gap-8">
          <button
            onClick={lap}
            disabled={!isRunning}
            className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-full border border-base-300 bg-base-100 text-base-content shadow-sm transition-all active:scale-90 enabled:hover:bg-base-200 enabled:hover:shadow-md disabled:cursor-default disabled:opacity-30"
          >
            <FaFlag size={16} />
            <span className="text-[8px] font-black uppercase tracking-widest opacity-60">Lap</span>
          </button>

          <button
            onClick={isRunning ? pause : start}
            className={`flex h-[76px] w-[76px] items-center justify-center rounded-full text-white shadow-xl transition-all active:scale-90 ${
              isRunning
                ? "bg-red-500 shadow-red-500/30 hover:bg-red-400"
                : "bg-emerald-500 shadow-emerald-500/30 hover:bg-emerald-400"
            }`}
          >
            {isRunning ? <FaPause size={26} /> : <FaPlay size={26} className="ml-1.5" />}
          </button>

          <button
            onClick={handleReset}
            disabled={!started || isRunning}
            className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-full border border-base-300 bg-base-100 text-base-content shadow-sm transition-all active:scale-90 enabled:hover:bg-base-200 enabled:hover:shadow-md disabled:cursor-default disabled:opacity-30"
          >
            <FaRotateLeft size={16} />
            <span className="text-[8px] font-black uppercase tracking-widest opacity-60">
              Reset
            </span>
          </button>
        </div>
      </div>

      {/* Lap table */}
      {started && (
        <div className="mt-12 max-h-[320px] overflow-y-auto rounded-2xl border border-base-300 bg-base-100/60 shadow-lg backdrop-blur-md">
          <table className="w-full text-left">
            <thead className="sticky top-0 z-10 bg-base-200/95 shadow-sm backdrop-blur">
              <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-base-content/50">
                <th className="py-4 pl-6 text-left">Lap</th>
                <th className="py-4 text-center">Lap Time</th>
                <th className="py-4 pr-6 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-300/50">
              <tr className="transition-colors hover:bg-primary/10">
                <td className="py-3.5 pl-6 text-sm font-bold text-primary">
                  {String(laps.length + 1).padStart(2, "0")}
                </td>
                <td className="py-3.5 text-center font-mono text-sm font-medium tabular-nums text-primary/80">
                  {fmt(lapMs)}
                </td>
                <td className="py-3.5 pr-6 text-right font-mono text-sm font-medium tabular-nums text-primary/60">
                  {fmt(totalMs)}
                </td>
              </tr>

              {[...laps].reverse().map((l) => {
                const isShortest = hasColors && l.lapMs === shortestMs
                const isLongest = hasColors && l.lapMs === longestMs
                const color = isShortest
                  ? "text-emerald-500"
                  : isLongest
                    ? "text-red-400"
                    : "text-base-content/80"
                return (
                  <tr key={l.index} className={`transition-colors hover:bg-base-200/30 ${color}`}>
                    <td className="py-3 pl-6 text-sm font-semibold opacity-70">
                      {String(l.index).padStart(2, "0")}
                    </td>
                    <td className="py-3 text-center font-mono text-sm tabular-nums">
                      +{fmt(l.lapMs)}
                    </td>
                    <td className="py-3 pr-6 text-right font-mono text-sm tabular-nums opacity-60">
                      {fmt(l.totalMs)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default Stopwatch
