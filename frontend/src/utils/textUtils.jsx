import { Link } from "react-router-dom"

export const renderClickableText = (text) => {
  if (!text) return []

  const parts = []
  let lastIndex = 0

  // Added: (#[\p{L}\p{N}_]+) group for hashtags
  const regex =
    /(https?:\/\/[^\s]+)|(#[\p{L}\p{N}_]+)|(?:^|(?<![\p{L}\p{N}_]))(@[\p{L}\p{N}](?:[\p{L}\p{N}._-]*[\p{L}\p{N}])?)/gu

  let match
  while ((match = regex.exec(text)) !== null) {
    const [fullMatch, url, hashtag, mention] = match

    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index))
    }

    if (url) {
      parts.push(
        <a
          key={match.index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-700 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {url}
        </a>,
      )
    } else if (hashtag) {
      // hashtag includes the # prefix, e.g. "#react"
      const tagSlug = hashtag.slice(1).toLowerCase()
      parts.push(
        <Link
          key={match.index}
          to={`/hashtag/${tagSlug}`}
          className="font-semibold text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {hashtag}
        </Link>,
      )
    } else if (mention) {
      const username = mention.substring(1)
      parts.push(
        <Link
          key={match.index}
          to={`/profile/${username}`}
          className="text-blue-700 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {mention}
        </Link>,
      )
    }

    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }

  return parts
}

export const formatProfileLink = (link) => {
  if (!link) {
    return "" // Handle empty or null links
  }

  // Define prefixes to check for
  const prefixesToRemove = ["https://www.", "http://www.", "https://", "http://", "www."]

  for (const prefix of prefixesToRemove) {
    if (link.startsWith(prefix)) {
      // Return the link without the matched prefix
      return link.substring(prefix.length)
    }
  }

  return link // If no prefix is found, return the original link
}

export // This new function ensures the link is a valid, external URL
const getFullProfileLink = (link) => {
  if (!link) {
    return ""
  }

  // Check if the link already has a protocol
  if (link.startsWith("http://") || link.startsWith("https://")) {
    return link
  }

  // Otherwise, prepend https://
  return `https://${link}`
}

export function formatCount(count) {
  if (count < 1000) {
    return count
  }

  if (count < 1000000) {
    return (count / 1000).toFixed(1) + "k"
  } else {
    return (count / 1000000).toFixed(1) + "m"
  }
}

const YOUTUBE_REGEX =
  /(?:youtube\.com\/(?:watch\?(?:[^&\s]*&)*v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
const TIKTOK_URL_RE =
  /https?:\/\/(?:(?:vt|vm|m)\.tiktok\.com\/[\w]+(?:\/)?|(?:www\.)?tiktok\.com\/(?:@[\w.-]+\/video\/\d+|t\/[\w]+))/gi

// Returns the first previewable URL found in a text string, or null
export function extractPreviewableUrl(text) {
  if (!text) return null

  // YouTube — watch URLs, short youtu.be links, Shorts
  const ytMatch = text.match(
    /https?:\/\/(?:youtu\.be\/|(?:www\.)?youtube\.com\/(?:watch\?(?:[^&\s]*&)*v=|shorts\/))[a-zA-Z0-9_-]{11}/,
  )
  if (ytMatch) return { url: ytMatch[0], platform: "youtube" }

  // TikTok — long-form, mobile, AND short redirect links (vt./vm.)
  const ttMatch = text.match(
    /https?:\/\/(?:(?:vt|vm|m)\.tiktok\.com\/[\w]+(?:\/)?|(?:www\.)?tiktok\.com\/(?:@[\w.-]+\/(?:video|photo)\/\d+|t\/[\w]+))/gi,
  )
  if (ttMatch) return { url: ttMatch[0], platform: "tiktok" }

  return null
}
