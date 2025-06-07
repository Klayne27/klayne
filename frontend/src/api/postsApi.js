export const fetchPostsApi = async (POST_ENDPOINT) => {
  const res = await fetch(POST_ENDPOINT);
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

export const commentPostApi = async (post, comment) => {
  const res = await fetch(`/api/posts/comment/${post._id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: comment }),
  });
  const data = await res.json();

  if (!res.ok) throw new Error(data.error || "Something went wrong");

  return data;
};
