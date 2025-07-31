import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Suspense, lazy, useState } from "react";
import Sidebar from "./components/common/Sidebar";
import RightPanel from "./components/common/RightPanel";
import { useAuthUser } from "./hooks/authHooks/useAuthUser";
import { Toaster } from "react-hot-toast";
import ImageModal from "./components/common/ImageModal";
import ProfileImageModal from "./components/common/ProfileImageModal";
import { useAppStore } from "./store/appStore";

const CreatePostModal = lazy(() => import("./components/common/CreatePostModal"));
const PublicChatPage = lazy(() => import("./pages/publicChat/PublicChatPage"));
const BookmarksPage = lazy(() => import("./pages/bookmarks/BookmarksPage"));
const ThemesPage = lazy(() => import("./pages/themes/ThemesPage"));
const HomePage = lazy(() => import("./pages/home/HomePage"));
const LoginPage = lazy(() => import("./pages/auth/login/LoginPage"));
const SignupPage = lazy(() => import("./pages/auth/signup/SignupPage"));
const ProfilePage = lazy(() => import("./pages/profile/ProfilePage"));
const NotificationPage = lazy(() => import("./pages/notification/NotifcationPage"));
const MessagesPage = lazy(() => import("./pages/message/MessagePage"));
const PostPage = lazy(() => import("./pages/post/PostPage"));
const SearchPage = lazy(() => import("./pages/search/SearchPage"));

function App() {
  const { authUser, isLoading } = useAuthUser();
  const selectedProfileImage = useAppStore((state) => state.selectedProfileImage);
  const closeProfileImageModal = useAppStore((state) => state.closeProfileImageModal);
  const selectedImage = useAppStore((state) => state.selectedImage);
  const closeImageModal = useAppStore((state) => state.closeImageModal);
  const showCreatePostModal = useAppStore((state) => state.showCreatePostModal);
  const setShowCreatePostModal = useAppStore((state) => state.setShowCreatePostModal);
  const [feedType, setFeedType] = useState("posts");

  const location = useLocation();

  if (isLoading) {
    return (
      <div className="h-screen flex justify-center items-center">
        {/* <LoadingSpinner size="lg" /> */}
      </div>
    );
  }

  const isMessagePage = location.pathname.includes("/messages");
  const isPublicChatPage = location.pathname.includes("/public-chat");

  return (
    <div className="flex flex-col md:flex-row md:max-w-[1240px] mx-auto min-h-screen">
      {authUser && <Sidebar onOpenCreatePostModal={() => setShowCreatePostModal(true)} />}

      <main
        className={`${
          isPublicChatPage
            ? "flex flex-col h-screen max-h-screen md:flex-1"
            : "flex-1 md:pb-0"
        }`}
      >
        {" "}
        <Suspense
          fallback={
            <div className="flex-grow flex justify-center items-center h-screen"></div>
          }
        >
          <Routes>
            <Route
              path="/"
              element={authUser ? <HomePage /> : <Navigate to="/login" />}
            />
            <Route
              path="/signup"
              element={!authUser ? <SignupPage /> : <Navigate to="/" />}
            />
            <Route
              path="/login"
              element={!authUser ? <LoginPage /> : <Navigate to="/" />}
            />
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
            <Route
              path="/themes"
              element={authUser ? <ThemesPage /> : <Navigate to="/login" />}
            />
            <Route
              path="/:username/post/:pid"
              element={authUser ? <PostPage /> : <Navigate to="/login" />}
            />
            <Route
              path="/search"
              element={authUser ? <SearchPage /> : <Navigate to="/login" />}
            />
          </Routes>
        </Suspense>
      </main>

      {authUser && !isMessagePage && !isPublicChatPage && (
        <RightPanel className="hidden md:block" />
      )}
      <Toaster position="bottom-center" />
      <ImageModal src={selectedImage} onClose={closeImageModal} />
      <ProfileImageModal src={selectedProfileImage} onClose={closeProfileImageModal} />
      {showCreatePostModal && (
        <CreatePostModal onClose={() => setShowCreatePostModal(false)} />
      )}
    </div>
  );
}

export default App;
