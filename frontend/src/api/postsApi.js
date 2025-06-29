export const fetchPostsApi = async (POST_ENDPOINT, pageParam = 1, limit = 30) => {
  const url = `${POST_ENDPOINT}?page=${pageParam}&limit=${limit}`;
  const res = await fetch(url);

  const data = await res.json();

  if (!res.ok) throw new Error(data.error || "Something went wrong");
  console.log(data);
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

