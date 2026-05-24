// src/features/spotify/components/SpotifyPlayer.jsx
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"
import {
  FaBackwardStep,
  FaForwardStep,
  FaPause,
  FaPlay,
  FaVolumeHigh,
  FaVolumeLow,
  FaVolumeXmark,
} from "react-icons/fa6"
import { SiSpotify } from "react-icons/si"
import { startPlaybackApi, transferPlaybackApi } from "../../../api/spotifyApi"
import { showAppToast } from "../../../utils/showAppToast"

// ── Helpers ───────────────────────────────────────────────────────────────────

const msToTime = (ms) => {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}

const VolumeIcon = ({ v }) =>
  v === 0 ? (
    <FaVolumeXmark size={13} />
  ) : v < 0.5 ? (
    <FaVolumeLow size={13} />
  ) : (
    <FaVolumeHigh size={13} />
  )

// Inject the Spotify Web Playback SDK exactly once per page load
let sdkPromise = null
const loadSDK = () => {
  if (sdkPromise) return sdkPromise
  sdkPromise = new Promise((resolve) => {
    if (window.Spotify) return resolve()
    window.onSpotifyWebPlaybackSDKReady = resolve
    const s = document.createElement("script")
    s.id = "spotify-sdk"
    s.src = "https://sdk.scdn.co/spotify-player.js"
    s.async = true
    document.head.appendChild(s)
  })
  return sdkPromise
}

const fetchToken = async () => {
  const res = await fetch("/api/spotify/token")
  const data = await res.json()
  if (!res.ok) throw new Error(data.error)
  return data.accessToken
}

// ── Retry transferPlayback until Spotify's backend acknowledges the device ──────
// Spotify's API can take 1–5 seconds after the SDK `ready` event to register
// the new device. We retry with exponential backoff up to ~15 seconds total.
const transferWithRetry = async (token, deviceId, maxAttempts = 6) => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      await transferPlaybackApi(token, deviceId)
      return true // success
    } catch (err) {
      const isDeviceNotFound =
        err?.message?.includes("device") || err?.message?.includes("404") || err?.status === 404

      if (!isDeviceNotFound || attempt === maxAttempts - 1) {
        // Non-device error or exhausted retries — give up
        console.warn(
          `[spotify] transferPlayback failed after ${attempt + 1} attempts:`,
          err.message,
        )
        return false
      }

      // Exponential backoff: 500ms, 1s, 2s, 4s, 8s
      const delay = Math.min(500 * 2 ** attempt, 8000)
      console.log(
        `[spotify] device not ready yet, retrying transfer in ${delay}ms (attempt ${attempt + 1})`,
      )
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  return false
}

// ── Component ─────────────────────────────────────────────────────────────────

const SpotifyPlayer = forwardRef(({ onTrackChange, initialVolume = 0.5 }, ref) => {
  const playerRef = useRef(null)
  const deviceIdRef = useRef(null)
  const tickRef = useRef(null)
  // FIX: track whether transferPlayback completed so playTracks knows the
  // device is actually recognized by Spotify's API, not just the SDK.
  const transferredRef = useRef(false)

  const [isReady, setIsReady] = useState(false)
  const [isConnecting, setIsConnecting] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [track, setTrack] = useState(null)
  const [positionMs, setPositionMs] = useState(0)
  const [durationMs, setDurationMs] = useState(0)
  const [volume, setVolume] = useState(initialVolume)
  const [isPremiumErr, setIsPremiumErr] = useState(false)
  const [playerError, setPlayerError] = useState(null)

  const pct = durationMs > 0 ? (positionMs / durationMs) * 100 : 0

  useImperativeHandle(ref, () => ({
    playTracks: async ({ uris, contextUri, offsetPosition = 0, offsetUri }) => {
      if (!deviceIdRef.current) {
        showAppToast("Player not ready yet", "error")
        return
      }

      try {
        const token = await fetchToken()

        // FIX: if transfer hasn't confirmed yet, retry it before playing.
        // This handles the case where the user clicks play very quickly after
        // connecting and transferWithRetry is still in-flight.
        if (!transferredRef.current) {
          const ok = await transferWithRetry(token, deviceIdRef.current)
          if (!ok) {
            showAppToast("Could not activate Spotify device. Try again.", "error")
            return
          }
          transferredRef.current = true
        }

        await startPlaybackApi(token, deviceIdRef.current, {
          uris,
          contextUri,
          offsetPosition,
          offsetUri,
        })
      } catch (err) {
        console.error("[spotify] playTracks error:", err)
        showAppToast("Playback failed", "error")
      }
    },
  }))

  // ── SDK lifecycle ─────────────────────────────────────────────────────────
  useEffect(() => {
    let player
    let cancelled = false

    const init = async () => {
      let token
      try {
        token = await fetchToken()
      } catch {
        if (!cancelled) setIsConnecting(false)
        return
      }

      await loadSDK()
      if (cancelled) return

      player = new window.Spotify.Player({
        name: "Klayne Pomodoro Player",
        getOAuthToken: async (cb) => {
          try {
            cb(await fetchToken())
          } catch {
            /* expired */
          }
        },
        volume: initialVolume,
      })

      player.addListener("ready", async ({ device_id }) => {
        if (cancelled) return
        deviceIdRef.current = device_id
        transferredRef.current = false // reset on each new device registration

        setIsReady(true)
        setIsConnecting(false)

        // FIX: don't fire-and-forget — use retrying transfer so we know when
        // Spotify's backend has actually registered the device.
        const ok = await transferWithRetry(token, device_id)
        if (!cancelled) {
          transferredRef.current = ok
          if (!ok) {
            console.warn("[spotify] Could not transfer playback to web player after retries")
          }
        }
      })

      player.addListener("not_ready", ({ device_id }) => {
        console.log("[spotify] device went offline:", device_id)
        transferredRef.current = false
        setIsReady(false)
      })

      player.addListener("initialization_error", ({ message }) => {
        if (!cancelled) setPlayerError("Player failed to initialize. Try refreshing.")
        console.error("[spotify] init error:", message)
      })

      player.addListener("authentication_error", ({ message }) => {
        if (!cancelled) setPlayerError("Spotify authentication failed. Reconnect your account.")
        console.error("[spotify] auth error:", message)
      })

      player.addListener("account_error", () => {
        if (!cancelled) {
          setIsPremiumErr(true)
          setPlayerError("Spotify Premium is required for browser streaming.")
        }
      })

      player.addListener("playback_error", ({ message }) => {
        showAppToast("Playback error occurred", "error")
        console.error("[spotify] playback error:", message)
      })

      player.addListener("player_state_changed", (state) => {
        if (!state || cancelled) return
        const {
          track_window: { current_track },
          paused,
          position,
          duration,
        } = state
        setTrack(current_track)
        setIsPlaying(!paused)
        setPositionMs(position)
        setDurationMs(duration)
        onTrackChange?.(current_track)
      })

      player.connect()
      playerRef.current = player
    }

    init()

    return () => {
      cancelled = true
      clearInterval(tickRef.current)
      player?.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Local position interpolation between SDK state updates
  useEffect(() => {
    clearInterval(tickRef.current)
    if (isPlaying) {
      tickRef.current = setInterval(() => setPositionMs((p) => Math.min(p + 500, durationMs)), 500)
    }
    return () => clearInterval(tickRef.current)
  }, [isPlaying, durationMs])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const toggle = () => playerRef.current?.togglePlay()
  const prev = () => playerRef.current?.previousTrack()
  const next = () => playerRef.current?.nextTrack()
  const seek = (e) => {
    const ms = (Number(e.target.value) / 100) * durationMs
    setPositionMs(ms)
    playerRef.current?.seek(ms)
  }
  const changeVol = (e) => {
    const v = Number(e.target.value)
    setVolume(v)
    playerRef.current?.setVolume(v)
  }
  const muteToggle = () => {
    const v = volume > 0 ? 0 : 0.5
    setVolume(v)
    playerRef.current?.setVolume(v)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (isPremiumErr)
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-center">
        <SiSpotify className="mx-auto mb-2 text-2xl text-red-400" />
        <p className="text-sm font-semibold text-red-400">Spotify Premium Required</p>
        <p className="mt-1 text-xs text-base-content/50">
          Browser streaming requires an active Premium subscription.
        </p>
      </div>
    )

  if (playerError)
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-center">
        <p className="text-sm font-semibold text-amber-400">Player Error</p>
        <p className="mt-1 text-xs text-base-content/50">{playerError}</p>
      </div>
    )

  if (isConnecting || !isReady)
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-accent/20 bg-base-200/30 py-6 text-sm text-base-content/40">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
          Connecting to Spotify…
        </div>
        <p className="text-[10px] text-base-content/25">
          This may take a few seconds on first load
        </p>
      </div>
    )

  const albumArt = track?.album?.images?.[0]?.url

  return (
    <div className="rounded-2xl border border-accent/20 bg-base-200/60 p-4 backdrop-blur-sm">
      {/* Track info */}
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-base-300 shadow">
          {albumArt ? (
            <img src={albumArt} alt="album" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <SiSpotify className="text-xl text-green-500/30" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{track?.name ?? "—"}</p>
          <p className="truncate text-xs text-base-content/50">
            {track?.artists?.map((a) => a.name).join(", ") ?? "Not playing"}
          </p>
        </div>
        <SiSpotify className="flex-shrink-0 text-lg text-green-500" />
      </div>

      {/* Seekable progress */}
      <div className="mt-3">
        <div className="group relative h-1.5 w-full cursor-pointer rounded-full bg-base-300">
          <div
            className="pointer-events-none h-full rounded-full bg-green-500 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
          <input
            type="range"
            min={0}
            max={100}
            step={0.2}
            value={pct}
            onChange={seek}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-base-content/35">
          <span>{msToTime(positionMs)}</span>
          <span>{msToTime(durationMs)}</span>
        </div>
      </div>

      {/* Controls + volume */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={prev}
            className="rounded-full p-2 text-base-content/50 transition hover:bg-base-300 hover:text-base-content"
          >
            <FaBackwardStep size={15} />
          </button>
          <button
            onClick={toggle}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-black shadow-lg shadow-green-500/30 transition hover:bg-green-400 active:scale-95"
          >
            {isPlaying ? <FaPause size={15} /> : <FaPlay size={15} className="ml-0.5" />}
          </button>
          <button
            onClick={next}
            className="rounded-full p-2 text-base-content/50 transition hover:bg-base-300 hover:text-base-content"
          >
            <FaForwardStep size={15} />
          </button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2 text-base-content/40">
          <button onClick={muteToggle} className="transition hover:text-base-content">
            <VolumeIcon v={volume} />
          </button>
          <div className="relative h-1 w-20 rounded-full bg-base-300">
            <div
              className="pointer-events-none h-full rounded-full bg-base-content/30"
              style={{ width: `${volume * 100}%` }}
            />
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={changeVol}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </div>
        </div>
      </div>
    </div>
  )
})

SpotifyPlayer.displayName = "SpotifyPlayer"
export default SpotifyPlayer
