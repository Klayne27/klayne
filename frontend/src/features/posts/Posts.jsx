import Post from "./Post"
import PostSkeleton from "../../components/skeletons/PostSkeleton"
import { useEffect, useRef, useCallback } from "react"
import { useGetPosts } from "./postsHooks/useGetPosts"
import { useCombinedPosts } from "../../hooks/customHooks/useCombinedPosts"
import { TbGhost2 } from "react-icons/tb"
import { useAppStore } from "../../store/useAppStore"

const Posts = ({ feedType, username, onPostsFetched, pinnedPosts = [], isLoadingPinnedPosts }) => {
  const {
    posts,
    isLoading,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isError,
    error,
    totalPostsCount,
    totalLikedPostsCount,
    message,
  } = useGetPosts({ feedType, username })

  const { combinedPosts, filteredPostsForRender } = useCombinedPosts({
    posts,
    feedType,
    pinnedPosts,
  })

  const observer = useRef()
  const lastPostElementRef = useCallback(
    (node) => {
      if (isLoading || isFetchingNextPage) return
      if (observer.current) observer.current.disconnect()

      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasNextPage) {
            fetchNextPage()
          }
        },
        {
          rootMargin: "0px",
          threshold: 0.1,
        },
      )

      if (node) observer.current.observe(node)
    },
    [isLoading, isFetchingNextPage, hasNextPage, fetchNextPage],
  )

  useEffect(() => {
    if (!isLoading && !isRefetching && posts !== undefined && onPostsFetched) {
      const combinedCount =
        feedType === "likes"
          ? totalLikedPostsCount
          : (totalPostsCount || 0) + (pinnedPosts?.length || 0)
      onPostsFetched(combinedCount)
    }
  }, [
    posts,
    isLoading,
    isRefetching,
    onPostsFetched,
    feedType,
    totalPostsCount,
    totalLikedPostsCount,
    pinnedPosts?.length,
  ])

  // Display the specific message if it exists
  if (message && combinedPosts?.length === 0) {
    return <p className="my-4 text-center text-gray-500">{message}</p>
  }

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center">
        <PostSkeleton />
        <PostSkeleton />
        <PostSkeleton />
      </div>
    )
  }

  if (isError) {
    return (
      <p className="my-4 text-center text-red-500">
        Error: {error?.message || "Failed to load posts."}
      </p>
    )
  }

  if (combinedPosts?.length === 0) {
    return (
      <p className="my-4 flex items-center justify-center gap-1 text-center">
        No posts in this tab. Switch <TbGhost2 />
      </p>
    )
  }

  return (
    <div>
      {feedType === "posts" && (
        <div>
          {isLoadingPinnedPosts ? (
            <div></div>
          ) : (
            pinnedPosts.length > 0 && (
              <div>
                {pinnedPosts.map((post) => (
                  <Post
                    key={post._id}
                    post={post}
                    profilePinnedPosts={pinnedPosts}
                    currentProfileUsername={username}
                  />
                ))}
              </div>
            )
          )}
        </div>
      )}

      {filteredPostsForRender.map((post, index) => {
        const elementRef = filteredPostsForRender.length === index + 1 ? lastPostElementRef : null

        return (
          <div
            ref={elementRef}
            key={post._id}
            style={{
              contentVisibility: "auto",
              containIntrinsicSize: "150px",
            }}
          >
            <Post post={post} profilePinnedPosts={pinnedPosts} currentProfileUsername={username} />
          </div>
        )
      })}

      {isFetchingNextPage && (
        <div className="flex flex-col justify-center">
          <PostSkeleton />
        </div>
      )}
      {!hasNextPage && filteredPostsForRender.length > 0 && !isFetchingNextPage && (
        <p className="my-12 text-center text-gray-500">You've reached the end!</p>
      )}
    </div>
  )
}

export default Posts
