import { useSignInWithGoodle } from "../../features/auth/authHooks/useAuthMutations"

const  GoogleSignInButton = () => {
  const { googleSignIn, isPending } = useSignInWithGoodle()

  return (
    <button
      disabled={isPending}
      className="flex justify-center items-center gap-3 rounded-full border border-accent bg-white px-3 py-2 text-black transition duration-200 hover:bg-white/80 disabled:opacity-50"
      onClick={() => googleSignIn()}
    >
      <img src="/google-icon.png" className="size-6" alt="Google" />
      <span className="font-semibold">{isPending ? "Signing in..." : "Sign in with Google"}</span>
    </button>
  )
}

export default GoogleSignInButton