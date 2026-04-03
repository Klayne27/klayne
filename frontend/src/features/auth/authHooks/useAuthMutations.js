import { useMutation, useQueryClient } from "@tanstack/react-query"
import { loginApi, logoutApi, signupApi } from "../../../api/authApi"
import { showAppToast } from "../../../utils/showAppToast"
import { userKeys } from "../../users/usersHooks/userKeys"

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
