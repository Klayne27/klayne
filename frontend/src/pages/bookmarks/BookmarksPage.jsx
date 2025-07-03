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

  // --- Infinite Scroll Logic ---
  // Create a ref specifically for the "load more" sentinel element
  const loadMoreRef = useRef(null);

  const handleObserver = useCallback(
    (entries) => {
      const target = entries[0];
      // Only fetch more if the target is intersecting, there's a next page,
      // and we're not already fetching the next page.
      if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      root: null, // viewport
      rootMargin: "0px", // no margin
      threshold: 0.1, // trigger when 10% of the target is visible
    });

    // Observe the loadMoreRef if it exists
    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    // Cleanup observer on component unmount or when handleObserver/loadMoreRef changes
    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current);
      }
    };
  }, [handleObserver]); // Depend on handleObserver, which itself depends on fetchNextPage, hasNextPage, isFetchingNextPage
  // --- End Infinite Scroll Logic ---

  return (
    <>
      <div className="flex-[4_4_0] border-r border-gray-700 min-h-screen">
        {/* Header (sticky) */}
        <div className="flex items-center gap-4 px-4 py-3.5 border-gray-700 sticky top-0 z-10 bg-black backdrop-blur-md bg-opacity-80">
          <button
            onClick={() => navigate(-1)}
            className="hover:bg-gray-800 rounded-full p-2.5 transition duration-200 flex-shrink-0"
          >
            <FaArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-bold text-xl flex-1 truncate">Bookmarks</h1>
        </div>

        {/* Search Bar (sticky) */}
        <div className="p-4 border-gray-700 top-[60px] z-10 bg-black backdrop-blur-md bg-opacity-80">
          <div className="flex items-center gap-2 bg-black text-white rounded-full px-4 py-3 border border-gray-700 w-full">
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

        {/* Initial Loading Spinner (only shows if no posts loaded yet) */}
        {isLoadingBookmarkedPosts && bookmarkedPosts?.length === 0 && (
          <div className="flex justify-center h-full items-center">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {/* Error Message */}
        {bookmarkedPostsError && (
          <div className="text-center p-4 text-red-500">
            <p className="text-xl font-bold">Error loading bookmarks</p>
            <p>{bookmarkedPostsError.message}</p>
            <p className="text-gray-500">Please try again later.</p>
          </div>
        )}

        {/* Conditional messages for no posts / no search results */}
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

        {/* Display posts */}
        {bookmarkedPosts && bookmarkedPosts.length > 0 && (
          <div>
            {bookmarkedPosts.map((post) => (
              // No ref on individual posts
              <Post key={post._id} post={post} openImageModal={openImageModal} />
            ))}
          </div>
        )}

        {/* Loader/Sentinel for Infinite Scroll */}
        {hasNextPage && ( // Only render the loader/sentinel if there are more pages
          <div ref={loadMoreRef} className="flex justify-center py-4">
            {isFetchingNextPage ? (
              <LoadingSpinner size="md" /> // Show spinner when fetching next page
            ) : (
              // Optional: You can put a "Load more" button here too, for manual trigger
              // <button onClick={() => fetchNextPage()}>Load More</button>
              // Or just an empty div to trigger the observer
              <span className="text-gray-500">Loading more...</span>
            )}
          </div>
        )}

        {/* Message when no more pages and initial load is complete, and some posts exist */}
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
