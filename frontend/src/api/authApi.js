const BASE_URL = "/api/auth"

export const signupApi = async (formData) => {
  const res = await fetch(`${BASE_URL}/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(formData),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to create account")
  return data
}

export const loginApi = async (formData) => {
  const res = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Something went wrong")
  return data
}

export const logoutApi = async () => {
  const res = await fetch(`${BASE_URL}/logout`, {
    method: "POST",
  })
  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || "Something went wrong")
  }

  return data
}

export const authUserApi = async () => {
  try {
    const res = await fetch(`${BASE_URL}/me`)
    const data = await res.json()
    if (data.error) return null
    if (!res.ok) {
      throw new Error(data.error || "Something went wrong")
    }
    return data
  } catch (error) {
    throw new Error(error)
  }
}

export const resetPasswordRequestApi = async ({ token, newPassword }) => {
  const response = await fetch(`${BASE_URL}/reset-password/${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newPassword }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || "Failed to reset password.")
  }

  return response.json()
}

export const forgotPasswordRequestApi = async (email) => {
  const response = await fetch(`${BASE_URL}/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || "Failed to send reset link.")
  }

  return response.json()
}