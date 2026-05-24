// src/features/spotify/components/SpotifyConnect.jsx
import { SiSpotify } from "react-icons/si"

const SpotifyConnect = () => (
  <div className="flex flex-col items-center gap-4 rounded-2xl border border-accent/20 bg-base-200/30 p-8 text-center">
    <SiSpotify className="text-5xl text-green-500" />
    <div>
      <h3 className="font-black">Stream Music While You Study</h3>
      <p className="mt-1.5 text-sm text-base-content/50">
        Connect your Spotify account to browse playlists and stream directly in the browser.
      </p>
    </div>
    <a
      href="/api/spotify/auth"
      className="flex items-center gap-2 rounded-full bg-green-500 px-6 py-2.5 text-sm font-black text-black shadow-lg shadow-green-500/25 transition hover:bg-green-400 active:scale-95"
    >
      <SiSpotify size={15} />
      Connect with Spotify
    </a>
    <p className="text-[10px] text-base-content/25">Spotify Premium required for browser playback</p>
  </div>
)

export default SpotifyConnect