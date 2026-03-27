import { signInWithPopup } from "firebase/auth"
import { useNavigate } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { userKeys } from "../../features/users/usersHooks/userKeys"
import { auth, googleProvider } from "../../services/firebase"

const GoogleSignInButton = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient() // Get the query client

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const idToken = await result.user.getIdToken()

      const response = await fetch("/api/auth/google", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      })

      if (response.ok) {
        const userData = await response.json()
        await queryClient.invalidateQueries({ queryKey: userKeys.auth() })

        navigate("/") // Navigate to the homepage
      } else {
        const errorData = await response.json()
        console.error("Backend error:", errorData)
      }
    } catch (error) {
      console.error("Google Sign-In error:", error.message)
    }
  }

  return (
    <button
      className="flex gap-3 rounded-full border border-accent bg-white px-3 py-2 text-black transition duration-200 hover:bg-white/80"
      onClick={handleGoogleSignIn}
    >
      <img src="/google-icon.png" className="size-6" />
      <span className="font-semibold">Sign in with Google</span>
    </button>
  )
}

export default GoogleSignInButton
