import { useState, useEffect, useRef, useCallback } from "react"
import * as chrono from "chrono-node"

/**
 * Parses natural language dates from an input string using chrono-node.
 * Returns the best match, a dismiss function, and a reset function.
 *
 * @param {string} text         - The current input value to parse
 * @param {number} debounceMs   - Delay before parsing (default 350ms)
 */
export const useDateRecognition = (text, debounceMs = 350) => {
  const [result, setResult] = useState(null) // { date, matchedText, matchedIndex }
  const debounceRef = useRef(null)
  const dismissedTextRef = useRef(null) // tracks last dismissed match text

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    // Clear immediately if input is empty
    if (!text?.trim()) {
      setResult(null)
      return
    }

    debounceRef.current = setTimeout(() => {
      const parsed = chrono.parse(text, new Date(), { forwardDate: true })

      if (parsed.length === 0) {
        setResult(null)
        return
      }

      const best = parsed[0]
      const date = best.start.date()
      const hasTime = best.start.isCertain("hour")

      // If the user didn't explicitly mention a time,
      // force the date to midnight so it doesn't default to noon.
      if (!hasTime) {
        date.setHours(0, 0, 0, 0)
      }

      // Don't re-surface a match the user already dismissed
      if (dismissedTextRef.current === best.text) return

      setResult({
        date: date, // Now this is "clean"
        matchedText: best.text,
        matchedIndex: best.index,
        hasTime: hasTime,
      })
      
    }, debounceMs)

    return () => clearTimeout(debounceRef.current)
  }, [text, debounceMs])

  // Suppress this match — won't re-appear for the same matched text
  const dismiss = useCallback(() => {
    setResult((prev) => {
      if (prev) dismissedTextRef.current = prev.matchedText
      return null
    })
  }, [])

  // Full reset — clears dismissed memory too (call when form resets)
  const reset = useCallback(() => {
    dismissedTextRef.current = null
    setResult(null)
  }, [])

  return { result, dismiss, reset }
}

// ── Utility: format a Date for the suggestion chip ────────────────────────────
export const formatSuggestedDate = (date, hasTime) => {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)

  const isToday = date.toDateString() === now.toDateString()
  const isTomorrow = date.toDateString() === tomorrow.toDateString()

  const daysDiff = Math.round((date - now) / (1000 * 60 * 60 * 24))
  const isThisWeek = daysDiff > 0 && daysDiff < 7

  const timeStr = hasTime
    ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : null

  let dateStr
  if (isToday) dateStr = "Today"
  else if (isTomorrow) dateStr = "Tomorrow"
  else if (isThisWeek) dateStr = date.toLocaleDateString([], { weekday: "long" })
  else dateStr = date.toLocaleDateString([], { month: "short", day: "numeric" })

  return timeStr ? `${dateStr}, ${timeStr}` : dateStr
}
