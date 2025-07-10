// export const renderClickableText = (text, currentUser) => {
//   if (!text) return null;

//   const urlRegex =
//     /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])|(www\.[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/gi;

//   const parts = [];
//   let lastIndex = 0;
//   let match;

//   while ((match = urlRegex.exec(text)) !== null) {
//     const url = match[0];
//     const urlStartIndex = match.index;
//     const urlEndIndex = urlRegex.lastIndex;

//     if (urlStartIndex > lastIndex) {
//       parts.push(text.substring(lastIndex, urlStartIndex));
//     }

//     const formattedUrl = url.startsWith("http") ? url : `http://${url}`;
//     parts.push(
//       <a
//         key={urlStartIndex}
//         href={formattedUrl}
//         target="_blank"
//         rel="noopener noreferrer"
//         className={`hover:underline ${
//           currentUser ? "text-white" : "text-blue-500"
//         } `}
//         onClick={(e) => e.stopPropagation()}
//       >
//         {url}
//       </a>
//     );

//     lastIndex = urlEndIndex;
//   }

//   if (lastIndex < text.length) {
//     parts.push(text.substring(lastIndex));
//   }

//   return <>{parts}</>;
// };


import { Link } from 'react-router-dom';

export const renderClickableText = (text) => {
  if (!text) return [];

  const parts = [];
  let lastIndex = 0;

  // Regex to match URLs, #hashtags, and @mentions
  // Mentions: @ followed by alphanumeric characters or underscores, at least 1 character long.
  // Hashtags: # followed by alphanumeric characters or underscores, at least 1 character long.
  // URLs: common URL pattern
  // const regex = /(https?:\/\/[^\s]+)|(#[\w_]+)|(@[\w_]+)/g;
  // const regex = /(https?:\/\/[^\s]+)|(@[\w_]+)/g;
  const regex = /(https?:\/\/[^\s]+)|(@[\p{L}\p{N}_]+)/gu; // Added \p{L} for any letter, \p{N} for any number, and 'u' flag

  let match;
  while ((match = regex.exec(text)) !== null) {
    const [fullMatch, url, hashtag, mention] = match;

    // Add preceding text as a plain string
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
          className="text-blue-500 hover:underline"
          onClick={(e) => e.stopPropagation()} // Prevent post navigation on link click
        >
          {url}
        </a>
      );
    } else if (hashtag) {
      parts.push(
        <Link
          key={match.index}
          to={`/explore?hashtag=${hashtag.substring(1)}`} // Assuming an explore page for hashtags
          className="text-blue-500 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {hashtag}
        </Link>
      );
    } else if (mention) {
      const username = mention.substring(1); // Remove '@'
      parts.push(
        <Link
          key={match.index}
          to={`/profile/${username}`} // Link to the user's profile page
          className="text-blue-500 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {mention}
        </Link>
      );
    }
    lastIndex = regex.lastIndex;
  }

  // Add any remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
};