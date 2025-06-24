// src/api/commentsApi.js
/**
 * API service for interacting with comment-related backend endpoints.
 */

const BASE_URL = "/api/comments"; // Base URL for comment-related routes

/**
 * Fetches comments for a specific post. Can fetch top-level comments or replies to a parent comment.
 * @param {string} postId The ID of the post.
 * @param {string | null} parentCommentId The ID of the parent comment if fetching replies, otherwise null for top-level comments.
 * @param {number} page The page number for pagination.
 * @param {number} limit The number of comments per page.
 * @returns {Promise<{comments: Array, hasNextPage: boolean}>} The fetched comments and pagination info.
 * @throws {Error} If the API call fails.
 */
export const fetchCommentsApi = async ({
  postId,
  parentCommentId = null,
  page = 1,
  limit = 10,
}) => {
  let url;
  if (parentCommentId) {
    // If parentCommentId is provided, fetch replies to that specific comment
    url = `${BASE_URL}/${postId}/comments/${parentCommentId}/replies`;
  } else {
    // If parentCommentId is null, fetch top-level comments for the post
    url = `${BASE_URL}/${postId}/comments`;
  }
  url += `?page=${page}&limit=${limit}`;

  // Log the URL being fetched for debugging
  console.log("Fetching comments from URL:", url);

  const res = await fetch(url);
  const data = await res.json();

  if (!res.ok) {
    console.error(`Error fetching comments from ${url}:`, data.error || res.statusText);
    throw new Error(data.error || "Failed to fetch comments");
  }
  return data;
};

/**
 * Adds a new top-level comment to a post.
 * @param {string} postId The ID of the post to comment on.
 * @param {string} text The content of the comment.
 * @returns {Promise<Object>} The newly created comment object.
 * @throws {Error} If the API call fails.
 */
export const addCommentApi = async ({ postId, text }) => {
  const res = await fetch(`${BASE_URL}/${postId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to add comment");
  }
  return data;
};

/**
 * Replies to an existing comment.
 * @param {string} postId The ID of the post the parent comment belongs to.
 * @param {string} parentCommentId The ID of the comment being replied to.
 * @param {string} text The content of the reply.
 * @returns {Promise<Object>} The newly created reply comment object.
 * @throws {Error} If the API call fails.
 */
export const replyToCommentApi = async ({ postId, parentCommentId, text }) => {
  const res = await fetch(`${BASE_URL}/${postId}/${parentCommentId}/reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to reply to comment");
  }
  return data;
};

/**
 * Likes or unlikes a comment.
 * @param {string} commentId The ID of the comment to like/unlike.
 * @returns {Promise<Object>} A confirmation message or updated likes array.
 * @throws {Error} If the API call fails.
 */
export const likeUnlikeCommentApi = async ({ commentId }) => {
  const res = await fetch(`${BASE_URL}/${commentId}/like`, {
    method: "POST",
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to like/unlike comment");
  }
  return data;
};

/**
 * Deletes a comment (and its replies).
 * @param {string} commentId The ID of the comment to delete.
 * @returns {Promise<Object>} A confirmation message.
 * @throws {Error} If the API call fails.
 */
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
