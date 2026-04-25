import { useState, useRef, useCallback, useEffect } from "react"
import { FaArrowLeft, FaPlus } from "react-icons/fa6"
import { useNavigate, useParams } from "react-router-dom"
import { useAuthUser } from "../features/auth/authHooks/useAuthUser"
import { useGetBoardPosts } from "../features/board/boardHooks/boardQueries"
import LoadingSpinner from "../components/common/LoadingSpinner"
import BoardPostCard from "../features/board/components/BoardPostCard"
import BoardPostDetail from "../features/board/components/BoardPostDetail"
import CreateBoardPostModal from "../features/board/components/CreateBoardPostModal"
import { useIsMobile } from "../hooks/customHooks/useIsMobile"
import { useBoardStore } from "../store/useBoardStore"
import { useSocket } from "../context/SocketContext"
import { shouldTextBeWhite } from "../utils/shouldTextBeWhite"
import { useTheme } from "../context/ThemeContext"

const BoardPage = () => {
  const navigate = useNavigate()
  const { postId: urlPostId } = useParams() // read from URL
  const [selectedPostId, setSelectedPostId] = useState(urlPostId || null)
  const { authUser } = useAuthUser()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const isMobile = useIsMobile()
  const observerTarget = useRef(null)
  const { setShowNewBoardPostsButton, setNewBoardPostCount } = useSocket()

  const { theme } = useTheme()

  useEffect(() => {
    setShowNewBoardPostsButton(false)
    setNewBoardPostCount(0) // ADD — clear the number badge too, not just the button
    fetch("/api/board/mark-as-read", { method: "POST", credentials: "include" }).catch((err) =>
      console.error("Failed to mark board as read:", err),
    )
  }, [setShowNewBoardPostsButton, setNewBoardPostCount])

  const [leftWidth, setLeftWidth] = useState(400)
  const [isResizing, setIsResizing] = useState(false)
  const containerRef = useRef(null) // Attach to the flex container

  const setIsEditingPostInline = useBoardStore((s) => s.setIsEditingPostInline)
  const setReplyingToComment = useBoardStore((s) => s.setReplyingToComment)

  const startResizing = useCallback((e) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  const stopResizing = useCallback(() => {
    setIsResizing(false)
  }, [])

  const resize = useCallback((e) => {
    if (!containerRef.current) return
    const containerRect = containerRef.current.getBoundingClientRect()
    const newWidth = e.clientX - containerRect.left

    // 280 is a good minimum for the sidebar
    // 800 (or higher) allows the sidebar to take up most of the screen
    if (newWidth > 280 && newWidth < 900) {
      setLeftWidth(newWidth)
    }
  }, [])

  useEffect(() => {
    if (!isResizing) return // guard here instead

    const handleMouseMove = (e) => resize(e)
    const handleMouseUp = () => stopResizing()

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isResizing, resize, stopResizing])

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
    setIsEditingPostInline(false)
    setReplyingToComment(false)
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
    <div className="template mx-auto flex-1 border-r border-accent md:max-w-[1181px]">
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
            className={`flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold ${shouldTextBeWhite(theme)} transition hover:bg-primary/80`}
          >
            <FaPlus size={14} />
            New Post
          </button>
        )}
      </div>

      {/* Two-panel layout */}
      <div
        ref={containerRef} // <--- ADD THIS
        className={`flex h-[calc(100vh-61px)] overflow-hidden ${isResizing ? "cursor-col-resize select-none" : ""}`}
      >
        {" "}
        {/* Left: post list */}
        {showPostList && (
          <div
            style={{ width: isMobile ? "100%" : `${leftWidth}px` }}
            className="flex flex-col overflow-y-auto border-r border-accent bg-base-100 pb-32 transition-colors md:pb-0"
          >
            {/* GRID WRAPPER ADDED HERE */}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3 p-3">
              {isLoading ? (
                <div className="col-span-full flex items-center justify-center p-8">
                  <LoadingSpinner size="lg" />
                </div>
              ) : posts.length === 0 ? (
                <p className="col-span-full mt-12 text-center text-gray-500">No posts yet.</p>
              ) : (
                posts.map((post, i) => (
                  <div
                    key={post._id}
                    ref={i === posts.length - 1 ? lastPostRef : null}
                    className="h-full" // Ensure card fills grid height
                  >
                    <BoardPostCard
                      post={post}
                      isSelected={selectedPostId === post._id}
                      onClick={() => handleSelectPost(post._id)}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        {!isMobile && showPostList && showPostDetail && (
          <div
            onMouseDown={startResizing}
            className={`group relative w-1 flex-shrink-0 cursor-col-resize border-r border-accent transition-colors ${
              isResizing ? "bg-primary" : "hover:bg-primary/50"
            }`}
          >
            <div className="absolute inset-y-0 -left-1 -right-1 z-20" />
          </div>
        )}
        {/* Right: post detail */}
        {showPostDetail && (
          <div className="flex w-full min-w-[330px] flex-col overflow-hidden md:min-w-[380px] md:flex-1">
            {isLoading && urlPostId ? (
              <div></div>
            ) : selectedPostId ? (
              <BoardPostDetail postId={selectedPostId} onClose={handleClose} />
            ) : (
              <p className="flex w-full flex-col items-center justify-center text-gray-500 md:flex-1">
                Select a post to read
              </p>
            )}
          </div>
        )}
      </div>

      {showCreateModal && <CreateBoardPostModal onClose={() => setShowCreateModal(false)} />}
    </div>
  )
}

export default BoardPage
