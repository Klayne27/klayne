// backend/controllers/linkPreview.controller.js

export const getLinkPreview = async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "URL required" });

    // ── YouTube ────────────────────────────────────────────────────────────
    const ytMatch = url.match(
      /(?:youtube\.com\/(?:watch\?(?:[^&\s]*&)*v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    );

    if (ytMatch) {
      const videoId = ytMatch[1];
      const isShort = url.includes("/shorts/");
      const thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

      const embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0`;

      try {
        const oembedRes = await fetch(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
          { signal: AbortSignal.timeout(4000) },
        );
        if (oembedRes.ok) {
          const data = await oembedRes.json();
          return res.json({
            platform: "youtube",
            title: data.title,
            author: data.author_name,
            thumbnail,
            videoId,
            embedUrl,
            isShort,
            url,
          });
        }
      } catch {}

      // oEmbed failed but we have enough from the URL alone
      return res.json({
        platform: "youtube",
        thumbnail,
        videoId,
        embedUrl,
        isShort,
        url,
      });
    }

    // ── TikTok ─────────────────────────────────────────────────────────────
    // URL shapes:
    const ttLongMatch = url.match(/tiktok\.com\/@([\w.-]+)\/video\/(\d+)/);

    if (ttLongMatch || /tiktok\.com/.test(url)) {
      const videoId = ttLongMatch?.[2] ?? null;
      const author = ttLongMatch ? `@${ttLongMatch[1]}` : null;

      // The embed URL is deterministic from the videoId — no API call needed
      const embedUrl = videoId
        ? [
            `https://www.tiktok.com/player/v1/${videoId}`,
            "?music_info=0", // ← hides the rotating disc + song name
            "&description=0", // ← hides the caption/description overlay
            "&rel=0", // ← no related videos after playback
            "&native_context_menu=0",
            "&social_sharing=0", // ← hides the share button row
            "&loop=1",
          ].join("")
        : null;
      try {
        const oembedRes = await fetch(
          `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
          {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            },
            signal: AbortSignal.timeout(5000),
          },
        );

        if (oembedRes.ok) {
          const data = await oembedRes.json();
          return res.json({
            platform: "tiktok",
            title: data.title ?? null,
            author: data.author_name ?? author,
            thumbnail: data.thumbnail_url ?? null,
            videoId,
            embedUrl, // ← NEW: always include when videoId is known
            url,
          });
        }
      } catch {}

      if (videoId) {
        return res.json({
          platform: "tiktok",
          title: null,
          author,
          thumbnail: null,
          videoId,
          embedUrl,
          url,
        });
      }

      return res.status(422).json({ error: "Could not fetch TikTok preview" });
    }

    return res.status(400).json({ error: "Unsupported platform" });
  } catch (error) {
    console.error("getLinkPreview error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
