const BASE_URL = "/api/comments";

export const getCommentsApi = async ({
  postId,
  parentCommentId = null,
  page = 1,
  limit = 10,
}) => {
  let url;
  if (parentCommentId) {
    url = `${BASE_URL}/${postId}/comments/${parentCommentId}/replies`;
  } else {
    url = `${BASE_URL}/${postId}/comments`;
  }
  url += `?page=${page}&limit=${limit}`;

  const res = await fetch(url);
  const data = await res.json();

  if (!res.ok) {
    console.error(`Error fetching comments from ${url}:`, data.error || res.statusText);
    throw new Error(data.error || "Failed to fetch comments");
  }
  return data;
};

export const addCommentApi = async ({ postId, text, img }) => {
  const res = await fetch(`${BASE_URL}/${postId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, img }),
  });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to add comment");
  }

  return data;
};

export const deleteCommentApi = async ({ commentId }) => {
  const res = await fetch(`${BASE_URL}/${commentId}`, {
    method: "DELETE",
  });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to delete comment");
  }
  
  return data;
};

export const replyToCommentApi = async ({ postId, parentCommentId, text, img }) => {
  const res = await fetch(`${BASE_URL}/${postId}/${parentCommentId}/reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, img }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to reply to comment");
  }
  return data;
};

export const likeUnlikeCommentApi = async ({ commentId, isAnonymousLike = false }) => {
  const res = await fetch(`${BASE_URL}/${commentId}/like`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isAnonymousLike }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || "Failed to like/unlike comment")
  }
  return data
}

