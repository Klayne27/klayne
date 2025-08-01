import { Navigate, Route, Routes, useLocation } from "react-router-dom"
import { Suspense, lazy, useState } from "react"
import Sidebar from "./components/common/Sidebar"
import RightPanel from "./components/common/RightPanel"
import { useAuthUser } from "./hooks/authHooks/useAuthUser"
import { Toaster } from "react-hot-toast"
import ImageModal from "./components/ui/ImageModal"
import ProfileImageModal from "./components/ui/ProfileImageModal"
import { useAppStore } from "./store/appStore"

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

  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        {/* <LoadingSpinner size="lg" /> */}
      </div>
    )
  }

  const isMessagePage = location.pathname.includes("/messages")
  const isPublicChatPage = location.pathname.includes("/public-chat")

  return (
    <div className="mx-auto flex min-h-screen flex-col md:max-w-[1240px] md:flex-row">
      {authUser && <Sidebar onOpenCreatePostModal={() => setShowCreatePostModal(true)} />}

      <main
        className={`${
          isPublicChatPage ? "flex h-screen max-h-screen flex-col md:flex-1" : "flex-1 md:pb-0"
        }`}
      >
        {" "}
        <Suspense
          fallback={<div className="flex h-screen flex-grow items-center justify-center"></div>}
        >
          <Routes>
            <Route path="/" element={authUser ? <HomePage /> : <Navigate to="/login" />} />
            <Route path="/signup" element={!authUser ? <SignupPage /> : <Navigate to="/" />} />
            <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to="/" />} />
            <Route
              path="/notifications"
              element={authUser ? <NotificationPage /> : <Navigate to="/login" />}
            />
            <Route
              path="/profile/:username"
              element={
                authUser ? (
                  <ProfilePage feedType={feedType} setFeedType={setFeedType} />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            <Route
              path="/messages"
              element={authUser ? <MessagesPage /> : <Navigate to="/login" />}
            />
            <Route
              path="/messages/:conversationId"
              element={authUser ? <MessagesPage /> : <Navigate to="/login" />}
            />
            <Route
              path="/public-chat"
              element={authUser ? <PublicChatPage /> : <Navigate to="/login" />}
            />
            <Route
              path="/bookmarks"
              element={authUser ? <BookmarksPage /> : <Navigate to="/login" />}
            />
            <Route path="/themes" element={authUser ? <ThemesPage /> : <Navigate to="/login" />} />
            <Route
              path="/:username/post/:pid"
              element={authUser ? <PostPage /> : <Navigate to="/login" />}
            />
            <Route path="/search" element={authUser ? <SearchPage /> : <Navigate to="/login" />} />
          </Routes>
        </Suspense>
      </main>

      {authUser && !isMessagePage && !isPublicChatPage && (
        <RightPanel className="hidden md:block" />
      )}
      <Toaster position="bottom-center" />
      <ImageModal src={selectedImage} onClose={closeImageModal} />
      <ProfileImageModal src={selectedProfileImage} onClose={closeProfileImageModal} />
      {showCreatePostModal && <CreatePostModal onClose={() => setShowCreatePostModal(false)} />}
    </div>
  )
}

export default App
