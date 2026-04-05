import { useState, useRef, useCallback } from "react"
import { FaArrowLeft, FaPlus } from "react-icons/fa6"
import { useNavigate } from "react-router-dom"
import { useAuthUser } from "../features/auth/authHooks/useAuthUser"
import { useGetBoardPosts } from "../features/board/boardHooks/boardQueries"
import LoadingSpinner from "../components/common/LoadingSpinner"
import BoardPostCard from "../features/board/components/BoardPostCard"
import BoardPostDetail from "../features/board/components/BoardPostDetail"
import CreateBoardPostModal from "../features/board/components/CreateBoardPostModal"

const BoardPage = () => {
  const navigate = useNavigate()
  const { authUser } = useAuthUser()
  const [selectedPostId, setSelectedPostId] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const observerTarget = useRef(null)

  const { posts, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useGetBoardPosts()

  const lastPostRef = useCallback(
    (node) => {
      if (isFetchingNextPage) return
      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage) fetchNextPage()
      })
      if (node) observer.observe(node)
    },
    [isFetchingNextPage, hasNextPage, fetchNextPage],
  )

  return (
    <div className="template mx-auto min-h-screen w-full flex-1 border-accent border-r md:max-w-7xl">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-accent bg-base-100 bg-opacity-80 px-4 py-3 backdrop-blur-md">
        <button
          onClick={() => navigate(-1)}
          className="flex-shrink-0 rounded-full p-2 transition duration-200 hover:bg-gray-800"
        >
          <FaArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="flex-1 text-xl font-bold">Board</h1>
        {authUser && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-primary/80"
          >
            <FaPlus size={14} />
            New Post
          </button>
        )}
      </div>

      {/* Two-panel layout */}
      <div className="flex h-[calc(100vh-57px)]">
        {/* Left: post list */}
        <div
          className={`flex flex-col gap-0 overflow-y-auto border-r border-accent ${
            selectedPostId ? "hidden w-0 md:flex md:w-2/5 lg:w-1/3" : "w-full md:w-2/5 lg:w-1/3"
          }`}
        >
          {isLoading ? (
            <div className="flex flex-1 items-center justify-center p-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : posts.length === 0 ? (
            <p className="mt-12 text-center text-gray-500">No posts yet. Be the first!</p>
          ) : (
            posts.map((post, i) => (
              <div key={post._id} ref={i === posts.length - 1 ? lastPostRef : null}>
                <BoardPostCard
                  post={post}
                  isSelected={selectedPostId === post._id}
                  onClick={() => setSelectedPostId(post._id)}
                />
              </div>
            ))
          )}
          {isFetchingNextPage && (
            <div className="flex justify-center py-4">
              <LoadingSpinner size="sm" />
            </div>
          )}
        </div>

        {/* Right: post detail */}
        <div
          className={`flex-1 overflow-y-auto ${!selectedPostId && "hidden md:flex md:items-center md:justify-center"}`}
        >
          {selectedPostId ? (
            <BoardPostDetail postId={selectedPostId} onClose={() => setSelectedPostId(null)} />
          ) : (
            <p className="text-gray-500">Select a post to read</p>
          )}
        </div>
      </div>

      {showCreateModal && <CreateBoardPostModal onClose={() => setShowCreateModal(false)} />}
    </div>
  )
}

export default BoardPage
