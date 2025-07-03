import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { IoArrowBackOutline } from "react-icons/io5"; // Not used in current snippet, remove if not needed
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { useGetBookmarkedPosts } from "../../hooks/postsHooks/useGetBookmarkedPosts";
import { CiSearch } from "react-icons/ci";
import Post from "../../components/common/posts/Post";
import { FaArrowLeft } from "react-icons/fa";

const BookmarksPage = ({ openImageModal }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const { bookmarkedPosts, isLoadingBookmarkedPosts, bookmarkedPostsError } =
    useGetBookmarkedPosts(searchQuery);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Determine if the search query is active (i.e., not empty)
  const isSearchActive = searchQuery.trim().length > 0;

  // Determine if there are no posts after filtering/searching
  const noPostsFound =
    !isLoadingBookmarkedPosts && !bookmarkedPostsError && bookmarkedPosts?.length === 0;

  return (
    <>
      <div className="flex-[4_4_0] border-r border-gray-700 min-h-screen">
        <div className="flex items-center gap-4 px-4 py-3.5 border-gray-700">
          <button
            onClick={() => navigate(-1)}
            className="hover:bg-gray-800 rounded-full p-2.5 transition duration-200 flex-shrink-0"
          >
            <FaArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-bold text-xl flex-1 truncate">Bookmarks</h1>
        </div>

        <div className="p-4 border-gray-700">
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

        {/* Loading Spinner */}
        {isLoadingBookmarkedPosts && (
          <div className="flex justify-center h-full items-center">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {/* Error Message */}
        {!isLoadingBookmarkedPosts && bookmarkedPostsError && (
          <div className="text-center p-4 text-red-500">
            <p className="text-xl font-bold">Error loading bookmarks</p>
            <p>{bookmarkedPostsError.message}</p>
            <p className="text-gray-500">Please try again later.</p>
          </div>
        )}

        {/* Conditional messages based on search status */}
        {noPostsFound && !isSearchActive && (
          // Case 1: No search query, and no posts found (genuinely empty bookmarks)
          <div className="text-center p-4">
            <p className="text-xl font-bold">No Bookmarked Posts Yet</p>
            <p className="text-gray-500">Bookmark posts to see them here.</p>
          </div>
        )}

        {noPostsFound && isSearchActive && (
          // Case 2: Search query active, but no matching posts found
          <div className="text-center p-4">
            <p className="text-xl font-bold">No matching bookmarks found</p>
            <p className="text-gray-500">
              Try a different keyword or check your spelling.
            </p>
          </div>
        )}

        {/* Display posts if loaded and no error and posts exist */}
        {!isLoadingBookmarkedPosts &&
          !bookmarkedPostsError &&
          bookmarkedPosts &&
          bookmarkedPosts.length > 0 && (
            <div>
              {bookmarkedPosts.map((post) => (
                <Post key={post._id} post={post} openImageModal={openImageModal} />
              ))}
            </div>
          )}
      </div>
    </>
  );
};

export default BookmarksPage;
