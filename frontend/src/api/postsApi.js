export const fetchPostsApi = async (POST_ENDPOINT, pageParam = 1, limit = 30) => {
  const url = `${POST_ENDPOINT}?page=${pageParam}&limit=${limit}`;
  const res = await fetch(url);

  const data = await res.json();

  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
};

export const createPostApi = async ({ text, img, video }) => {
  const res = await fetch("/api/posts/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, img, video }),
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
  url.searchParams.append("page", pageParam); // Add page parameter
  url.searchParams.append("limit", 10); // Add limit parameter (adjust as needed)

  if (searchQuery) {
    url.searchParams.append("query", searchQuery);
  }

  const res = await fetch(url.toString(), {
    // Your existing fetch options (headers, etc.)
  });

  const data = await res.json();

  if (!res.ok) {
    // Backend now returns error.message, use it if available
    throw new Error(data.error || "Failed to load bookmarks");
  }

  return data; // This will now contain { posts, currentPage, totalPages, hasNextPage, totalPosts }
};