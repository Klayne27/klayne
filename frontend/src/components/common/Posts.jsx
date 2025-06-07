import Post from "./Post";
import PostSkeleton from "../skeletons/PostSkeleton";
import { useEffect } from "react";
import { useFetchPosts } from "../../hooks/postsHooks/useFetchPosts";

const Posts = ({ feedType, username, userId, onPostsFetched }) => {
  const getPostEndpoint = () => {
    switch (feedType) {
      case "forYou":
        return "/api/posts/all";
      case "following":
        return "api/posts/following";
      case "posts":
        return `/api/posts/user/${username}`;
      case "likes":
        return `/api/posts/likes/${userId}`;
      default:
        return "/api/posts/all";
    }
  };

  const POST_ENDPOINT = getPostEndpoint();

  const { posts, isLoading, refetch, isRefetching } = useFetchPosts(POST_ENDPOINT);

  useEffect(() => {
    refetch();
  }, [feedType, refetch, username]);

  // Use another useEffect to call the callback when posts data changes
  useEffect(() => {
    // Only call the callback if posts is not loading and not refetching, and is available
    if (!isLoading && !isRefetching && posts !== undefined) {
      // Ensure onPostsFetched exists before calling it
      onPostsFetched?.(posts);
    }
  }, [posts, isLoading, isRefetching, onPostsFetched, feedType]); // Add feedType to dependencies if you want to update count specifically for "posts" tab

  return (
    <>
      {isLoading ||
        (isRefetching && (
          <div className="flex flex-col justify-center">
            <PostSkeleton />
            <PostSkeleton />
            <PostSkeleton />
          </div>
        ))}
      {!isLoading && !isRefetching && posts?.length === 0 && (
        <p className="text-center my-4">No posts in this tab. Switch 👻</p>
      )}
      {!isLoading && !isRefetching && posts && (
        <div>
          {posts.map((post) => (
            <Post key={post._id} post={post} />
          ))}
        </div>
      )}
    </>
  );
};
export default Posts;
