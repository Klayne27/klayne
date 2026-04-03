import { useState } from "react"
import { Link } from "react-router-dom"
import { MdOutlineMail } from "react-icons/md"
import { MdPassword } from "react-icons/md"
import { FaEye, FaEyeSlash } from "react-icons/fa6"
import GoogleSignInButton from "../../components/common/GoogleSignInButton"
import { useLogin } from "../../features/auth/authHooks/useAuthMutations"

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  const [showPassword, setShowPassword] = useState(false)

  const { login, isPending, isError, error } = useLogin()

  const handleSubmit = (e) => {
    e.preventDefault()
    login(formData)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  return (
    <div className="mx-auto flex h-screen max-w-screen-xl">
      <div className="hidden flex-1 items-center justify-center lg:flex">
        <img src="klaynelogo2.png" className="rounded-3xl" loading="lazy" />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <img src="klaynelogo2.png" className="w-24 rounded-2xl lg:hidden" loading="lazy" />

          <h1 className="text-4xl font-extrabold">Let's go.</h1>
          <label className="input input-bordered flex items-center gap-2 rounded">
            <MdOutlineMail />
            <input
              type="text"
              className="grow"
              placeholder="Email"
              name="email"
              onChange={handleInputChange}
              value={formData.email}
            />
          </label>

          <label className="input input-bordered relative flex items-center gap-2 rounded">
            <MdPassword />
            <input
              type={showPassword ? "text" : "password"}
              className="mr-6 grow"
              placeholder="Password"
              name="password"
              onChange={handleInputChange}
              value={formData.password}
            />
            <span
              className="absolute right-4 cursor-pointer text-slate-500"
              onClick={() => setShowPassword(!showPassword)}
            >
              {!showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </label>
          <button className="rounded-full bg-primary py-3 text-sm font-semibold text-white transition duration-200 hover:bg-primary/80">
            {isPending ? "Loading..." : "Login"}
          </button>
          {isError && <p className="text-center text-red-500">{error.message}</p>}
        </form>
        {/* <Link to="/forgot-password">
          <p className="mt-4 text-center text-sm text-primary hover:underline">Forgot password?</p>
        </Link> */}
        <div className="divider my-4">OR</div>
        <GoogleSignInButton />
        <div className="divider my-4"></div>

        <div className="flex flex-col gap-2">
          <p className="text-lg">{"Don't"} have an account?</p>
          <Link to="/signup">
            <button className="btn btn-outline btn-primary w-full rounded-full text-white">
              Sign up
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}
export default LoginPage
