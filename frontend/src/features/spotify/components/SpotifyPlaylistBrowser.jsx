// src/features/spotify/components/SpotifyPlaylistBrowser.jsx
import { useState } from "react"
import { FaChevronLeft, FaMusic } from "react-icons/fa6"
import { SiSpotify } from "react-icons/si"
import { useSpotifyPlaylists, useSpotifyTracks } from "../spotifyHooks/useSpotifyQueries"
import LoadingSpinner from "../../../components/common/LoadingSpinner"

const msToTime = (ms) => {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}

const SpotifyPlaylistBrowser = ({ token, onPlay, activeTrackId }) => {
  const [selectedPlaylist, setSelectedPlaylist] = useState(null)

  const {
    playlists,
    isLoading: loadingPlaylists,
    isError: playlistsError,
  } = useSpotifyPlaylists(token)
  const {
    tracks,
    total: trackTotal,
    isLoading: loadingTracks,
    isError: tracksError,
    error: tracksErrorDetails,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSpotifyTracks(token, selectedPlaylist?.id)

  const handleTrackClick = (index) => {
    if (!tracks.length) return
    onPlay({
      contextUri: selectedPlaylist?.uri,
      uris: tracks.map((t) => t.uri),
      offsetPosition: index,
      offsetUri: tracks[index]?.uri,
    })
  }

  // ── Track list view ───────────────────────────────────────────────────────
  if (selectedPlaylist)
    return (
      <div className="flex flex-col gap-2">
        <button
          onClick={() => setSelectedPlaylist(null)}
          className="flex items-center gap-1.5 self-start text-xs text-base-content/50 transition hover:text-base-content"
        >
          <FaChevronLeft size={10} />
          <span className="max-w-[200px] truncate font-semibold">{selectedPlaylist.name}</span>
          {trackTotal > 0 && (
            <span className="text-[10px] text-base-content/30">
              {tracks.length}/{trackTotal}
            </span>
          )}
        </button>

        {loadingTracks && (
          <div className="flex justify-center py-6">
            <LoadingSpinner size="sm" />
          </div>
        )}
        {tracksError && (
          <p className="py-4 text-center text-xs text-red-400">
            {tracksErrorDetails?.message ?? "Failed to load tracks."}
          </p>
        )}

        {!loadingTracks && !tracksError && (
          <div className="max-h-[340px] overflow-y-auto pr-1">
            {tracks.map((track, i) => {
              const isActive = track.id === activeTrackId
              return (
                <button
                  key={track.id}
                  onClick={() => handleTrackClick(i)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                    isActive
                      ? "bg-green-500/10 text-green-400"
                      : "text-base-content/80 hover:bg-base-300/50"
                  }`}
                >
                  <span className="w-5 flex-shrink-0 text-center text-[11px] text-base-content/25">
                    {isActive ? <FaMusic size={11} className="text-green-400" /> : i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium leading-tight">{track.name}</p>
                    <p className="truncate text-[11px] text-base-content/40">
                      {track.artists.map((a) => a.name).join(", ")}
                    </p>
                  </div>
                  <span className="flex-shrink-0 text-[11px] tabular-nums text-base-content/30">
                    {msToTime(track.duration_ms)}
                  </span>
                </button>
              )
            })}
            {hasNextPage && (
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="mt-2 flex w-full items-center justify-center rounded-xl border border-base-content/10 px-3 py-2 text-xs font-semibold text-base-content/50 transition hover:border-green-500/30 hover:text-green-400 disabled:cursor-wait disabled:opacity-50"
              >
                {isFetchingNextPage ? "Loading..." : "Load more tracks"}
              </button>
            )}
          </div>
        )}
      </div>
    )

  // ── Playlist grid view ────────────────────────────────────────────────────
  return (
    <div>
      <p className="mb-3 text-[10px] font-black uppercase tracking-[0.25em] text-base-content/30">
        Your Playlists
      </p>

      {loadingPlaylists && (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      )}
      {playlistsError && (
        <p className="py-4 text-center text-xs text-red-400">Failed to load playlists.</p>
      )}

      {!loadingPlaylists && !playlistsError && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {playlists.map((playlist) => (
            <button
              key={playlist.id}
              onClick={() => setSelectedPlaylist(playlist)}
              className="flex flex-col gap-1.5 rounded-xl bg-base-200/60 p-2 text-left transition-all hover:bg-base-300/60 active:scale-[0.97]"
            >
              <div className="aspect-square w-full overflow-hidden rounded-lg bg-base-300">
                {playlist.images?.[0]?.url ? (
                  <img
                    src={playlist.images[0].url}
                    alt={playlist.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <SiSpotify className="text-2xl text-green-500/20" />
                  </div>
                )}
              </div>
              <p className="line-clamp-2 text-[11px] font-semibold leading-tight">
                {playlist.name}
              </p>
              <p className="text-[10px] text-base-content/35">
                {playlist.tracks?.total || 0} tracks
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default SpotifyPlaylistBrowser
