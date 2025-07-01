export const renderClickableText = (text, currentUser) => {
  if (!text) return null;

  const urlRegex =
    /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])|(www\.[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/gi;

  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = urlRegex.exec(text)) !== null) {
    const url = match[0];
    const urlStartIndex = match.index;
    const urlEndIndex = urlRegex.lastIndex;

    if (urlStartIndex > lastIndex) {
      parts.push(text.substring(lastIndex, urlStartIndex));
    }

    const formattedUrl = url.startsWith("http") ? url : `http://${url}`;
    parts.push(
      <a
        key={urlStartIndex}
        href={formattedUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`hover:underline ${
          currentUser ? "text-white" : "text-blue-500"
        } break-all`}
        onClick={(e) => e.stopPropagation()}
      >
        {url}
      </a>
    );

    lastIndex = urlEndIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return <>{parts}</>;
};
