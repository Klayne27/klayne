import { useMutation, useQueryClient } from "@tanstack/react-query"
import { loginApi, logoutApi, signInWithGoogleApi, signupApi } from "../../../api/authApi"
import { showAppToast } from "../../../utils/showAppToast"
import { userKeys } from "../../users/usersHooks/userKeys"
import { useNavigate } from "react-router-dom"

export const useLogin = () => {
  const queryClient = useQueryClient()

  const {
    mutate: login,
    isPending,
    isError,
    error,
  } = useMutation({
    mutationFn: loginApi,
    onSuccess: (data) => {
      queryClient.setQueryData(userKeys.auth(), data)
      showAppToast("Welcome back!", "success")
    },
    onError: (error) => {
      showAppToast(error.message || "Login failed", "error")
    },
  })

  return { login, isPending, isError, error }
}

export const useLogout = () => {
  const queryClient = useQueryClient()

  const { mutate: logout } = useMutation({
    mutationFn: logoutApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.auth() })
    },
    onError: () => {
      showAppToast("Logout failed", "error")
    },
  })

  return { logout }
}

export const useSignup = () => {
  const queryClient = useQueryClient()

  const {
    mutate: signup,
    isPending,
    isError,
    error,
  } = useMutation({
    mutationFn: signupApi,
    onSuccess: () => {
      showAppToast("Signup successful! Welcome to Klayne!", "success")
      queryClient.invalidateQueries({ queryKey: userKeys.auth() })
    },
  })

  return { signup, isPending, isError, error }
}

export const useSignInWithGoodle = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { mutate: googleSignIn, isPending } = useMutation({
    mutationFn: signInWithGoogleApi,
    onSuccess: (userData) => {
      queryClient.setQueryData(userKeys.auth(), userData)
      queryClient.invalidateQueries({ queryKey: userKeys.auth() })

      navigate("/")
    },
    onError: (error) => {
      console.error("Google Sign-In Error:", error.message)
      showAppToast("Failed to sign in. Please try again.", "error")
    },
  })

  return { googleSignIn, isPending }
}
