import { useState } from "react"
import { FaYoutube } from "react-icons/fa"
import { SiTiktok } from "react-icons/si"
import { useLinkPreview } from "../../hooks/customHooks/useLinkPreview"

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

// ── TikTok cannot be embedded — this component explains why clearly ───────────
// TikTok's oEmbed API intentionally omits a direct video URL or iframe src.
// Their embed.js widget is ~200kb, slow, and blocked by most ad blockers.
// The correct UX (used by Twitter/X, Discord, Slack) is:
//   thumbnail + metadata card → click → opens tiktok.com in new tab.
// That is exactly what this component does for TikTok.

const LinkPreviewCard = ({ url }) => {
  const { preview, isLoading } = useLinkPreview(url)
  const [isPlaying, setIsPlaying] = useState(false)

  if (isLoading) {
    return <div className="mt-2 h-[72px] w-full animate-pulse rounded-xl bg-base-300/40" />
  }

  // Nothing usable from the API
  if (!preview) return null

  const platform = preview.platform
  const meta = PLATFORM_META[platform]
  if (!meta) return null

  const isYoutube = platform === "youtube"
  const isTikTok  = platform === "tiktok"
  const isShort   = !!preview.isShort

  // ── Aspect ratio ──────────────────────────────────────────────────────────
  // YouTube Shorts and TikTok are portrait 9:16.
  // Regular YouTube is landscape 16:9.
  const isPortrait = isShort || isTikTok
  const playerClass = isPortrait
    ? "mx-auto w-full max-w-[220px] aspect-[9/16]"
    : "w-full aspect-video"

  const shellClass = `overflow-hidden rounded-xl border ${meta.border} ${playerClass}`

  // ── YouTube inline player ─────────────────────────────────────────────────
  if (isPlaying && isYoutube && preview.videoId) {
    return (
      <div
        className={`mt-2 overflow-hidden rounded-xl border bg-black ${meta.border} ${playerClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <iframe
          src={`https://www.youtube.com/embed/${preview.videoId}?autoplay=1&rel=0`}
          title={preview.title ?? "YouTube"}
          allow="autoplay; encrypted-media; fullscreen"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    )
  }

  // ── No thumbnail available (TikTok oEmbed failed) ─────────────────────────
  // Show a minimal "Watch on TikTok" pill so the link is still surfaced.
  if (!preview.thumbnail) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={`mt-2 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors hover:bg-base-200 ${meta.border}`}
      >
        {meta.icon}
        <span>Watch on {meta.label}</span>
        {preview.title && (
          <span className="max-w-[200px] truncate text-slate-500">{preview.title}</span>
        )}
      </a>
    )
  }

  // ── Thumbnail card ────────────────────────────────────────────────────────
  // YouTube  → clicking plays inline (no new tab)
  // TikTok   → clicking opens tiktok.com in a new tab (cannot embed)
  const isClickToPlay = isYoutube && !!preview.videoId

  const cardProps = isClickToPlay
    ? {
        as: "div",
        role: "button",
        tabIndex: 0,
        onClick: (e) => { e.stopPropagation(); setIsPlaying(true) },
        onKeyDown: (e) => { if (e.key === "Enter") setIsPlaying(true) },
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
        {/* Thumbnail */}
        <img
          src={preview.thumbnail}
          alt={preview.title ?? "Video preview"}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />

        {/* Dim overlay */}
        <div className="absolute inset-0 bg-black/25" />

        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm">
            {isTikTok ? (
              // TikTok: show the TikTok icon instead of a play arrow to signal "opens externally"
              <SiTiktok className="text-white" size={20} />
            ) : (
              <div className="ml-1 border-y-[8px] border-l-[14px] border-y-transparent border-l-white" />
            )}
          </div>
        </div>

        {/* Bottom metadata strip */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
          <div className="flex items-center gap-1 text-[11px] text-white/80">
            {meta.icon}
            <span>{meta.label}</span>
            {/* Small "opens in new tab" hint for TikTok */}
            {isTikTok && (
              <span className="ml-auto text-[10px] text-white/50">↗ tap to open</span>
            )}
          </div>

          {preview.title && (
            <p className="line-clamp-2 text-sm font-semibold text-white">{preview.title}</p>
          )}

          {preview.author && (
            <p className="truncate text-[11px] text-white/70">{preview.author}</p>
          )}
        </div>
      </div>
    </Tag>
  )
}

export default LinkPreviewCard