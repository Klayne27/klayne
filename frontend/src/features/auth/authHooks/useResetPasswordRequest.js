import { useMutation } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { showAppToast } from "../../utils/showAppToast"
import { resetPasswordRequestApi } from "../../../api/authApi"

export const useResetPasswordRequest = () => {
  const navigate = useNavigate()
  
  const {
    mutate: resetPassword,
    isPending: isResetting,
    isError,
  } = useMutation({
    mutationFn: resetPasswordRequestApi,
    onSuccess: () => {
      showAppToast("Password reset successfully.", "success")

      navigate("/login")
    },
    onError: (error) => {
      showAppToast(error.message, "error")
    },
  })

  return { resetPassword, isResetting, isError }
}
