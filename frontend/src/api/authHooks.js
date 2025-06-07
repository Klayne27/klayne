export const signupApi = async (email, username, fullName, password) => {
  const res = await fetch("/api/auth/signup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, username, fullName, password }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to create account");
  return data;
};

export const loginApi = async (username, password) => {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
};

export const logoutApi = async () => {
  const res = await fetch("/api/auth/logout", {
    method: "POST",
  });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Something went wrong");
  }

  return data;
};

export const authUserApi = async () => {
  try {
    const res = await fetch("/api/auth/me");
    const data = await res.json();
    if (data.error) return null;
    if (!res.ok) {
      throw new Error(data.error || "Something went wrong");
    }
    return data;
  } catch (error) {
    throw new Error(error);
  }
};
