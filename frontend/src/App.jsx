import { Navigate, Route, Routes } from "react-router-dom"
import { Suspense, lazy } from "react"
import { useAuthUser } from "./features/auth/authHooks/useAuthUser"
import { Toaster } from "react-hot-toast"
// import ImageModal from "./components/common/ImageModal"
// import ProfileImageModal from "./components/common/ProfileImageModal"
import { useAppStore } from "./store/useAppStore"
import { useEffect } from "react"
import { usePWAInstall } from "./hooks/customHooks/usePWAInstall"
import { registerSW } from "virtual:pwa-register"
import { useGlobalPrivateChatSocketEvents } from "./hooks/socketEventHooks/useGlobalPrivateChatSocketEvents"
import { useGlobalPublicChatSocketEvents } from "./hooks/socketEventHooks/useGlobalPublicChatSocketEvent"
import LoadingSpinner from "./components/common/LoadingSpinner"
import { useGlobalNotificationSocketEvent } from "./hooks/socketEventHooks/useGlobalNotificationSocketEvent"
import { resubscribeIfNeeded } from "./utils/push"
import ImageLightbox from "./features/board/components/ImageLightbox"
import { useLightboxStore } from "./store/useLightboxStore"

const LoginPage = lazy(() => import("./pages/auth/LoginPage"))
const SignupPage = lazy(() => import("./pages/auth/SignupPage"))
// const ResetPasswordPage = lazy(() => import("./pages/auth/ResetPasswordPage"))
// const ForgotPasswordPage = lazy(() => import("./pages/auth/ForgotPasswordPage"))
const AuthenticatedLayout = lazy(() => import("./AuthenticatedLayout"))

function App() {
  const { authUser, isLoading } = useAuthUser()
  // const { selectedProfileImage, closeProfileImageModal, selectedImage, closeImageModal } =
  //   useAppStore()
  const { deferredPrompt, isInstalled, installApp, isIOSDevice } = usePWAInstall()
const { isOpen, images, currentIndex, closeLightbox, goNext, goPrev } = useLightboxStore()

  useGlobalPrivateChatSocketEvents()
  useGlobalPublicChatSocketEvents()
  useGlobalNotificationSocketEvent()

  useEffect(() => {
    const supportsCssVars = window.CSS && window.CSS.supports("color", "var(--x)")

    if (!supportsCssVars) {
      document.documentElement.classList.add("no-css-vars")
      document.documentElement.setAttribute("data-theme", "light")
    } else {
      const savedTheme = localStorage.getItem("theme") || "black"
      document.documentElement.setAttribute("data-theme", savedTheme)
    }
  }, [])

  useEffect(() => {
    const initPush = async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return

      if (Notification.permission !== "granted") return

      try {
        await resubscribeIfNeeded()
      } catch (err) {
        console.error("Push init error:", err)
      }
    }

    initPush()
  }, [])

  useEffect(() => {
    const updateSW = registerSW({
      onNeedRefresh() {
        window.location.reload()
      },
    })
    updateSW()
  }, [])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <>
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        }
      >
        <Routes>
          <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to="/" />} />
          <Route path="/signup" element={!authUser ? <SignupPage /> : <Navigate to="/" />} />
          {/* <Route
            path="/reset-password/:token"
            element={!authUser ? <ResetPasswordPage /> : <Navigate to="/" />}
          />
          <Route
            path="/forgot-password"
            element={!authUser ? <ForgotPasswordPage /> : <Navigate to="/" />}
          /> */}

          <Route
            path="/*"
            element={
              authUser ? (
                <AuthenticatedLayout
                  deferredPrompt={deferredPrompt}
                  isInstalled={isInstalled}
                  installApp={installApp}
                  isIOSDevice={isIOSDevice} // ADD
                />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
        </Routes>
      </Suspense>

      <Toaster
        position="bottom-center"
        containerStyle={{
          zIndex: 99999, // Ensure this is higher than your modal's z-index
        }}
        toastOptions={{
          // This applies to all toasts
          style: {
            zIndex: 99999,
          },
        }}
      />
      {/* <ImageModal src={selectedImage} onClose={closeImageModal} />
      <ProfileImageModal src={selectedProfileImage} onClose={closeProfileImageModal} /> */}
      {isOpen && (
        <ImageLightbox
          images={images}
          currentIndex={currentIndex}
          onClose={closeLightbox}
          onNext={goNext}
          onPrev={goPrev}
        />
      )}
    </>
  )
}

export default App
