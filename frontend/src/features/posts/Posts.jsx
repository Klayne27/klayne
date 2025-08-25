// src/components/common/posts/Posts.jsx
import Post from "./Post"
import PostSkeleton from "../../components/skeletons/PostSkeleton"
import { useEffect, useRef, useCallback } from "react"
import { useFetchPosts } from "./postsHooks/useFetchPosts"
import { useCombinedPosts } from "../../hooks/customHooks/useCombinedPosts"

const Posts = ({
  feedType,
  username,
  userId: profileOwnerId,
  onPostsFetched,
  pinnedPosts = [],
  isLoadingPinnedPosts,
}) => {
  const {
    posts,
    isLoading,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isError,
    error,
    totalPostsCount,
    totalLikedPostsCount,
    getPostEndpoint,
  } = useFetchPosts({ feedType, username })

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
        feedType === "posts"
          ? (totalPostsCount || 0) + (pinnedPosts?.length || 0)
          : totalLikedPostsCount
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
    return <p className="my-4 text-center">No posts in this tab. Switch 👻</p>
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
          <div ref={elementRef} key={post._id}>
            <Post
              post={post}
              profilePinnedPosts={pinnedPosts}
              currentProfileUsername={username}
            />
          </div>
        )
      })}

      {isFetchingNextPage && (
        <div className="flex flex-col justify-center">
          <PostSkeleton />
        </div>
      )}
      {!hasNextPage && filteredPostsForRender.length > 0 && !isFetchingNextPage && (
        <p className="my-4 text-center text-gray-500">You've reached the end!</p>
      )}
    </div>
  )
}

export default Posts
