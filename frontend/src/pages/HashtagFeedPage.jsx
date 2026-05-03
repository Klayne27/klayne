import { useParams, useNavigate } from "react-router-dom"
import { useCallback, useRef } from "react"
import { FaArrowLeft, FaHashtag } from "react-icons/fa"
import LoadingSpinner from "../components/common/LoadingSpinner"
import { useGetHashtagPosts } from "../features/hashtag/useHashtagQueries"
import Post from "../features/posts/components/Post"

const HashtagFeedPage = () => {
  const { tag } = useParams()
  const navigate = useNavigate()

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error } =
    useGetHashtagPosts(tag)

  const posts = data?.pages.flatMap((p) => p.posts) ?? []

  // Infinite scroll sentinel
  const observerRef = useRef()
  const lastPostRef = useCallback(
    (node) => {
      if (isFetchingNextPage) return
      if (observerRef.current) observerRef.current.disconnect()
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage) fetchNextPage()
      })
      if (node) observerRef.current.observe(node)
    },
    [isFetchingNextPage, hasNextPage, fetchNextPage],
  )

  return (
    <div className="template min-h-screen flex-1 border-accent">
      {/* Header */}
      <div className="sticky top-0 z-10 mb-4 flex items-center gap-3 border-b border-accent bg-base-100/80 px-4 py-3 backdrop-blur-md">
        <button
          onClick={() => navigate(-1)}
          className="rounded-full p-2 transition hover:bg-secondary"
        >
          <FaArrowLeft size={16} />
        </button>
        <div className="flex flex-col">
          <div className="flex items-center gap-1 text-xl font-bold">
            <FaHashtag size={18} />
            {tag}
          </div>
          <span className="text-xs text-slate-500">
            {posts.length} post{posts.length > 1 ? "s" : ""}
          </span>
        </div>
      </div>
      {!isLoading && (
        <div className="mb-4">
          <span className="px-4 text-xl font-bold">
            {posts.length > 0 ? `${data?.pages[0] ? "" : ""}Posts tagged #${tag}` : "No posts yet"}
          </span>
        </div>
      )}

      {/* Feed */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : error ? (
        <p className="mt-12 text-center text-red-500">Failed to load posts.</p>
      ) : posts.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-slate-400">
          <FaHashtag size={40} className="opacity-30" />
          <p className="text-lg font-semibold">No posts for #{tag} yet</p>
          <p className="text-sm">Be the first to use this tag!</p>
        </div>
      ) : (
        <div>
          {posts.map((post, i) => (
            <div key={post._id} ref={i === posts.length - 1 ? lastPostRef : null}>
              <Post post={post} />
            </div>
          ))}
          {isFetchingNextPage && (
            <div className="flex justify-center py-4">
              <LoadingSpinner size="sm" />
            </div>
          )}
          {!hasNextPage && posts.length > 0 && (
            <p className="py-6 text-center text-sm text-slate-500">
              You&apos;ve seen all posts for #{tag}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default HashtagFeedPage
