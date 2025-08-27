import { Navigate, Route, Routes } from "react-router-dom"
import { Suspense, lazy } from "react"
import { useAuthUser } from "./features/auth/authHooks/useAuthUser"
import { Toaster } from "react-hot-toast"
import ImageModal from "./components/common/ImageModal"
import ProfileImageModal from "./components/common/ProfileImageModal"
import { useAppStore } from "./store/useAppStore"
import { useEffect } from "react"
import { usePWAInstall } from "./hooks/customHooks/usePWAInstall"
import { registerSW } from "virtual:pwa-register"
import { useGlobalPrivateChatSocketEvents } from "./hooks/socketEventHooks/useGlobalPrivateChatSocketEvents"
import { useGlobalPublicChatSocketEvents } from "./hooks/socketEventHooks/useGlobalPublicChatSocketEvent"
import LoadingSpinner from "./components/common/LoadingSpinner"
import { useState } from "react"
import { useGlobalNotificationSocketEvent } from "./hooks/socketEventHooks/useGlobalNotificationSocketEvent"
import { useTodoStore } from "./store/useTodoStore"
import useLockBodyScroll from "./hooks/customHooks/useLockBodyScroll"

const LoginPage = lazy(() => import("./pages/auth/LoginPage"))
const SignupPage = lazy(() => import("./pages/auth/SignupPage"))
const ResetPasswordPage = lazy(() => import("./pages/auth/ResetPasswordPage"))
const ForgotPasswordPage = lazy(() => import("./pages/auth/ForgotPasswordPage"))

const AuthenticatedLayout = lazy(() => import("./AuthenticatedLayout"))

function App() {
  const { authUser, isLoading } = useAuthUser()
  const { selectedProfileImage, closeProfileImageModal, selectedImage, closeImageModal } =
    useAppStore()
  const { deferredPrompt, isInstalled, installApp } = usePWAInstall()
  const [isPushSubscribed, setIsPushSubscribed] = useState(false)

  useGlobalPrivateChatSocketEvents()
  useGlobalPublicChatSocketEvents()
  useGlobalNotificationSocketEvent()

  useEffect(() => {
    const checkSubscription = async () => {
      if ("serviceWorker" in navigator && "PushManager" in window) {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        setIsPushSubscribed(!!subscription)
      }
    }
    checkSubscription()
  }, [])

  useEffect(() => {
    const updateSW = registerSW({
      onNeedRefresh() {
        window.location.reload()
      },
    })
    updateSW()
  }, [])

    const isAddTodoMenuOpen = useTodoStore((state) => state.isAddTodoMenuOpen)
    const isEditTodoMenuOpen = useTodoStore((state) => state.isEditTodoMenuOpen)
    const isMenuOpen = isAddTodoMenuOpen || isEditTodoMenuOpen

    useLockBodyScroll(isMenuOpen)

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
          <Route
            path="/reset-password/:token"
            element={!authUser ? <ResetPasswordPage /> : <Navigate to="/" />}
          />
          <Route
            path="/forgot-password"
            element={!authUser ? <ForgotPasswordPage /> : <Navigate to="/" />}
          />

          <Route
            path="/*"
            element={
              authUser ? (
                <AuthenticatedLayout
                  deferredPrompt={deferredPrompt}
                  isInstalled={isInstalled}
                  installApp={installApp}
                  isPushSubscribed={isPushSubscribed}
                />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
        </Routes>
      </Suspense>

      <Toaster position="bottom-center" />
      <ImageModal src={selectedImage} onClose={closeImageModal} />
      <ProfileImageModal src={selectedProfileImage} onClose={closeProfileImageModal} />
    </>
  )
}

export default App
