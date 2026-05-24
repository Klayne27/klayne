// backend/routes/spotify.routes.js
import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  initiateSpotifyAuth,
  handleSpotifyCallback,
  getSpotifyToken,
  getSpotifyStatus,
  getSpotifyPlaylists,
  getSpotifyPlaylistTracks,
  disconnectSpotify,
} from "../controllers/spotify.controller.js";

const router = express.Router();

router.get("/auth", protectRoute, initiateSpotifyAuth);
router.get("/callback", handleSpotifyCallback); // public — Spotify redirects here
router.get("/token", protectRoute, getSpotifyToken);
router.get("/status", protectRoute, getSpotifyStatus);
router.get("/playlists", protectRoute, getSpotifyPlaylists);
router.get("/playlists/:playlistId/tracks", protectRoute, getSpotifyPlaylistTracks);
router.delete("/disconnect", protectRoute, disconnectSpotify);

export default router;
