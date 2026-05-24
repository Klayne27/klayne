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

  const data = await res.json()

  if (res.status === 401) throw Object.assign(new Error("SPOTIFY_UNAUTHORIZED"), { status: 401 })
  if (res.status === 403) throw Object.assign(new Error("SPOTIFY_FORBIDDEN"), { status: 403 })
  if (!res.ok) throw new Error(data.error?.message ?? `Spotify API error ${res.status}`)

  return data
}

export const getPlaylistsApi = (token) => spotifyFetch("/me/playlists?limit=50", token)

export const getPlaylistTracksApi = (token, playlistId) =>
  spotifyFetch(
    `/playlists/${playlistId}/tracks?limit=50&fields=items(track(id,name,duration_ms,uri,artists,album(images))),total`,
    token,
  )

export const transferPlaybackApi = (token, deviceId) =>
  spotifyFetch("/me/player", token, {
    method: "PUT",
    body: JSON.stringify({ device_ids: [deviceId], play: false }),
  })

export const startPlaybackApi = (token, deviceId, { uris, contextUri, offsetPosition = 0 }) => {
  const body = {}
  if (contextUri) {
    body.context_uri = contextUri
    body.offset = { position: offsetPosition }
  } else {
    body.uris = uris
    if (offsetPosition > 0) body.offset = { position: offsetPosition }
  }
  return spotifyFetch(`/me/player/play?device_id=${deviceId}`, token, {
    method: "PUT",
    body: JSON.stringify(body),
  })
}
