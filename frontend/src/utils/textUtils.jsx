// src/utils/textUtils.js

export const renderClickableText = (text) => {
  if (!text) return null;

  // Regex to find URLs: https:// or http:// or www.
  // It captures the URL part to be used in the href.
  const urlRegex =
    /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])|(www\.[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/gi;

  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = urlRegex.exec(text)) !== null) {
    const url = match[0]; // The matched URL string
    const urlStartIndex = match.index;
    const urlEndIndex = urlRegex.lastIndex;

    // Add the text before the URL
    if (urlStartIndex > lastIndex) {
      parts.push(text.substring(lastIndex, urlStartIndex));
    }

    // Add the clickable link
    const formattedUrl = url.startsWith("http") ? url : `http://${url}`; // Ensure http/https prefix
    parts.push(
      <a
        key={urlStartIndex} // Unique key for React list rendering
        href={formattedUrl}
        target="_blank" // Open in new tab
        rel="noopener noreferrer" // Security best practice for target="_blank"
        className="text-blue-600 hover:underline" // Tailwind classes for link styling
        onClick={(e) => e.stopPropagation()} // Prevent parent click handler (e.g., post navigation)
      >
        {url}
      </a>
    );

    lastIndex = urlEndIndex;
  }

  // Add any remaining text after the last URL
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return <>{parts}</>; // Return as a Fragment to avoid unnecessary div wrappers
};
