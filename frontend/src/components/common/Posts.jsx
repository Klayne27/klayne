import Post from "./Post";
import PostSkeleton from "../skeletons/PostSkeleton";
import { useEffect, useRef, useCallback } from "react";
import { useFetchPosts } from "../../hooks/postsHooks/useFetchPosts";

const Posts = ({
  feedType,
  username,
  userId,
  onPostsFetched,
  openImageModal,
  onLikedPostsFetched,
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
    if (POST_ENDPOINT) {
      refetch();
    }
  }, [feedType, refetch, username, userId, POST_ENDPOINT]);

  useEffect(() => {

    if (
      (!isLoading && !isRefetching && posts !== undefined && onPostsFetched) 
    ) {
      onPostsFetched(totalPostsCount || totalLikedPostsCount);
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

  if (posts?.length === 0) {
    return <p className="text-center my-4">No posts in this tab. Switch 👻</p>;
  }

  return (
    <div>
      {posts.map((post, index) => {
        const elementRef = posts.length === index + 1 ? lastPostElementRef : null;
        return (
          <div ref={elementRef} key={post._id}>
            <Post post={post} openImageModal={openImageModal} />
          </div>
        );
      })}

      {isFetchingNextPage && (
        <div className="flex flex-col justify-center">
          <PostSkeleton />
        </div>
      )}
      {!hasNextPage && posts.length > 0 && !isFetchingNextPage && (
        <p className="text-center text-gray-500 my-4">You've reached the end!</p>
      )}
    </div>
  );
};

export default Posts;
