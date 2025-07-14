export const fetchPostsApi = async (POST_ENDPOINT, pageParam = 1, limit = 15) => {
  const url = `${POST_ENDPOINT}?page=${pageParam}&limit=${limit}`;
  const res = await fetch(url);

  const data = await res.json();

  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
};

export const createPostApi = async ({ text, img, video, pollOptions, scheduledAt }) => {
  const res = await fetch("/api/posts/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, img, video, pollOptions, scheduledAt }),
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

export const likePostApi = async (postId) => {
  const res = await fetch(`/api/posts/like/${postId}`, {
    method: "POST",
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to like/unlike post: Something went wrong");
  }
  return data;
};

export const fetchPostApi = async (postId) => {
  const res = await fetch(`/api/posts/${postId}`);
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Failed to fetch post");
  }
  return res.json();
};

export const toggleBookmarkApi = async (postId) => {
  const res = await fetch(`/api/posts/bookmark/${postId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  const data = await res.json();

  if (!res.ok) throw new Error(data.error || "Failed to bookmark post");

  return data;
};

export const getBookmarkedPostsApi = async ({ pageParam = 1, searchQuery = "" }) => {
  const url = new URL("/api/posts/bookmarked", window.location.origin);
  url.searchParams.append("page", pageParam);
  url.searchParams.append("limit", 10);

  if (searchQuery) {
    url.searchParams.append("query", searchQuery);
  }

  const res = await fetch(url.toString(), {
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to load bookmarks");
  }

  return data;
};

export const voteOnPollApi = async ({ postId, optionId }) => {
  const res = await fetch(`/api/posts/${postId}/vote`, {
      method: "POST",
      headers: {
          "Content-Type": "application/json",
      },
      body: JSON.stringify({ optionId }),
  });

  const data = await res.json();
  if (!res.ok) {
      throw new Error(data.error || "Failed to cast vote on poll.");
  }
  return data;
};

export const pinUnpinPostApi = async (postId) => {
  const res = await fetch(`/api/posts/pin/${postId}`, {
    method: "POST", // POST for pinning
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Failed to pin post");
  }
  return res.json();
};

export const unpinPostApi = async (postId) => {
  const res = await fetch(`/api/posts/pin/${postId}`, {
    method: "DELETE", // DELETE for unpinning
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Failed to unpin post");
  }
  return res.json();
};

// New API client functions for scheduled posts
export const fetchScheduledPostsApi = async () => {
  const res = await fetch("/api/posts/scheduled");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch scheduled posts");
  return data;
};

export const updateScheduledPostApi = async ({ postId, postData }) => {
  const res = await fetch(`/api/posts/scheduled/${postId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(postData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to update scheduled post");
  return data;
};

export const deleteScheduledPostApi = async (postId) => {
  const res = await fetch(`/api/posts/scheduled/${postId}`, {
    method: "DELETE",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to delete scheduled post");
  return data;
};