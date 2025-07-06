import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { useGetBookmarkedPosts } from "../../hooks/postsHooks/useGetBookmarkedPosts";
import { CiSearch } from "react-icons/ci";
import Post from "../../components/common/posts/Post";
import { FaArrowLeft } from "react-icons/fa";

const BookmarksPage = ({ openImageModal }) => {
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
      <div className="flex-[4_4_0] border-r border-gray-700 min-h-screen">
        <div className="flex items-center gap-4 px-4 py-3.5 border-gray-700 sticky top-0 z-10 bg-opacity-20 backdrop-blur-md">
          <button
            onClick={() => navigate(-1)}
            className="hover:bg-gray-800 rounded-full p-2.5 transition duration-200 flex-shrink-0"
          >
            <FaArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-bold text-xl flex-1 truncate">Bookmarks</h1>
        </div>

        <div className="p-4 border-gray-700 top-[60px] z-10 backdrop-blur-md bg-opacity-80">
          <div className="flex items-center gap-2  text-white rounded-full px-4 py-3 border border-gray-700 w-full">
            <CiSearch className="size-4 text-gray-400" />{" "}
            <input
              type="text"
              className="grow bg-transparent outline-none placeholder-gray-400 text-white"
              placeholder="Search Bookmarks"
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        {isLoadingBookmarkedPosts && bookmarkedPosts?.length === 0 && (
          <div className="flex justify-center h-full items-center">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {bookmarkedPostsError && (
          <div className="text-center p-4 text-red-500">
            <p className="text-xl font-bold">Error loading bookmarks</p>
            <p>{bookmarkedPostsError.message}</p>
            <p className="text-gray-500">Please try again later.</p>
          </div>
        )}

        {noPostsFound && !isSearchActive && (
          <div className="text-center p-4">
            <p className="text-xl font-bold">No Bookmarked Posts Yet</p>
            <p className="text-gray-500">Bookmark posts to see them here.</p>
          </div>
        )}

        {noPostsFound && isSearchActive && (
          <div className="text-center p-4">
            <p className="text-xl font-bold">No matching bookmarks found</p>
            <p className="text-gray-500">
              Try a different keyword or check your spelling.
            </p>
          </div>
        )}

        {bookmarkedPosts && bookmarkedPosts.length > 0 && (
          <div>
            {bookmarkedPosts.map((post) => (
              <Post key={post._id} post={post} openImageModal={openImageModal} />
            ))}
          </div>
        )}

        {hasNextPage && (
          <div ref={loadMoreRef} className="flex justify-center py-4">
            {isFetchingNextPage ? (
              <LoadingSpinner size="md" />
            ) : (
              <span className="text-gray-500">Loading more...</span>
            )}
          </div>
        )}

        {!hasNextPage && !isLoadingBookmarkedPosts && bookmarkedPosts?.length > 0 && (
          <div className="text-center py-4 text-gray-500">
            <p>You've reached the end of your bookmarks!</p>
          </div>
        )}
      </div>
    </>
  );
};

export default BookmarksPage;
