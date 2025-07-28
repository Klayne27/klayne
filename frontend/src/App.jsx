import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Suspense, lazy, useState } from "react";
import Sidebar from "./components/common/Sidebar";
import RightPanel from "./components/common/RightPanel";
import { useAuthUser } from "./hooks/authHooks/useAuthUser";
import { Toaster } from "react-hot-toast";
import ImageModal from "./components/common/ImageModal";
import ProfileImageModal from "./components/common/ProfileImageModal";
// import CreatePostModal from "./components/common/CreatePostModal";

const CreatePostModal = lazy(() => import("./components/common/CreatePostModal"))
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

  const location = useLocation();
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedProfileImg, setSelectedProfileImg] = useState(null)
  const [feedType, setFeedType] = useState("posts");
  const [isChatWindowOpen, setIsChatWindowOpen] = useState(false);
  const [showUnfollowModal, setShowUnfollowModal] = useState(false); // New state for unfollow modal
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);

  const [isMobileMessagesListScrollingDown, setIsMobileMessagesListScrollingDown] =
    useState(false);

  const openImageModal = (imageUrl) => setSelectedImage(imageUrl);
  const openProfileImgModal = (imageUrl) => setSelectedProfileImg(imageUrl)
  const closeImageModal = () => setSelectedImage(null);
  const closeProfileImageModal = () => setSelectedProfileImg(null);

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
      {/* <div
        className="block md:hidden fixed bottom-[73px] right-5 z-[50] rounded-full cursor-pointer hover:bg-opacity-85 duration-200 transition p-4 bg-primary text-white"
        style={{
          width: "56px",
          height: "56px",
          boxShadow: "0px 0px 10px 1px rgba(255, 255, 255, 0.60)",
        }}
        onClick={() => setShowCreatePostModal(true)}
      >
        <FeatherIcon />
      </div> */}
      {authUser && (
        <Sidebar
          onOpenCreatePostModal={() => setShowCreatePostModal(true)}
          isChatWindowOpen={isChatWindowOpen}
          isMobileMessagesListScrollingDown={isMobileMessagesListScrollingDown} // Pass new prop
        />
      )}

      <main
        className={`${
          isPublicChatPage
            ? "flex flex-col h-screen max-h-screen md:flex-1"
            : "flex-1 md:pb-0"
        }`}
      >
        {" "}
        {/* Added pb-16 for mobile */}
        <Suspense
          fallback={
            <div className="flex-grow flex justify-center items-center h-screen">
              {/* <LoadingSpinner size="lg" /> */}
            </div>
          }
        >
          <Routes>
            <Route
              path="/"
              element={
                authUser ? (
                  <HomePage
                    openImageModal={openImageModal}
                    showUnfollowModal={showUnfollowModal}
                  />
                ) : (
                  <Navigate to="/login" />
                )
              }
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
                  <ProfilePage
                    openImageModal={openImageModal}
                    openProfileImgModal={openProfileImgModal}
                    feedType={feedType}
                    setFeedType={setFeedType}
                  />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            <Route
              path="/messages"
              element={
                authUser ? (
                  <MessagesPage
                    openImageModal={openImageModal}
                    setIsChatWindowOpen={setIsChatWindowOpen} // Pass setter to MessagesPage
                    isMobileMessagesListScrollingDown={isMobileMessagesListScrollingDown}
                    setIsMobileMessagesListScrollingDown={
                      setIsMobileMessagesListScrollingDown
                    }
                  />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            <Route
              path="/messages/:conversationId"
              element={
                authUser ? (
                  <MessagesPage
                    openImageModal={openImageModal}
                    setIsChatWindowOpen={setIsChatWindowOpen}
                    isMobileMessagesListScrollingDown={isMobileMessagesListScrollingDown}
                    setIsMobileMessagesListScrollingDown={
                      setIsMobileMessagesListScrollingDown
                    }
                  />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            <Route
              path="/public-chat"
              element={
                authUser ? (
                  <PublicChatPage openImageModal={openImageModal} />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            <Route
              path="/bookmarks"
              element={
                authUser ? (
                  <BookmarksPage openImageModal={openImageModal} />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            <Route
              path="/themes"
              element={
                authUser ? (
                  <ThemesPage openImageModal={openImageModal} />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            <Route
              path="/:username/post/:pid"
              element={
                authUser ? (
                  <PostPage openImageModal={openImageModal} setFeedType={setFeedType} />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            <Route
              path="/search"
              element={
                authUser ? (
                  <SearchPage
                    showUnfollowModal={showUnfollowModal}
                    setShowUnfollowModal={setShowUnfollowModal}
                  />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
          </Routes>
        </Suspense>
      </main>

      {/* RightPanel - Hidden on mobile */}
      {authUser && !isMessagePage && !isPublicChatPage && (
        <RightPanel
          showUnfollowModal={showUnfollowModal}
          setShowUnfollowModal={setShowUnfollowModal}
          className="hidden md:block"
        />
      )}
      <Toaster
        position="bottom-center" // Change position to top-center
      />
      <ImageModal src={selectedImage} onClose={closeImageModal} />
      <ProfileImageModal src={selectedProfileImg} onClose={closeProfileImageModal} />
      {showCreatePostModal && (
        <CreatePostModal onClose={() => setShowCreatePostModal(false)} />
      )}
    </div>
  );
}

export default App;
