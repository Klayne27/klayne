import { Link } from "react-router-dom"
import { useState } from "react"
import { MdOutlineMail } from "react-icons/md"
import { FaUser } from "react-icons/fa"
import { MdPassword } from "react-icons/md"
import { MdDriveFileRenameOutline } from "react-icons/md"
import { FaEye, FaEyeSlash } from "react-icons/fa6"

import { useSignup } from "../features/auth/authHooks/useSignup"

const SignUpPage = () => {
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    fullName: "",
    password: "",
  })

  const [showPassword, setShowPassword] = useState(false)

  const { signup, isPending, isError, error } = useSignup(formData)

  const handleSubmit = (e) => {
    e.preventDefault()
    signup(formData)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  return (
    <div className="mx-auto flex h-screen max-w-screen-xl px-10">
      <div className="hidden flex-1 items-center justify-center lg:flex">
        <img src="klaynelogo2.png" className="rounded-3xl" loading="lazy" />
      </div>
      <div className="flex flex-1 flex-col items-center pt-8 md:justify-center">
        {/* End Warning/Reminder Section */}
        <form className="mx-auto flex flex-col gap-4 md:mx-20 lg:w-2/3" onSubmit={handleSubmit}>
          <img src="klaynelogo2.png" className="w-24 rounded-2xl lg:hidden" loading="lazy" />
          <h1 className="text-4xl font-extrabold">Join today.</h1>
          <label className="input input-bordered flex items-center gap-2 rounded">
            <MdOutlineMail />
            <input
              type="email"
              className="grow"
              placeholder="Email"
              name="email"
              onChange={handleInputChange}
              value={formData.email}
            />
          </label>
          <div className="flex flex-wrap gap-4">
            <label className="input input-bordered flex flex-1 items-center gap-2 rounded">
              <FaUser />
              <input
                type="text"
                className="grow"
                placeholder="Username"
                name="username"
                onChange={handleInputChange}
                value={formData.username}
              />
            </label>
            <label className="input input-bordered flex flex-1 items-center gap-2 rounded">
              <MdDriveFileRenameOutline />
              <input
                type="text"
                className="grow"
                placeholder="Full Name"
                name="fullName"
                onChange={handleInputChange}
                value={formData.fullName}
              />
            </label>
          </div>
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
            {isPending ? "Loading..." : "Sign up"}
          </button>
          {isError && <p className="text-red-500">{error.message}</p>}
        </form>
        <div className="mt-4 flex flex-col gap-2 lg:w-2/3">
          <p className="text-center text-lg">Already have an account?</p>
          <Link to="/login">
            <button className="btn btn-outline btn-primary w-full rounded-full">Sign in</button>
          </Link>
        </div>
      </div>
    </div>
  )
}
export default SignUpPage
