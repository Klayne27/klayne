// src/api/spotifyApi.js
const BACKEND = "/api/spotify"
const SPOTIFY = "https://api.spotify.com/v1"

// ── Backend calls ─────────────────────────────────────────────────────────────

export const getSpotifyStatusApi = async () => {
  const res = await fetch(`${BACKEND}/status`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed to fetch Spotify status")
  return data
}

export const getSpotifyTokenApi = async () => {
  const res = await fetch(`${BACKEND}/token`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed to fetch Spotify token")
  return data
}

export const disconnectSpotifyApi = async () => {
  const res = await fetch(`${BACKEND}/disconnect`, { method: "DELETE" })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed to disconnect")
  return data
}

const backendFetch = async (path) => {
  const res = await fetch(`${BACKEND}${path}`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw Object.assign(new Error(data.error ?? `Spotify backend error ${res.status}`), {
      status: res.status,
      reauthorize: data.reauthorize ?? false,
      spotifyError: data.spotifyError,
    })
  }
  return data
}

// ── Spotify Web API ───────────────────────────────────────────────────────────

const spotifyFetch = async (path, token, options = {}) => {
  const res = await fetch(`${SPOTIFY}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  })

  if (res.status === 204) return null

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const message = data.error?.message ?? `Spotify API error ${res.status}`
    // Attach status so transferWithRetry can inspect it reliably
    throw Object.assign(new Error(message), { status: res.status })
  }

  return data
}

const toQueryString = (params) => new URLSearchParams(params).toString()

export const getPlaylistsApi = () =>
  backendFetch(
    `/playlists?${toQueryString({
      limit: 50,
    })}`,
  )

export const getPlaylistTracksApi = (playlistId, offset = 0, limit = 50) =>
  backendFetch(
    `/playlists/${encodeURIComponent(playlistId)}/tracks?${toQueryString({ limit, offset })}`,
  )

export const transferPlaybackApi = (token, deviceId) =>
  spotifyFetch("/me/player", token, {
    method: "PUT",
    body: JSON.stringify({ device_ids: [deviceId], play: false }),
  })

export const startPlaybackApi = (
  token,
  deviceId,
  { uris, contextUri, offsetPosition = 0, offsetUri },
) => {
  const body = {}
  if (contextUri) {
    body.context_uri = contextUri
    body.offset = offsetUri ? { uri: offsetUri } : { position: offsetPosition }
  } else {
    body.uris = uris
    if (offsetPosition > 0) body.offset = { position: offsetPosition }
  }
  return spotifyFetch(`/me/player/play?device_id=${deviceId}`, token, {
    method: "PUT",
    body: JSON.stringify(body),
  })
}
