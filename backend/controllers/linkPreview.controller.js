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
            isShort,
            url,
          });
        }
      } catch {}

      // oEmbed failed but we have enough from the URL alone
      return res.json({ platform: "youtube", thumbnail, videoId, isShort, url });
    }

    // ── TikTok ─────────────────────────────────────────────────────────────
    // URL shapes:
    //   https://www.tiktok.com/@user/video/1234567890
    //   https://vm.tiktok.com/XXXXXXX  (short link — can't get video ID without redirect)
    const ttLongMatch = url.match(/tiktok\.com\/@([\w.-]+)\/video\/(\d+)/);

    if (ttLongMatch || /tiktok\.com/.test(url)) {
      const videoId = ttLongMatch?.[2] ?? null;
      const author = ttLongMatch ? `@${ttLongMatch[1]}` : null;

      // Try oEmbed first — gives us title, author_name, thumbnail_url
      try {
        const oembedRes = await fetch(
          `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
          {
            headers: {
              // TikTok blocks requests without a browser UA
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
            url,
          });
        }
      } catch {}

      // oEmbed failed — return minimal payload so the card can still render
      // with a "Watch on TikTok" CTA even without a thumbnail.
      // videoId is enough to construct a deep-link; thumbnail will be null
      // and LinkPreviewCard handles that gracefully.
      if (videoId) {
        return res.json({
          platform: "tiktok",
          title: null,
          author,
          thumbnail: null,
          videoId,
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
