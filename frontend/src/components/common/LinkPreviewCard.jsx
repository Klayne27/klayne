import { useEffect, useRef } from "react"
import { FaYoutube } from "react-icons/fa"
import { SiTiktok } from "react-icons/si"
import { useLinkPreview } from "../../hooks/customHooks/useLinkPreview"
import { useVideoPreviewStore } from "../../store/useVideoPreviewStore"

const PLATFORM_META = {
  youtube: {
    icon: <FaYoutube className="text-red-500" size={13} />,
    label: "YouTube",
    border: "border-red-500/25",
  },
  tiktok: {
    icon: <SiTiktok size={11} />,
    label: "TikTok",
    border: "border-base-content/10",
  },
}

// How long the cursor must dwell before the iframe loads.
// Prevents flash-loading while scrolling past cards.
const HOVER_DELAY_MS = 100

const LinkPreviewCard = ({ url, onLoad }) => {
  const { preview, isLoading } = useLinkPreview(url)
  const { activeUrl, setActiveUrl, clearActiveUrl } = useVideoPreviewStore()
  const hoverTimerRef = useRef(null)

  // isPlaying is now derived from the shared store — only one card can be true at a time
  const isPlaying = activeUrl === url

  useEffect(() => {
    if (!isLoading) onLoad?.()
  }, [isLoading, onLoad])

  // Cancel any pending hover timer on unmount
  useEffect(() => () => clearTimeout(hoverTimerRef.current), [])

  if (isLoading) {
    return <div className="mt-2 h-[72px] w-full animate-pulse rounded-xl bg-base-300/40" />
  }
  if (!preview) return null

  const { platform, videoId, embedUrl, thumbnail, title, author, isShort } = preview
  const meta = PLATFORM_META[platform]
  if (!meta) return null

  const isTikTok  = platform === "tiktok"
  const isPortrait = isTikTok || !!isShort

  const playerClass = isPortrait
    ? "mx-auto w-full max-w-[330px] h-full aspect-[9/16]"
    : "w-full mx-auto max-w-[600px] aspect-video"

  const shellClass = `overflow-hidden rounded-xl border ${meta.border} ${playerClass}`

  // ── Hover handlers ────────────────────────────────────────────────────────
  const handleMouseEnter = () => {
    if (!embedUrl) return
    hoverTimerRef.current = setTimeout(() => setActiveUrl(url), HOVER_DELAY_MS)
  }

  const handleMouseLeave = () => {
    clearTimeout(hoverTimerRef.current)
    // Only clear the store if WE are the active card — don't stomp on others
    if (activeUrl === url) clearActiveUrl()
  }

  // ── Embedded player ───────────────────────────────────────────────────────
  if (isPlaying && embedUrl) {
    const iframeSrc = embedUrl.includes("autoplay") ? embedUrl : `${embedUrl}&autoplay=1`

    return (
      <div
        className={`mt-2 overflow-hidden rounded-xl border bg-black ${meta.border} ${playerClass}`}
        onMouseLeave={handleMouseLeave}   // ← leaving the iframe also stops playback
        onClick={(e) => e.stopPropagation()}
      >
        <iframe
          src={iframeSrc}
          title={title ?? platform}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
          referrerPolicy="strict-origin-when-cross-origin"
          {...(isTikTok && {
            sandbox: "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox",
          })}
        />
      </div>
    )
  }

  // ── No thumbnail fallback ─────────────────────────────────────────────────
  if (!thumbnail) {
    const canPlay = !!embedUrl
    return canPlay ? (
      <button
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={(e) => { e.stopPropagation(); setActiveUrl(url) }}
        className={`mt-2 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors hover:bg-base-200 ${meta.border}`}
      >
        {meta.icon}
        <span>▶ Play on {meta.label}</span>
        {title && <span className="max-w-[200px] truncate text-slate-500">{title}</span>}
      </button>
    ) : (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={`mt-2 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors hover:bg-base-200 ${meta.border}`}
      >
        {meta.icon}
        <span>Watch on {meta.label}</span>
        {title && <span className="max-w-[200px] truncate text-slate-500">{title}</span>}
      </a>
    )
  }

  // ── Thumbnail card ────────────────────────────────────────────────────────
  const isClickToPlay = !!embedUrl

  const cardProps = isClickToPlay
    ? {
        as: "div",
        role: "button",
        tabIndex: 0,
        // Click bypasses the delay (intentional action)
        onClick:      (e) => { e.stopPropagation(); setActiveUrl(url) },
        onKeyDown:    (e) => { if (e.key === "Enter") setActiveUrl(url) },
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
        className: `mt-2 cursor-pointer ${shellClass}`,
      }
    : {
        as: "a",
        href: url,
        target: "_blank",
        rel: "noopener noreferrer",
        onClick: (e) => e.stopPropagation(),
        className: `mt-2 block transition-opacity hover:opacity-90 ${shellClass}`,
      }

  const { as: Tag, ...rest } = cardProps

  return (
    <Tag {...rest}>
      <div className="relative h-full w-full bg-black">
        <img
          src={thumbnail}
          alt={title ?? "Video preview"}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          onLoad={onLoad}
        />
        <div className="absolute inset-0 bg-black/25" />

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm">
            <div className="ml-1 border-y-[8px] border-l-[14px] border-y-transparent border-l-white" />
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
          <div className="flex items-center gap-1 text-[11px] text-white/80">
            {meta.icon}
            <span>{meta.label}</span>
          </div>
          {title  && <p className="line-clamp-2 text-sm font-semibold text-white">{title}</p>}
          {author && <p className="truncate text-[11px] text-white/70">{author}</p>}
        </div>
      </div>
    </Tag>
  )
}

export default LinkPreviewCard