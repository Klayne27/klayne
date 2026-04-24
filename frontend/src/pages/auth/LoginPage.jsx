import { useState } from "react"
import { Link } from "react-router-dom"
import { MdOutlineMail, MdPassword } from "react-icons/md"
import { FaEye, FaEyeSlash } from "react-icons/fa6"
import { FaClock, FaTrophy, FaUsers, FaLayerGroup } from "react-icons/fa6"
import { useLogin } from "../../features/auth/authHooks/useAuthMutations"
import GoogleSignInButton from "../../components/common/GoogleSignInButton"
import { shouldTextBeWhite } from "../../utils/shouldTextBeWhite"
import { useTheme } from "../../context/ThemeContext"

const FEATURES = [
  {
    icon: <FaClock size={16} />,
    title: "Pomodoro Timer",
    desc: "Study in focused sessions, earn XP, level up your profile.",
  },
  {
    icon: <FaUsers size={16} />,
    title: "Student Community",
    desc: "Post, vent anonymously, or chat in real-time with other students.",
  },
  {
    icon: <FaTrophy size={16} />,
    title: "Weekly Leaderboards",
    desc: "Compete for the top study streaks and unlock exclusive rewards.",
  },
  {
    icon: <FaLayerGroup size={16} />,
    title: "Wardrobe & Identity",
    desc: "Unlock rings, fonts, and nameplates as you hit study milestones.",
  },
]

const LoginPage = () => {
  const [formData, setFormData] = useState({ email: "", password: "" })
  const [showPassword, setShowPassword] = useState(false)
  const { theme } = useTheme()
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
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* ── LEFT: Hero Panel ──────────────────────────────────────────── */}
      <div className="relative flex flex-col justify-between overflow-hidden bg-base-200 p-8 lg:w-[50%] lg:p-14">
        {/* Subtle background decoration */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 80% 20%, var(--color-primary, #a78bfa) 0px, transparent 55%), " +
              "radial-gradient(circle at 20% 80%, var(--color-primary, #a78bfa) 0px, transparent 55%)",
          }}
        />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <img
            src="klaynelogo2.png"
            className="h-9 w-9 rounded-xl object-cover"
            loading="lazy"
            alt="Klayne"
          />
          <span className="text-xl font-bold tracking-tight">Klayne</span>
        </div>

        {/* Hero copy */}
        <div className="relative my-10 lg:my-0 lg:flex lg:flex-1 lg:flex-col lg:justify-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary opacity-80">
            Built for students
          </p>
          <h1 className="mb-4 text-4xl font-extrabold leading-tight tracking-tight lg:text-5xl">
            Study smarter.
            <br />
            <span className="text-primary">Together.</span>
          </h1>
          <p className="max-w-md text-base leading-relaxed text-slate-400">
            Klayne is where productivity meets community — a social hub for students to focus,
            connect, and grow without leaving a single tab.
          </p>

          {/* Feature list */}
          <ul className="mt-8 flex flex-col gap-5">
            {FEATURES.map(({ icon, title, desc }) => (
              <li key={title} className="flex items-start gap-4">
                <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {icon}
                </div>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-xs leading-relaxed text-slate-500">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer quote */}
        <p className="relative hidden text-xs text-slate-600 lg:block">
          "The best study session is the one you actually show up for."
        </p>
      </div>

      {/* ── RIGHT: Form Panel ─────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 lg:px-14">
        <div className="w-full max-w-sm">
          {/* Mobile logo (hidden on lg) */}
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <img src="klaynelogo2.png" className="h-8 w-8 rounded-xl" loading="lazy" alt="Klayne" />
            <span className="text-lg font-bold">Klayne</span>
          </div>

          <h2 className="mb-1 text-2xl font-extrabold">Welcome back</h2>
          <p className="mb-7 text-sm text-slate-500">Log in to your account to continue.</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="input input-bordered flex items-center gap-2 rounded-xl">
              <MdOutlineMail className="shrink-0 text-slate-400" />
              <input
                type="text"
                className="grow"
                placeholder="Email"
                name="email"
                onChange={handleInputChange}
                value={formData.email}
                autoComplete="email"
              />
            </label>

            <label className="input input-bordered relative flex items-center gap-2 rounded-xl">
              <MdPassword className="shrink-0 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                className="mr-8 grow"
                placeholder="Password"
                name="password"
                onChange={handleInputChange}
                value={formData.password}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="absolute right-3 text-slate-400 transition hover:text-slate-200"
                onClick={() => setShowPassword((s) => !s)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FaEye size={15} /> : <FaEyeSlash size={15} />}
              </button>
            </label>

            {/* Forgot password — uncomment when ready */}
            {/* <Link to="/forgot-password" className="self-end text-xs text-primary hover:underline">
              Forgot password?
            </Link> */}

            <button
              type="submit"
              className={`mt-1 rounded-full bg-primary py-3 text-sm font-semibold transition duration-200 hover:bg-primary/80 disabled:opacity-60 ${shouldTextBeWhite(theme)}`}
              disabled={isPending}
            >
              {isPending ? "Signing in…" : "Sign in"}
            </button>

            {isError && (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-center text-sm text-red-400">
                {error.message}
              </p>
            )}
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-accent" />
            <span className="text-xs text-slate-500">or continue with</span>
            <div className="h-px flex-1 bg-accent" />
          </div>

            <div className="flex justify-center">

          <GoogleSignInButton />
            </div>

          <p className="mt-7 text-center text-sm text-slate-500">
            Don't have an account?{" "}
            <Link to="/signup" className="font-semibold text-primary hover:underline">
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
