import { useEffect, useRef, useId } from "react"
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

const LinkPreviewCard = ({ url, onPreviewLoad, onLoad }) => {
  const { preview, isLoading } = useLinkPreview(url)
  const { activeId, setActiveId, clearActiveId } = useVideoPreviewStore()

  // Unique per-card ID — same URL in two posts won't bleed into each other
  const instanceId = useId()
  const isPlaying = activeId === instanceId

  const containerRef = useRef(null)
  const hasAutoplayed = useRef(false) // only autoplay once per mount
  

  useEffect(() => {
    if (!isLoading) onPreviewLoad?.()
  }, [isLoading, onPreviewLoad])

  // ── IntersectionObserver autoplay ─────────────────────────────────────────
  useEffect(() => {
    if (!preview?.embedUrl || isLoading) return

    const el = containerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          // Card is >60% visible — autoplay if nothing else is playing
          if (!hasAutoplayed.current) {
            hasAutoplayed.current = true
            setActiveId(instanceId)
          }
        } else {
          // Card left view — stop this card's playback
          if (activeId === instanceId) {
            clearActiveId()
          }
          // Allow re-autoplay if card scrolls back into view
          hasAutoplayed.current = false
        }
      },
      { threshold: 0.6 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [preview?.embedUrl, isLoading, instanceId, activeId, setActiveId, clearActiveId])

  if (isLoading) {
    return <div className="mt-2 h-[72px] w-full animate-pulse rounded-xl bg-base-300/40" />
  }
  if (!preview) return null

  const { platform, embedUrl, thumbnail, title, author, isShort, isPhoto } = preview
  const meta = PLATFORM_META[platform]
  if (!meta) return null

  const isTikTok = platform === "tiktok"
  const isPortrait = isTikTok || !!isShort

  const playerClass = isPortrait
    ? "mx-auto w-full max-w-[330px] h-full aspect-[9/16]"
    : "w-full mx-auto max-w-[600px] aspect-video"

  const shellClass = `overflow-hidden rounded-xl border ${meta.border} ${playerClass}`

  // ── Embedded player ───────────────────────────────────────────────────────
  if (isPlaying && embedUrl) {
    let iframeSrc = embedUrl.includes("autoplay") ? embedUrl : `${embedUrl}&autoplay=1`
    if (isTikTok && !iframeSrc.includes("muted=0")) {
      iframeSrc = `${iframeSrc}&muted=0`
    }

    return (
      <div
        ref={containerRef}
        className={`mt-2 overflow-hidden rounded-xl border bg-black ${meta.border} ${playerClass}`}
        onMouseLeave={() => { if (activeId === instanceId) clearActiveId() }}
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
    const canPlay = !!embedUrl && !isPhoto
    return canPlay ? (
      <button
        ref={containerRef}
        onClick={(e) => { e.stopPropagation(); setActiveId(instanceId) }}
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
        <span>View photo on {meta.label}</span>
        {title && <span className="max-w-[200px] truncate text-slate-500">{title}</span>}
      </a>
    )
  }

  // ── Thumbnail card ────────────────────────────────────────────────────────
  const isClickToPlay = !!embedUrl && !isPhoto

  const cardProps = isClickToPlay
    ? {
        as: "div",
        role: "button",
        tabIndex: 0,
        onClick: (e) => { e.stopPropagation(); setActiveId(instanceId) },
        onKeyDown: (e) => { if (e.key === "Enter") setActiveId(instanceId) },
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
    <Tag ref={containerRef} {...rest}>
      <div className="relative h-full w-full bg-black">
        <img
          src={thumbnail}
          alt={title ?? "Video preview"}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          onPreviewLoad={onLoad}
        />
        <div className="absolute inset-0 bg-black/25" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm">
            {isPhoto ? (
              <svg viewBox="0 0 24 24" fill="white" className="h-6 w-6">
                <path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5l3.5-4.5z" />
              </svg>
            ) : (
              <div className="ml-1 border-y-[8px] border-l-[14px] border-y-transparent border-l-white" />
            )}
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
          <div className="flex items-center gap-1 text-[11px] text-white/80">
            {meta.icon}
            <span>{meta.label}</span>
          </div>
          {title && <p className="line-clamp-2 text-sm font-semibold text-white">{title}</p>}
          {author && <p className="truncate text-[11px] text-white/70">{author}</p>}
        </div>
      </div>
    </Tag>
  )
}

export default LinkPreviewCard