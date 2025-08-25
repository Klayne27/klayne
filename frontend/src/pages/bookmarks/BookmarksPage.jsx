import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGetBookmarkedPosts } from "../../features/posts/postsHooks/useGetBookmarkedPosts";
import { CiSearch } from "react-icons/ci";
import Post from "../../features/posts/Post";
import { FaArrowLeft } from "react-icons/fa6";
import PostSkeleton from "../../components/skeletons/PostSkeleton";

const BookmarksPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const {
    bookmarkedPosts,
    isLoadingBookmarkedPosts,
    bookmarkedPostsError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetBookmarkedPosts(searchQuery);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const isSearchActive = searchQuery.trim().length > 0;
  const noPostsFound =
    !isLoadingBookmarkedPosts && !bookmarkedPostsError && bookmarkedPosts?.length === 0;

  const loadMoreRef = useRef(null);

  const handleObserver = useCallback(
    (entries) => {
      const target = entries[0];
      if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: "0px",
      threshold: 0.1,
    });

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current);
      }
    };
  }, [handleObserver]);

  return (
    <>
      <div className="flex-[4_4_0] border-accent min-h-screen">
        <div className="flex items-center gap-2 md:gap-4 px-3 md:px-4 py-2 md:py-3.5 border-accent sticky top-0 z-10 bg-opacity-20 backdrop-blur-md">
          <button
            onClick={() => navigate(-1)}
            className="hover:bg-gray-800 rounded-full p-2.5 transition duration-200 flex-shrink-0"
          >
            <FaArrowLeft />
          </button>
          <h1 className="font-bold text-xl flex-1 truncate">Bookmarks</h1>
        </div>

        <div className="py-1 px-3.5 border-accent top-[60px]">
          <div className="flex items-center gap-2 rounded-full px-3 py-2 border border-accent w-full">
            <CiSearch className="size-5 text-gray-400" />{" "}
            <input
              type="text"
              className="grow bg-transparent outline-none placeholder-gray-400"
              placeholder="Search Bookmarks"
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        {isLoadingBookmarkedPosts && bookmarkedPosts?.length === 0 && (
          <div className="flex flex-col justify-center h-full items-center">
            <PostSkeleton />
            <PostSkeleton />
            <PostSkeleton />
          </div>
        )}

        {bookmarkedPostsError && (
          <div className="text-center p-4 text-red-500">
            <p className="text-xl font-bold">Error loading bookmarks</p>
            <p>{bookmarkedPostsError.message}</p>
            <p className="text-slate-500">Please try again later.</p>
          </div>
        )}

        {noPostsFound && !isSearchActive && (
          <div className="text-center p-4">
            <p className="text-xl font-bold">No Bookmarked Posts Yet</p>
            <p className="text-slate-500">Bookmark posts to see them here.</p>
          </div>
        )}

        {noPostsFound && isSearchActive && (
          <div className="text-center p-4">
            <p className="text-xl font-bold">No matching bookmarks found</p>
            <p className="text-slate-500">
              Try a different keyword or check your spelling.
            </p>
          </div>
        )}

        {bookmarkedPosts && bookmarkedPosts.length > 0 && (
          <div>
            {bookmarkedPosts.map((post) => (
              <Post key={post._id} post={post} />
            ))}
          </div>
        )}

        {hasNextPage && (
          <div ref={loadMoreRef} className="flex justify-center py-4">
            {isFetchingNextPage ? (
              <PostSkeleton />
            ) : (
              <span className="text-slate-500">Loading more...</span>
            )}
          </div>
        )}

        {!hasNextPage && !isLoadingBookmarkedPosts && bookmarkedPosts?.length > 0 && (
          <div className="text-center py-4 text-slate-500">
            <p>You've reached the end of your bookmarks!</p>
          </div>
        )}
      </div>
    </>
  );
};

export default BookmarksPage;
