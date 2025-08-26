import { useState } from "react"
import { useParams } from "react-router-dom"
import { showAppToast } from "../../utils/showAppToast"
import { MdPassword } from "react-icons/md"
import { FaEye, FaEyeSlash } from "react-icons/fa6"
import { useResetPasswordRequest } from "../../features/auth/authHooks/useResetPasswordRequest"

const ResetPasswordPage = () => {
  const { token } = useParams()
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [focusedField, setFocusedField] = useState(false)

  const { resetPassword, isResetting } = useResetPasswordRequest()

  const handleSubmit = (e) => {
    e.preventDefault()

    if (newPassword !== confirmNewPassword) {
      showAppToast("Passwords do not match.", "error")
      return
    }

    if (newPassword.length < 6) {
      showAppToast("Password must be at least 6 characters long.", "error")
      return
    }

    resetPassword({ token, newPassword })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 p-8">
        <img src="klaynelogo2.png" className="h-12 w-auto rounded-lg bg-gray-950" loading="lazy" />

        <h1 className="text-3xl font-bold">Set a new password</h1>

        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
          <label
            className={`${focusedField === "newPassword" ? "border-primary" : "border-gray-600"} relative flex w-full items-center gap-2 rounded-lg border px-4 py-3 focus:border-primary`}
          >
            <MdPassword className="text-gray-500" />
            <input
              type={showPassword ? "text" : "password"}
              className="grow bg-transparent pr-8 text-white placeholder-gray-500 focus:outline-none"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              onFocus={() => setFocusedField("newPassword")}
              onBlur={() => setFocusedField(null)}
              disabled={isResetting}
            />
            <span
              className="absolute right-4 cursor-pointer text-gray-500"
              onClick={() => setShowPassword(!showPassword)}
            >
              {!showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </label>

          <label
            className={` ${focusedField === "confirmPassword" ? "border-primary" : "border-gray-600"} relative flex w-full items-center gap-2 rounded-lg border border-gray-600 bg-black px-4 py-3`}
          >
            <MdPassword className="text-gray-500" />
            <input
              type={showPassword ? "text" : "password"}
              className="grow bg-transparent pr-8 text-white placeholder-gray-500 focus:outline-none"
              placeholder="Confirm New Password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              onFocus={() => setFocusedField("confirmPassword")}
              onBlur={() => setFocusedField(null)}
              disabled={isResetting}
            />
            <span
              className="absolute right-4 cursor-pointer text-gray-500"
              onClick={() => setShowPassword(!showPassword)}
            >
              {!showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </label>

          <button
            type="submit"
            disabled={isResetting}
            className="w-full rounded-full bg-white p-3 font-bold text-black transition-colors duration-200 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400"
          >
            {isResetting ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ResetPasswordPage
