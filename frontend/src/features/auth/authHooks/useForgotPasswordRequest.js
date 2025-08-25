import { useMutation } from "@tanstack/react-query"
import { forgotPasswordRequestApi } from "../../../api/authApi"

export const useForgotPasswordRequest = () => {
  const {
    mutate: forgotPassword,
    isPending: isSending,
    isSuccess,
    isError,
    error,
  } = useMutation({
    mutationFn: forgotPasswordRequestApi,
  })

  return { forgotPassword, isSending, isSuccess, isError, error }
}
