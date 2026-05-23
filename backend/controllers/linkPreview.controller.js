const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/**
 * Follows HTTP redirects for a URL and returns the final resolved URL.
 * Uses GET (not HEAD) so the server actually sends the redirect chain.
 * We never read the body — we only need Response.url after all hops.
 */
async function resolveRedirect(url, timeoutMs = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        Referer: "https://www.google.com/",
      },
    });
    clearTimeout(timer);
    return res.url && res.url !== url ? res.url : url;
  } catch {
    clearTimeout(timer);
    return url;
  }
}

export const getLinkPreview = async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "URL required" });

    // ── YouTube ─────────────────────────────────────────────────────────────
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

      return res.json({
        platform: "youtube",
        thumbnail,
        videoId,
        embedUrl,
        isShort,
        url,
      });
    }

    // ── TikTok ───────────────────────────────────────────────────────────────
    // Recognised shapes:
    //   Long    https://www.tiktok.com/@username/video/1234567890123456789
    //   Short   https://vt.tiktok.com/ZSxfWQQN5/          ← redirect to long form
    //   Short   https://vm.tiktok.com/ZSxfWQQN5/
    //   Mobile  https://m.tiktok.com/v/1234567890123456789.html

    const isTikTok = /tiktok\.com/.test(url);

    if (isTikTok) {
      const isShortDomain = /^https?:\/\/(vt|vm|m)\.tiktok\.com\//.test(url);
      let resolvedUrl = isShortDomain ? await resolveRedirect(url) : url;

      if (/tiktok\.com\/t\//.test(resolvedUrl)) {
        resolvedUrl = await resolveRedirect(resolvedUrl);
      }

      const ttLongMatch = resolvedUrl.match(/tiktok\.com\/@([\w.-]+)\/video\/(\d+)/);
      const ttMobileMatch = resolvedUrl.match(/tiktok\.com\/v\/(\d+)/);

      // Preliminary ID from URL (may be null for unresolved short links)
      let videoId = ttLongMatch?.[2] ?? ttMobileMatch?.[1] ?? null;
      let author = ttLongMatch ? `@${ttLongMatch[1]}` : null;

      // oEmbed — try resolved URL then original
      const urlsToTry = [...new Set([resolvedUrl, url])];
      let oembedData = null;

      for (const candidate of urlsToTry) {
        try {
          const oembedRes = await fetch(
            `https://www.tiktok.com/oembed?url=${encodeURIComponent(candidate)}`,
            { headers: { "User-Agent": BROWSER_UA }, signal: AbortSignal.timeout(5000) },
          );
          if (oembedRes.ok) {
            oembedData = await oembedRes.json();
            break;
          }
        } catch {}
      }

      // ── KEY FIX ──────────────────────────────────────────────────────────────
      // oEmbed HTML always contains the canonical blockquote cite URL, e.g.:
      //   <blockquote class="tiktok-embed" cite="https://www.tiktok.com/@user/video/12345">
      // Even if the redirect chain didn't reach the canonical URL, we can pull
      // the video ID from here.
      if (!videoId && oembedData?.html) {
        videoId = oembedData.html.match(/\/video\/(\d+)/)?.[1] ?? null;
      }
      // ─────────────────────────────────────────────────────────────────────────

      // Now embedUrl is built AFTER the oEmbed fallback, so it's always populated
      // when a valid video ID exists.
      const embedUrl = videoId
        ? [
            `https://www.tiktok.com/player/v1/${videoId}`,
            "?music_info=0",
            "&description=0",
            "&rel=0",
            "&native_context_menu=0",
            "&social_sharing=0",
            "&loop=1",
          ].join("")
        : null;

      if (oembedData || videoId) {
        return res.json({
          platform: "tiktok",
          title: oembedData?.title ?? null,
          author: oembedData?.author_name ?? author,
          thumbnail: oembedData?.thumbnail_url ?? null,
          videoId,
          embedUrl, // ← now populated for short links too
          url: resolvedUrl,
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
