const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

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

/** Scrape og: meta tags from a page — fallback when oEmbed fails (e.g. photo posts) */
async function scrapeOgMeta(url, timeoutMs = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "text/html",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    // Only read first 30 KB — og tags are always in <head>
    const reader = res.body.getReader();
    let html = "";
    while (html.length < 30000) {
      const { done, value } = await reader.read();
      if (done) break;
      html += new TextDecoder().decode(value);
    }
    reader.cancel();

    const get = (prop) =>
      html.match(
        new RegExp(
          `<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`,
          "i",
        ),
      )?.[1] ??
      html.match(
        new RegExp(
          `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${prop}["']`,
          "i",
        ),
      )?.[1] ??
      null;

    return {
      title: get("title"),
      thumbnail: get("image"),
      author:
        html.match(/<meta[^>]+name=["']author["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
        null,
    };
  } catch {
    clearTimeout(timer);
    return null;
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
   const isTikTok = /tiktok\.com/.test(url);
   if (!isTikTok) return res.status(400).json({ error: "Unsupported platform" });

   const isShortDomain = /^https?:\/\/(vt|vm|m)\.tiktok\.com\//.test(url);
   let resolvedUrl = url;

   // ── Fast path: long-form URL already has everything we need ──────────────
   const ttLongMatchOriginal = url.match(/tiktok\.com\/@([\w.-]+)\/(video|photo)\/(\d+)/);

   if (ttLongMatchOriginal) {
     const postType = ttLongMatchOriginal[2];
     const videoId = ttLongMatchOriginal[3];
     const author = `@${ttLongMatchOriginal[1]}`;
     const isPhoto = postType === "photo";

     // Photos: oEmbed always fails for them, skip straight to og scrape
     let oembedData = null;
     if (!isPhoto) {
       try {
         const r = await fetch(
           `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
           { headers: { "User-Agent": BROWSER_UA }, signal: AbortSignal.timeout(5000) },
         );
         if (r.ok) oembedData = await r.json();
       } catch {}
     }

     let ogMeta = null;
     if (!oembedData?.thumbnail_url) {
       ogMeta = await scrapeOgMeta(url);
     }

     const embedUrl = !isPhoto
       ? `https://www.tiktok.com/player/v1/${videoId}?music_info=0&description=0&rel=0&native_context_menu=0&social_sharing=0&loop=1`
       : null;

     return res.json({
       platform: "tiktok",
       title: oembedData?.title ?? ogMeta?.title ?? null,
       author: oembedData?.author_name ?? author,
       thumbnail: oembedData?.thumbnail_url ?? ogMeta?.thumbnail ?? null,
       videoId,
       embedUrl,
       isPhoto,
       url,
     });
   }

   // ── Short link path ───────────────────────────────────────────────────────
   // Step 1: try oEmbed directly on the short URL (works for video short links)
   let oembedData = null;
   try {
     const r = await fetch(
       `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
       { headers: { "User-Agent": BROWSER_UA }, signal: AbortSignal.timeout(5000) },
     );
     if (r.ok) oembedData = await r.json();
   } catch {}

   // Step 2: pull canonical long-form URL from oEmbed HTML cite attribute
   const canonicalFromOembed =
     oembedData?.html?.match(
       /cite="(https:\/\/www\.tiktok\.com\/@[\w.-]+\/(video|photo)\/\d+)"/,
     )?.[1] ?? null;

   if (canonicalFromOembed) {
     resolvedUrl = canonicalFromOembed;
   } else {
     // Step 3: try HTTP redirect (frequently blocked by TikTok, but worth one attempt)
     resolvedUrl = await resolveRedirect(url);
     // Step 4: if redirect gave us a new URL and we still have no oEmbed, try again
     if (resolvedUrl !== url && !oembedData) {
       try {
         const r = await fetch(
           `https://www.tiktok.com/oembed?url=${encodeURIComponent(resolvedUrl)}`,
           { headers: { "User-Agent": BROWSER_UA }, signal: AbortSignal.timeout(5000) },
         );
         if (r.ok) oembedData = await r.json();
       } catch {}
     }
   }

   const ttLongMatch = resolvedUrl.match(/tiktok\.com\/@([\w.-]+)\/(video|photo)\/(\d+)/);
   const ttMobileMatch = resolvedUrl.match(/tiktok\.com\/v\/(\d+)/);

   let videoId = ttLongMatch?.[3] ?? ttMobileMatch?.[1] ?? null;
   let author = ttLongMatch ? `@${ttLongMatch[1]}` : null;
   let isPhoto = ttLongMatch?.[2] === "photo";

   // Pull any remaining data out of oEmbed HTML
   if (oembedData?.html) {
     const htmlMatch = oembedData.html.match(/\/(video|photo)\/(\d+)/);
     if (htmlMatch) {
       if (!videoId) videoId = htmlMatch[2];
       if (!ttLongMatch) isPhoto = htmlMatch[1] === "photo";
     }
     if (!author && oembedData.author_name) author = oembedData.author_name;
   }

   // Step 5: last resort — scrape og: tags from whatever URL we ended up with
   let ogMeta = null;
   if (!oembedData?.thumbnail_url) {
     ogMeta = await scrapeOgMeta(resolvedUrl !== url ? resolvedUrl : url);
   }

   const thumbnail = oembedData?.thumbnail_url ?? ogMeta?.thumbnail ?? null;
   const title = oembedData?.title ?? ogMeta?.title ?? null;
   const finalAuthor = oembedData?.author_name ?? author ?? ogMeta?.author ?? null;

   const embedUrl =
     videoId && !isPhoto
       ? `https://www.tiktok.com/player/v1/${videoId}?music_info=0&description=0&rel=0&native_context_menu=0&social_sharing=0&loop=1`
       : null;

   // Always return something — even all-null renders a "View on TikTok" button
   // in the frontend via the no-thumbnail fallback path.
   return res.json({
     platform: "tiktok",
     title,
     author: finalAuthor,
     thumbnail,
     videoId,
     embedUrl,
     isPhoto,
     // Prefer the resolved long-form URL so clicking opens the right page;
     // fall back to the original short URL if resolution failed entirely.
     url: resolvedUrl !== url ? resolvedUrl : url,
   });

    return res.status(422).json({ error: "Could not fetch TikTok preview" });
  } catch (error) {
    console.error("getLinkPreview error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
