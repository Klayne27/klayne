export const fetchPostsApi = async (POST_ENDPOINT, pageParam = 1, limit = 15) => {
  const url = `${POST_ENDPOINT}?page=${pageParam}&limit=${limit}`;
  const res = await fetch(url);

  const data = await res.json();

  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
};

export const createPostApi = async ({ text, img, video, pollOptions }) => {
  const res = await fetch("/api/posts/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, img, video, pollOptions }),
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