import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import HomePage from "./pages/home/HomePage";
import LoginPage from "./pages/auth/login/LoginPage";
import SignupPage from "./pages/auth/signup/SignupPage";
import Sidebar from "./components/common/Sidebar";
import RightPanel from "./components/common/RightPanel";
import ProfilePage from "./pages/profile/ProfilePage";
import NotificationPage from "./pages/notification/NotifcationPage";
import { Toaster } from "react-hot-toast";
import LoadingSpinner from "./components/common/LoadingSpinner";
import { useAuthUser } from "./hooks/authHooks/useAuthUser";
import MessagesPage from "./pages/message/MessagePage";
import PostPage from "./pages/post/PostPage";
import SearchPage from "./pages/search/SearchPage";

function App() {
  const { authUser, isLoading } = useAuthUser();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="h-screen flex justify-center items-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const isMessagePage = location.pathname.includes("/messages");

  return (
    <div className="flex max-w-7xl mx-auto">
      {authUser && <Sidebar />}
      <Routes>
        <Route path="/" element={authUser ? <HomePage /> : <Navigate to="/login" />} />
        <Route
          path="/signup"
          element={!authUser ? <SignupPage /> : <Navigate to="/" />}
        />
        <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to="/" />} />
        <Route
          path="/notifications"
          element={authUser ? <NotificationPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/profile/:username"
          element={authUser ? <ProfilePage /> : <Navigate to="/login" />}
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
          path="/:username/post/:pid"
          element={authUser ? <PostPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/search"
          element={authUser ? <SearchPage /> : <Navigate to="/login" />}
        />
      </Routes>
      {authUser && !isMessagePage && <RightPanel />}
      <Toaster />
    </div>
  );
}

export default App;
