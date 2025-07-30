import { Link } from "react-router-dom";

export const renderClickableText = (text) => {
  if (!text) return [];

  const parts = [];
  let lastIndex = 0;

  const regex =
    /(https?:\/\/[^\s]+)|(#[\p{L}\p{N}_]+)|(?:^|(?<![\p{L}\p{N}_]))(@[\p{L}\p{N}_]+)/gu;

  let match;
  while ((match = regex.exec(text)) !== null) {
    const [fullMatch, url, hashtag, mention] = match;

    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
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
        </a>
      );
    } else if (hashtag) {
      parts.push(
        <Link
          key={match.index}
          to={`/explore?hashtag=${hashtag.substring(1)}`}
          className="text-blue-700 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {hashtag}
        </Link>
      );
    } else if (mention) {
      const username = mention.substring(1);
      parts.push(
        <Link
          key={match.index}
          to={`/profile/${username}`} 
          className="text-blue-700 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {mention}
        </Link>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
};
