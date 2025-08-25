import { useState } from "react"
import { useForgotPasswordRequest } from "../hooks/authHooks/useForgotPasswordRequest"
import { FaXTwitter } from "react-icons/fa6"
import { Link } from "react-router-dom"
import { MdOutlineMail } from "react-icons/md"

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("")
  const [focusedField, setFocusedField] = useState("")

  const { forgotPassword, isSending, isError, isSuccess, error } = useForgotPasswordRequest()

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!email) {
      alert("Please enter your email address.")
      return
    }
    forgotPassword(email)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-base-100 text-white">
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 p-8">
        {/* <FaXTwitter className="h-10 w-10 text-primary" /> */}
        
        <img src="klaynelogo2.png" className="rounded-lg bg-gray-950 w-auto h-12" loading="lazy" />
       

        <h1 className="text-3xl font-bold">Forgot password?</h1>
        <p className="text-center text-sm text-gray-500">
          Enter your email and we'll send you a link to reset your password.
        </p>

        {isSuccess && (
          <p className="text-center text-sm text-green-500">
            A password reset link has been sent to your email.
          </p>
        )}
        {isError && <p className="text-center text-sm text-red-500">Error: {error?.message}</p>}

        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
          <label
            className={`${focusedField === "email" ? "border-primary" : "border-gray-600"} relative flex w-full items-center gap-2 rounded-lg border border-gray-600 bg-black px-4 py-3`}
          >
            <MdOutlineMail className="text-gray-500" />
            <input
              className="grow bg-transparent pr-8 text-white placeholder-gray-500 focus:outline-none"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocusedField("email")}
              onBlur={() => setFocusedField(null)}
              disabled={isSending}
            />
          </label>
          <button
            type="submit"
            disabled={isSending}
            className="transtion w-full rounded-full bg-primary p-3 font-bold text-white duration-200 hover:bg-primary/85 disabled:bg-gray-700 disabled:text-gray-400"
          >
            {isSending ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
        <Link to="/login" className="text-center text-sm text-primary hover:underline">
          Back to Login
        </Link>
      </div>
    </div>
  )
}

export default ForgotPasswordPage
