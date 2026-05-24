// src/features/spotify/components/SpotifyPanel.jsx
import { useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { SiSpotify } from "react-icons/si"
import { useSpotifyStatus, useSpotifyToken } from "../spotifyHooks/useSpotifyQueries"
import { useDisconnectSpotify } from "../spotifyHooks/useSpotifyMutations"
import { showAppToast } from "../../../utils/showAppToast"
import { spotifyKeys } from "../spotifyHooks/spotifyKeys"
import SpotifyConnect from "./SpotifyConnect"
import SpotifyPlayer from "./SpotifyPlayer"
import SpotifyPlaylistBrowser from "./SpotifyPlaylistBrowser"


const SpotifyPanel = () => {
  const qc = useQueryClient()
  const playerRef = useRef(null)
  const [activeTrackId, setActiveTrackId] = useState(null)
  const { isConnected, isPremium, displayName, imageUrl, isLoading } = useSpotifyStatus()
  const { token } = useSpotifyToken(isConnected)
  const { disconnect, isDisconnecting } = useDisconnectSpotify()

  // Handle Spotify OAuth redirect back to the page
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const status = params.get("spotify")
    if (!status) return

    if (status === "connected") {
      showAppToast("Spotify connected!", "success")
      qc.invalidateQueries({ queryKey: spotifyKeys.status() })
    } else {
      const reason = params.get("reason")
      showAppToast(`Spotify connection failed${reason ? `: ${reason}` : ""}`, "error")
    }

    // Clean URL without reloading
    const clean = new URL(window.location.href)
    clean.searchParams.delete("spotify")
    clean.searchParams.delete("reason")
    window.history.replaceState({}, "", clean.toString())
  }, [qc])

  const handlePlay = ({ uris, contextUri, offsetPosition, offsetUri }) => {
    playerRef.current?.playTracks({ uris, contextUri, offsetPosition, offsetUri })
  }

  if (isLoading) return null

  return (
    <section className="mx-auto w-full max-w-2xl px-4 pb-14">
      {/* Section divider — matches PomodoroPage style */}
      <div className="mb-6 flex items-center gap-4">
        <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-slate-800 to-transparent" />
        <div className="flex items-center gap-1.5">
          <SiSpotify className="text-green-500" size={11} />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">
            Music
          </span>
        </div>
        <div className="h-[1px] flex-1 bg-gradient-to-r from-slate-800 via-slate-800 to-transparent" />
      </div>

      {!isConnected ? (
        <SpotifyConnect />
      ) : (
        <div className="flex flex-col gap-4">
          {/* Connected account bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {imageUrl && (
                <img src={imageUrl} alt={displayName} className="h-6 w-6 rounded-full" />
              )}
              <span className="text-xs font-semibold text-base-content/50">{displayName}</span>
              {isPremium && (
                <span className="rounded-full bg-green-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-green-500">
                  Premium
                </span>
              )}
            </div>
            <button
              onClick={() => disconnect()}
              disabled={isDisconnecting}
              className="text-[10px] text-base-content/25 transition hover:text-red-400 disabled:opacity-40"
            >
              Disconnect
            </button>
          </div>

          <SpotifyPlayer ref={playerRef} onTrackChange={(t) => setActiveTrackId(t?.id ?? null)} />

          {token && (
            <SpotifyPlaylistBrowser
              token={token}
              onPlay={handlePlay}
              activeTrackId={activeTrackId}
            />
          )}
        </div>
      )}
    </section>
  )
}

export default SpotifyPanel
