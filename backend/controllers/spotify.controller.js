// backend/controllers/spotify.controller.js
import User from "../models/user.model.js";

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const BASE_URL = process.env.RENDER_EXTERNAL_URL || "http://localhost:5000";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const REDIRECT_URI = `${BASE_URL}/api/spotify/callback`;

const SCOPES = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-library-read",
  "playlist-read-private",
  "playlist-read-collaborative",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
].join(" ");

// ── Shared helpers ────────────────────────────────────────────────────────────

const basicAuth = () =>
  `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`;

/**
 * Returns a valid access token for the user, refreshing it automatically
 * when it is within 60 s of expiry.
 */
async function getOrRefreshToken(userId) {
  const user = await User.findById(userId)
    .select(
      "+spotifyAccessToken +spotifyRefreshToken spotifyTokenExpiry spotifyConnected",
    )
    .lean();

  if (!user?.spotifyConnected || !user?.spotifyRefreshToken) {
    throw Object.assign(new Error("Spotify not connected"), { code: "not_connected" });
  }

  // Use cached token if it still has > 60 s of life
  const bufferMs = 60_000;
  if (
    user.spotifyAccessToken &&
    user.spotifyTokenExpiry &&
    new Date(user.spotifyTokenExpiry).getTime() - Date.now() > bufferMs
  ) {
    return user.spotifyAccessToken;
  }

  // Refresh
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuth(),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: user.spotifyRefreshToken,
    }),
  });

  if (!res.ok) {
    // Token was revoked — mark disconnected so the UI shows the reconnect CTA
    await User.findByIdAndUpdate(userId, { spotifyConnected: false });
    throw Object.assign(new Error("Token refresh failed"), { code: "token_revoked" });
  }

  const data = await res.json();

  await User.findByIdAndUpdate(userId, {
    spotifyAccessToken: data.access_token,
    spotifyTokenExpiry: new Date(Date.now() + data.expires_in * 1000),
    // Spotify may or may not rotate the refresh token
    ...(data.refresh_token && { spotifyRefreshToken: data.refresh_token }),
  });

  return data.access_token;
}

// ── Route handlers ────────────────────────────────────────────────────────────

// GET /api/spotify/auth  — redirect to Spotify OAuth
// Uses protectRoute so req.user is set; the JWT cookie travels with the
// subsequent Spotify → /callback redirect automatically.
export const initiateSpotifyAuth = (req, res) => {
  if (!CLIENT_ID) {
    return res.status(500).json({ error: "Spotify is not configured on this server." });
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    scope: SCOPES,
    redirect_uri: REDIRECT_URI,
    // show_dialog forces the Spotify account picker — handy for switching accounts
    show_dialog: "false",
  });

  res.redirect(`https://accounts.spotify.com/authorize?${params}`);
};

// GET /api/spotify/callback  — Spotify calls this after authorization
// protectRoute works here because the browser includes the JWT cookie.
export const spotifyCallback = async (req, res) => {
  const { code, error } = req.query;

  if (error || !code) {
    return res.redirect(`${FRONTEND_URL}/pomodoro?spotify_error=${error ?? "cancelled"}`);
  }

  try {
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: basicAuth(),
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.json().catch(() => ({}));
      console.error("Spotify token exchange failed:", err);
      return res.redirect(`${FRONTEND_URL}/pomodoro?spotify_error=token_exchange`);
    }

    const tokens = await tokenRes.json();

    await User.findByIdAndUpdate(req.user._id, {
      spotifyAccessToken: tokens.access_token,
      spotifyRefreshToken: tokens.refresh_token,
      spotifyTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
      spotifyConnected: true,
    });

    res.redirect(`${FRONTEND_URL}/pomodoro?spotify_connected=true`);
  } catch (err) {
    console.error("Spotify callback error:", err);
    res.redirect(`${FRONTEND_URL}/pomodoro?spotify_error=server`);
  }
};

// GET /api/spotify/token  — returns a fresh access token to the frontend
export const getSpotifyToken = async (req, res) => {
  try {
    const token = await getOrRefreshToken(req.user._id);
    res.json({ accessToken: token, isConnected: true });
  } catch (err) {
    if (err.code === "not_connected") {
      return res.json({ isConnected: false, accessToken: null });
    }
    if (err.code === "token_revoked") {
      return res.json({ isConnected: false, accessToken: null, revoked: true });
    }
    console.error("getSpotifyToken error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// GET /api/spotify/playlists  — user's playlists via backend proxy
export const getSpotifyPlaylists = async (req, res) => {
  try {
    const token = await getOrRefreshToken(req.user._id);
    const limit = Math.min(parseInt(req.query.limit ?? "50"), 50);
    const offset = parseInt(req.query.offset ?? "0");

    const spotRes = await fetch(
      `https://api.spotify.com/v1/me/playlists?limit=${limit}&offset=${offset}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!spotRes.ok) {
      return res.status(spotRes.status).json({ error: "Spotify API error" });
    }

    const data = await spotRes.json();
    res.json(data);
  } catch (err) {
    if (err.code === "not_connected" || err.code === "token_revoked") {
      return res.json({ isConnected: false, items: [] });
    }
    console.error("getSpotifyPlaylists error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// DELETE /api/spotify/disconnect  — remove tokens, mark disconnected
export const disconnectSpotify = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      spotifyAccessToken: null,
      spotifyRefreshToken: null,
      spotifyTokenExpiry: null,
      spotifyConnected: false,
    });
    res.json({ success: true });
  } catch (err) {
    console.error("disconnectSpotify error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
