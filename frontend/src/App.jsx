import { Navigate, Route, Routes, useLocation } from "react-router-dom"
import { Suspense, lazy, useState } from "react"
import Sidebar from "./components/common/Sidebar"
import RightPanel from "./components/common/RightPanel"
import { useAuthUser } from "./hooks/authHooks/useAuthUser"
import { Toaster } from "react-hot-toast"
import ImageModal from "./components/ui/ImageModal"
import ProfileImageModal from "./components/ui/ProfileImageModal"
import { useAppStore } from "./store/useAppStore"
import { useEffect } from "react"
import { usePWAInstall } from "./hooks/customHooks/usePWAInstall"
import { registerSW } from "virtual:pwa-register"
import { useGlobalPrivateChatSocketEvents } from "./hooks/socketEventHooks/useGlobalPrivateChatSocketEvents"
import { useGlobalPublicChatSocketEvents } from "./hooks/socketEventHooks/useGlobalPublicChatSocketEvent"
import ResetPasswordPage from "./pages/ResetPasswordPage"
import ForgotPasswordPage from "./pages/ForgotPasswordPage"
import PomodoroPage from "./pages/PomodoroPage"
import StudyActivityPage from "./pages/StudyActivityPage"
import StudyLeaderboard from "./pages/StudyLeaderboard"

const ImageViewerPage = lazy(() => import("./components/common/ImageViewerPage"))
const CreatePostModal = lazy(() => import("./components/common/posts/CreatePostModal"))
const PublicChatPage = lazy(() => import("./pages/publicChat/PublicChatPage"))
const BookmarksPage = lazy(() => import("./pages/bookmarks/BookmarksPage"))
const ThemesPage = lazy(() => import("./pages/themes/ThemesPage"))
const HomePage = lazy(() => import("./pages/home/HomePage"))
const LoginPage = lazy(() => import("./pages/auth/login/LoginPage"))
const SignupPage = lazy(() => import("./pages/auth/signup/SignupPage"))
const ProfilePage = lazy(() => import("./pages/profile/ProfilePage"))
const NotificationPage = lazy(() => import("./pages/notification/NotifcationPage"))
const MessagesPage = lazy(() => import("./pages/message/MessagePage"))
const PostPage = lazy(() => import("./pages/post/PostPage"))
const SearchPage = lazy(() => import("./pages/search/SearchPage"))

const MainLayout = ({ children, deferredPrompt, isInstalled, installApp, isPushSubscribed }) => {
  const {pathname} = useLocation()
  const isMessagePage = pathname.includes("/messages")
  const isPublicChatPage = pathname.includes("/public-chat")

  const { setShowCreatePostModal } = useAppStore()

  const shouldHideSidePanels = pathname.includes("/study") || pathname.includes("/pomodoro")

  return (
    <div className="mx-auto flex min-h-screen flex-col bg-base-100 md:max-w-[1240px] md:flex-row">
      {!shouldHideSidePanels && <Sidebar
        onOpenCreatePostModal={() => setShowCreatePostModal(true)}
        isPushSubscribed={isPushSubscribed}
        deferredPrompt={deferredPrompt}
        isInstalled={isInstalled}
        installApp={installApp}
      />}
      <main
        className={`${
          isPublicChatPage ? "flex h-screen max-h-screen flex-col md:flex-1" : "flex-1 md:pb-0"
        }`}
      >
        {children}
      </main>
      {!isMessagePage &&
        !isPublicChatPage &&
        !shouldHideSidePanels && (
          <RightPanel
            deferredPrompt={deferredPrompt}
            isInstalled={isInstalled}
            installApp={installApp}
            isPushSubscribed={isPushSubscribed}
            className="hidden md:block"
          />
        )}
    </div>
  )
}

function App() {
  const { authUser, isLoading } = useAuthUser()
  const {
    selectedProfileImage,
    closeProfileImageModal,
    selectedImage,
    closeImageModal,
    showCreatePostModal,
    setShowCreatePostModal,
  } = useAppStore()

  const [feedType, setFeedType] = useState("posts")

  const { deferredPrompt, isInstalled, installApp } = usePWAInstall()
  const [isPushSubscribed, setIsPushSubscribed] = useState(false)

  useGlobalPrivateChatSocketEvents()
  useGlobalPublicChatSocketEvents()

  useEffect(() => {
    // Check subscription status on component mount
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

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        {/* <LoadingSpinner size="lg" /> */}
      </div>
    )
  }

  return (
    <>
      <Suspense fallback={<div className="flex h-screen items-center justify-center"></div>}>
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
            path="/images/:imageId"
            element={authUser ? <ImageViewerPage /> : <Navigate to="/login" />}
          />

          <Route
            path="/*"
            element={
              authUser ? (
                <MainLayout
                  deferredPrompt={deferredPrompt}
                  isInstalled={isInstalled}
                  installApp={installApp}
                  isPushSubscribed={isPushSubscribed}
                >
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route
                      path="/profile/:username"
                      element={<ProfilePage feedType={feedType} setFeedType={setFeedType} />}
                    />
                    <Route path="/notifications" element={<NotificationPage />} />
                    <Route path="/messages" element={<MessagesPage />} />
                    <Route path="/messages/:conversationId" element={<MessagesPage />} />
                    <Route path="/public-chat" element={<PublicChatPage />} />
                    <Route path="/bookmarks" element={<BookmarksPage />} />
                    <Route path="/themes" element={<ThemesPage />} />
                    <Route path="/:username/post/:pid" element={<PostPage />} />
                    <Route path="/search" element={<SearchPage />} />
                    <Route path="/pomodoro" element={<PomodoroPage />} />
                    <Route path="/study-activity" element={<StudyActivityPage />} />
                    <Route path="/study-leaderboard" element={<StudyLeaderboard />} />
                  </Routes>
                </MainLayout>
              ) : (
                <Navigate to="/login" />
              )
            }
          />
        </Routes>
      </Suspense>

      {/* {authUser && !isMessagePage && !isPublicChatPage && isLoading && (
        <RightPanel className="hidden md:block" />
      )} */}
      <Toaster position="bottom-center" />
      <ImageModal src={selectedImage} onClose={closeImageModal} />
      <ProfileImageModal src={selectedProfileImage} onClose={closeProfileImageModal} />
      {showCreatePostModal && <CreatePostModal onClose={() => setShowCreatePostModal(false)} />}
    </>
  )
}

export default App
