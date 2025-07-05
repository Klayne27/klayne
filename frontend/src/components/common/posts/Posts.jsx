import Post from "./Post";
import PostSkeleton from "../../skeletons/PostSkeleton";
import { useEffect, useRef, useCallback } from "react";
import { useFetchPosts } from "../../../hooks/postsHooks/useFetchPosts";

const Posts = ({
  feedType,
  username,
  userId,
  onPostsFetched,
  openImageModal,
  onLikedPostsFetched,
  pinnedPosts = [],
  isLoadingPinnedPosts,
}) => {
  const getPostEndpoint = () => {
    switch (feedType) {
      case "forYou":
        return "/api/posts/all";
      case "following":
        return "/api/posts/following";
      case "posts":
        return `/api/posts/user/${username}`;
      case "likes":
        return `/api/posts/likes/${userId}`;
      default:
        return "/api/posts/all";
    }
  };

  const POST_ENDPOINT = getPostEndpoint();

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
  } = useFetchPosts(POST_ENDPOINT);

  const observer = useRef();
  const lastPostElementRef = useCallback(
    (node) => {
      if (isLoading || isFetchingNextPage) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasNextPage) {
            fetchNextPage();
          }
        },
        {
          rootMargin: "0px",
          threshold: 0.1,
        }
      );

      if (node) observer.current.observe(node);
    },
    [isLoading, isFetchingNextPage, hasNextPage, fetchNextPage]
  );

  useEffect(() => {
    if (!isLoading && !isRefetching && posts !== undefined && onPostsFetched) {
      // Adjust total count for 'posts' feed to include pinned posts if they are distinct
      const combinedCount =
        feedType === "posts"
          ? (totalPostsCount || 0) + (pinnedPosts?.length || 0)
          : totalLikedPostsCount;
      onPostsFetched(combinedCount);
    }
  }, [
    posts,
    isLoading,
    isRefetching,
    onPostsFetched,
    feedType,
    totalPostsCount,
    totalLikedPostsCount,
    onLikedPostsFetched,
    pinnedPosts?.length, // Add pinnedPosts length as a dependency
  ]);

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center">
        <PostSkeleton />
        <PostSkeleton />
        <PostSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-center my-4 text-red-500">
        Error: {error?.message || "Failed to load posts."}
      </p>
    );
  }

  // Filter out pinned posts from the main `posts` array to avoid duplicates
  const filteredPosts =
    feedType === "posts"
      ? posts.filter((post) => !pinnedPosts.some((pinned) => pinned._id === post._id))
      : posts;

  // Combine pinned posts with filtered posts for the 'posts' feed type
  const combinedPosts = feedType === "posts" ? [...pinnedPosts, ...filteredPosts] : posts;

  if (combinedPosts?.length === 0) {
    return <p className="text-center my-4">No posts in this tab. Switch 👻</p>;
  }

  return (
    <div>
      {/* Render Pinned Posts section for 'posts' feed type */}
      {feedType === "posts" && (
        <div>
          {isLoadingPinnedPosts ? (
            <div className="flex justify-center items-center h-20">
              Loading Pinned Posts...
            </div>
          ) : (
            pinnedPosts.length > 0 && (
              <div>
                {pinnedPosts.map((post) => (
                  <Post
                    key={post._id}
                    post={post}
                    openImageModal={openImageModal}
                    profilePinnedPosts={pinnedPosts}
                  />
                ))}
              </div>
            )
          )}
        </div>
      )}

      {/* Render regular posts */}
      {filteredPosts.map((post, index) => {
        const elementRef = filteredPosts.length === index + 1 ? lastPostElementRef : null; // Only apply ref to the last *filtered* post
        return (
          <div ref={elementRef} key={post._id}>
            <Post
              post={post}
              openImageModal={openImageModal}
              profilePinnedPosts={pinnedPosts} // Also pass to regular posts in case they are also pinned
            />
          </div>
        );
      })}

      {isFetchingNextPage && (
        <div className="flex flex-col justify-center">
          <PostSkeleton />
        </div>
      )}
      {!hasNextPage &&
        filteredPosts.length > 0 &&
        !isFetchingNextPage && ( // Check filteredPosts length
          <p className="text-center text-gray-500 my-4">You've reached the end!</p>
        )}
    </div>
  );
};

export default Posts;
