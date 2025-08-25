// In components/auth/GoogleSignInButton.jsx

import { signInWithPopup } from "firebase/auth"
import { auth, googleProvider } from "../../firebase" // Adjust path
import { useNavigate } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query" // Import useQueryClient
import { FaGoogle } from "react-icons/fa6"
import { AUTH_USER_QUERY_KEY } from "../../constants/queryKeys"

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
        await queryClient.invalidateQueries({ queryKey: AUTH_USER_QUERY_KEY })

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
      className="flex gap-3 hover:bg-secondary transition duration-200 border rounded-full px-3 py-2 border-accent"
      onClick={handleGoogleSignIn}
    >
      <img src="/google-icon.png" className="size-6" />
      <span>Sign in with Google</span>
    </button>
  )
}

export default GoogleSignInButton
