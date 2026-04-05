import { useState, useRef, useCallback } from "react"
import { FaArrowLeft, FaPlus } from "react-icons/fa6"
import { useNavigate, useParams } from "react-router-dom"
import { useAuthUser } from "../features/auth/authHooks/useAuthUser"
import { useGetBoardPosts } from "../features/board/boardHooks/boardQueries"
import LoadingSpinner from "../components/common/LoadingSpinner"
import BoardPostCard from "../features/board/components/BoardPostCard"
import BoardPostDetail from "../features/board/components/BoardPostDetail"
import CreateBoardPostModal from "../features/board/components/CreateBoardPostModal"
import { useIsMobile } from "../hooks/customHooks/useIsMobile"

const BoardPage = () => {
  const navigate = useNavigate()
  const { postId: urlPostId } = useParams() // read from URL
  const [selectedPostId, setSelectedPostId] = useState(urlPostId || null)
  const { authUser } = useAuthUser()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const isMobile = useIsMobile()
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

  const handleSelectPost = (id) => {
    setSelectedPostId(id)
    navigate(`/board/${id}`, { replace: true })
  }

  const handleClose = () => {
    setSelectedPostId(null)
    navigate("/board", { replace: true })
  }

  const handleNavigate = () => {
    if (urlPostId) {
      navigate("/board", { replace: true })
    } else {
      navigate(-1)
    }
  }

  // Define visibility logic (Identical pattern to ChatPage)
  const showPostList = !isMobile || !urlPostId
  const showPostDetail = !isMobile || !!urlPostId

  return (
    <div className="template mx-auto flex-1 border-r border-accent md:max-w-7xl">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-accent bg-base-100 bg-opacity-80 px-4 py-3 backdrop-blur-md">
        {isMobile && (
          <button
            onClick={handleNavigate}
            className="flex-shrink-0 rounded-full p-2 transition duration-200 hover:bg-gray-800"
          >
            <FaArrowLeft className="h-4 w-4" />
          </button>
        )}
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
      <div className="flex h-[calc(100vh-61px)]">
        {/* Left: post list */}
        {showPostList && (
          // <div className="flex h-screen w-full flex-col md:w-[430px] md:flex-shrink-0 md:border-r md:border-accent">

          <div
            className={`flex w-full flex-col gap-0 overflow-y-auto border-r border-accent md:w-2/5 lg:w-1/3`}
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
                    onClick={() => handleSelectPost(post._id)}
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
        )}

        {/* Right: post detail */}
        {showPostDetail && (
          <div className="flex w-full flex-col md:flex-1">
            {isLoading && urlPostId ? (
              <div></div>
            ) : selectedPostId ? (
              <BoardPostDetail postId={selectedPostId} onClose={handleClose} />
            ) : (
              <p className="flex w-full flex-col text-gray-500 md:flex-1 items-center justify-center">Select a post to read</p>
            )}
          </div>
        )}
      </div>

      {showCreateModal && <CreateBoardPostModal onClose={() => setShowCreateModal(false)} />}
    </div>
  )
}

export default BoardPage
