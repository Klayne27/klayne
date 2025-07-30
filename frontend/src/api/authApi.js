const BASE_URL = "/api/auth"

export const signupApi = async (formData) => {
  const res = await fetch(`${BASE_URL}/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(formData),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to create account");
  return data;
};

export const loginApi = async (formData) => {
  const res = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
};

export const logoutApi = async () => {
  const res = await fetch(`${BASE_URL}/logout`, {
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
    const res = await fetch(`${BASE_URL}/me`);
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
