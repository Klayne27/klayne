export const fetchPostsApi = async (POST_ENDPOINT, pageParam = 1, limit = 10) => {
  const url = `${POST_ENDPOINT}?page=${pageParam}&limit=${limit}`;
  const res = await fetch(url);

  const data = await res.json();

  if (!res.ok) throw new Error(data.error || "Something went wrong");

  return data;
};

export const createPostApi = async (text, img) => {
  const res = await fetch("/api/posts/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, img }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Something went wrong");

  return data;
};

export const deletePostApi = async (post) => {
  const res = await fetch(`/api/posts/${post._id}`, {
    method: "DELETE",
  });

  const data = res.json();

  if (!res.ok) throw new Error(data.error || "Something went wrong");

  return data;
};

export const likePostApi = async (post) => {
  const res = await fetch(`/api/posts/like/${post._id}`, {
    method: "POST",
  });

  const data = res.json();

  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
};

export const addCommentApi = async ({ postId, text }) => {
  const res = await fetch(`/api/posts/comment/${postId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Failed to add comment");
  }
  return res.json();
};

export const fetchPostApi = async (postId) => {
  const res = await fetch(`/api/posts/${postId}`);
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Failed to fetch post");
  }
  return res.json();
};

export const deleteCommentApi = async ({ postId, commentId }) => {
  const res = await fetch(`/api/posts/comment/${postId}/${commentId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to delete comment");
  }
  return data;
};

export const likeUnlikeCommentApi = async (postId, commentId) => {
  try {
    const res = await fetch(`/api/posts/like-comment/${postId}/${commentId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Important for sending cookies/auth token
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to like/unlike comment");
    }
    return data; // Typically returns a success message or updated data
  } catch (error) {
    console.error("Error liking/unliking comment:", error);
    throw error;
  }
};