// src/features/pomodoro/utils/backgroundPreloader.js

import { POMODORO_PRESETS } from "../constants/pomodoroPresets"
import { isVideoUrl } from "../features/pomodoro/components/PomodoroBackground"


/**
 * In-memory set of URLs already preloaded in this session.
 * Prevents duplicate fetches across renders.
 */
const preloaded = new Set()

/**
 * Preload a single background asset into the browser cache.
 * - Videos: fetch with credentials so the browser caches the response,
 *   then discard the blob (we only care about the cache entry).
 * - Images: new Image() triggers a standard browser cache entry.
 */
export function preloadBackground(url) {
  if (!url || preloaded.has(url)) return
  preloaded.add(url)

  if (isVideoUrl(url)) {
    // Use a fetch so the file lands in the HTTP cache.
    // "no-store" is intentionally avoided — we WANT caching.
    fetch(url, { priority: "low" }).catch(() => {
      // Non-fatal — worst case the video loads normally on selection.
    })
  } else {
    const img = new Image()
    img.src = url
  }
}

/**
 * Resolve a preset key or a custom URL to the actual asset URL.
 */
export function resolveBackgroundUrl(presetKey, customImageUrl) {
  if (customImageUrl) return customImageUrl
  if (presetKey) {
    return POMODORO_PRESETS.find((p) => p.key === presetKey)?.path ?? null
  }
  return null
}

/**
 * Preload the currently active background immediately (high priority).
 * Call this once on app boot / store hydration.
 */
export function preloadActiveBackground(presetKey, customImageUrl) {
  const url = resolveBackgroundUrl(presetKey, customImageUrl)
  if (url) preloadBackground(url)
}
