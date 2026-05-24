import axios from "axios";
import crypto from "crypto";
import User from "../models/user.model.js";

// ── Move this logic inside a helper function so it evaluates lazily ──
const getEnv = () => ({
  CLIENT_ID: process.env.SPOTIFY_CLIENT_ID,
  CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET,
  REDIRECT_URI: process.env.SPOTIFY_REDIRECT_URI,
  FRONTEND_URL: process.env.FRONTEND_URL,
});

const SCOPES = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-read-playback-state",
  "user-modify-playback-state",
  "playlist-read-private",
  "playlist-read-collaborative",
].join(" ");

const pendingStates = new Map();

// Generate basicAuth lazily when needed
const getBasicAuth = () => {
  const { CLIENT_ID, CLIENT_SECRET } = getEnv();
  return Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
};

// ── Update your helpers to grab the fresh lazy variables ───────────────────────

const exchangeCode = (code) => {
  const { REDIRECT_URI } = getEnv();
  return axios.post(
    "https://accounts.spotify.com/api/token",
    new URLSearchParams({
      code,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${getBasicAuth()}`,
      },
    },
  );
};

const refreshAccessToken = (refreshToken) =>
  axios.post(
    "https://accounts.spotify.com/api/token",
    new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${getBasicAuth()}`,
      },
    },
  );

const getSpotifyProfile = (accessToken) =>
  axios.get("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

// ── Update the controller entry points ─────────────────────────────────────────

export const initiateSpotifyAuth = (req, res) => {
  const { CLIENT_ID, REDIRECT_URI } = getEnv(); // Grab them here!

  const state = crypto.randomBytes(16).toString("hex");
  const userId = req.user._id.toString();

  pendingStates.forEach((v, k) => {
    if (Date.now() > v.exp) pendingStates.delete(k);
  });
  pendingStates.set(state, { userId, exp: Date.now() + 5 * 60 * 1000 });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    scope: SCOPES,
    redirect_uri: REDIRECT_URI,
    state,
    show_dialog: "true",
  });

  res.redirect(`https://accounts.spotify.com/authorize?${params}`);
};

export const handleSpotifyCallback = async (req, res) => {
  const { FRONTEND_URL } = getEnv(); // Grab it here!
  const { code, state, error } = req.query;

  if (error)
    return res.redirect(`${FRONTEND_URL}/pomodoro?spotify=error&reason=${error}`);

  const entry = pendingStates.get(state);
  if (!entry || Date.now() > entry.exp)
    return res.redirect(`${FRONTEND_URL}/pomodoro?spotify=error&reason=invalid_state`);

  pendingStates.delete(state);

  try {
    const { data: tokens } = await exchangeCode(code);
    const { access_token, refresh_token, expires_in } = tokens;

    const { data: profile } = await getSpotifyProfile(access_token);

    await User.findByIdAndUpdate(entry.userId, {
      $set: {
        "spotify.spotifyId": profile.id,
        "spotify.displayName": profile.display_name,
        "spotify.email": profile.email,
        "spotify.imageUrl": profile.images?.[0]?.url ?? null,
        "spotify.isPremium": profile.product === "premium",
        "spotify.accessToken": access_token,
        "spotify.refreshToken": refresh_token,
        "spotify.tokenExpiresAt": new Date(Date.now() + expires_in * 1_000),
        "spotify.connectedAt": new Date(),
      },
    });

    res.redirect(`${FRONTEND_URL}/pomodoro?spotify=connected`);
  } catch (err) {
    console.error("[spotify/callback]", err.response?.data ?? err.message);
    res.redirect(`${FRONTEND_URL}/pomodoro?spotify=error&reason=token_exchange`);
  }
};

// Returns a guaranteed-valid access token, refreshing silently when needed
export const getSpotifyToken = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("spotify");

    if (!user?.spotify?.refreshToken)
      return res.status(401).json({ error: "Spotify not connected" });

    const { accessToken, refreshToken, tokenExpiresAt } = user.spotify;

    // Proactively refresh 3 minutes before expiry
    const needsRefresh =
      !tokenExpiresAt || Date.now() >= tokenExpiresAt.getTime() - 3 * 60_000;

    if (!needsRefresh) return res.json({ accessToken, expiresAt: tokenExpiresAt });

    const { data } = await refreshAccessToken(refreshToken);
    const newExpiresAt = new Date(Date.now() + data.expires_in * 1_000);

    const update = {
      "spotify.accessToken": data.access_token,
      "spotify.tokenExpiresAt": newExpiresAt,
    };
    if (data.refresh_token) update["spotify.refreshToken"] = data.refresh_token;

    await User.findByIdAndUpdate(req.user._id, { $set: update });

    return res.json({ accessToken: data.access_token, expiresAt: newExpiresAt });
  } catch (err) {
    console.error("[spotify/token]", err.response?.data ?? err.message);

    // Refresh token revoked — force disconnect
    if ([400, 401].includes(err.response?.status)) {
      await User.findByIdAndUpdate(req.user._id, { $unset: { spotify: 1 } });
      return res
        .status(401)
        .json({ error: "Spotify session expired. Please reconnect." });
    }

    res.status(500).json({ error: "Failed to refresh Spotify token" });
  }
};

export const getSpotifyStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("spotify");

    if (!user?.spotify?.spotifyId) return res.json({ connected: false });

    const { spotifyId, displayName, email, imageUrl, isPremium } = user.spotify;
    res.json({ connected: true, spotifyId, displayName, email, imageUrl, isPremium });
  } catch {
    res.status(500).json({ error: "Failed to get Spotify status" });
  }
};

export const disconnectSpotify = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $unset: { spotify: 1 } });
    res.json({ message: "Spotify disconnected" });
  } catch {
    res.status(500).json({ error: "Failed to disconnect Spotify" });
  }
};
