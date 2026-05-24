// src/features/spotify/spotifyHooks/spotifyKeys.js
export const spotifyKeys = {
  all: () => ["spotify"],
  status: () => [...spotifyKeys.all(), "status"],
  token: () => [...spotifyKeys.all(), "token"],
  playlists: () => [...spotifyKeys.all(), "playlists"],
  tracks: (playlistId) => [...spotifyKeys.all(), "tracks", playlistId],
}
