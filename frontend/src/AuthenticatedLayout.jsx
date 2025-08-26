import {  useLocation, Route, Routes } from "react-router-dom"
import { lazy, useState, Suspense } from "react"
import Sidebar from "./components/common/Sidebar"
import RightPanel from "./components/common/RightPanel"
import { useAppStore } from "./store/useAppStore"
import ImageViewerPage from "./components/common/ImageViewerPage"
import CreatePostModal from "./features/posts/CreatePostModal"
import LoadingSpinner from "./components/ui/LoadingSpinner"

const PublicCompletedTodosPage = lazy(() => import("./pages/PublicCompletedTodosPage"))
const EditTodoListPage = lazy(() => import("./pages/EditTodoListPage"))
const CreateTodoListPage = lazy(() => import("./pages/CreateTodoListPage"))
const PomodoroSettingsPage = lazy(() => import("./pages/PomodoroSettingsPage"))
const TodoActivityLogPage = lazy(() => import("./pages/TodoActivityLogPage"))
const MyTodoListsPage = lazy(() => import("./pages/MyTodoListsPage"))
const FollowingListsPage = lazy(() => import("./pages/FollowingListsPage"))
const PublicListsPage = lazy(() => import("./pages/PublicListsPage"))
const CompletedTodosPage = lazy(() => import("./pages/CompletedTodosPage"))
const StudyActivityPage = lazy(() => import("./pages/StudyActivityPage"))
const StudyLeaderboardPage = lazy(() => import("./pages/StudyLeaderboardPage"))
const PomodoroPage = lazy(() => import("./pages/PomodoroPage"))
const PublicChatPage = lazy(() => import("./pages/PublicChatPage"))
const BookmarksPage = lazy(() => import("./pages/BookmarksPage"))
const ThemesPage = lazy(() => import("./pages/ThemesPage"))
const HomePage = lazy(() => import("./pages/HomePage"))
const ProfilePage = lazy(() => import("./pages/ProfilePage"))
const NotificationPage = lazy(() => import("./pages/NotifcationPage"))
const MessagesPage = lazy(() => import("./pages/MessagePage"))
const PostPage = lazy(() => import("./pages/PostPage"))
const SearchPage = lazy(() => import("./pages/SearchPage"))
const TodoPageLayout = lazy(() => import("./components/layout/TodoPageLayout"))

const AuthenticatedLayout = ({ deferredPrompt, isInstalled, installApp, isPushSubscribed }) => {
  const { pathname } = useLocation()
  const isMessagePage = pathname.includes("/messages")
  const isPublicChatPage = pathname.includes("/public-chat")
  const { showCreatePostModal, setShowCreatePostModal } = useAppStore()

  const [feedType, setFeedType] = useState("posts")

  const shouldHideSidePanels =
    pathname.includes("/study") || pathname.includes("/pomodoro") || pathname.includes("/todos")

  return (
    <>
      <div className="mx-auto flex min-h-screen flex-col bg-base-100 md:max-w-[1240px] md:flex-row">
        {!shouldHideSidePanels && (
          <Sidebar
            onOpenCreatePostModal={() => setShowCreatePostModal(true)}
            isPushSubscribed={isPushSubscribed}
            deferredPrompt={deferredPrompt}
            isInstalled={isInstalled}
            installApp={installApp}
          />
        )}
        <main
          className={`${
            isPublicChatPage
              ? "flex h-screen max-h-screen flex-col overflow-y-auto md:flex-1"
              : "flex-1 md:pb-0"
          }`}
        >
          <Suspense
            fallback={
              <div className="flex h-screen items-center justify-center">
                <LoadingSpinner size="lg" />
              </div>
            }
          >
            <Routes>
              <Route path="/images/:imageId" element={<ImageViewerPage />} />
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
              <Route path="/study-leaderboard" element={<StudyLeaderboardPage />} />
              <Route path="/study-settings" element={<PomodoroSettingsPage />} />
              <Route path="/todos" element={<TodoPageLayout />}>
                <Route index element={<MyTodoListsPage />} />
                <Route path="following" element={<FollowingListsPage />} />
                <Route path="public" element={<PublicListsPage />} />
                <Route path="completed" element={<CompletedTodosPage />} />
                <Route path="public-completed" element={<PublicCompletedTodosPage />} />
                <Route path="activity-log" element={<TodoActivityLogPage />} />
                <Route path="create-todo-section" element={<CreateTodoListPage />} />
                <Route path="edit-todo-section/:id" element={<EditTodoListPage />} />
              </Route>
            </Routes>
          </Suspense>
        </main>
        {!isMessagePage && !isPublicChatPage && !shouldHideSidePanels && (
          <RightPanel
            deferredPrompt={deferredPrompt}
            isInstalled={isInstalled}
            installApp={installApp}
            isPushSubscribed={isPushSubscribed}
            className="hidden md:block"
          />
        )}
      </div>

      {showCreatePostModal && <CreatePostModal onClose={() => setShowCreatePostModal(false)} />}
    </>
  )
}

export default AuthenticatedLayout
