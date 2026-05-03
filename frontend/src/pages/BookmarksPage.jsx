import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { CiSearch } from "react-icons/ci"
import { FaArrowLeft } from "react-icons/fa6"
import PostSkeleton from "../components/skeletons/PostSkeleton"
import Post from "../features/posts/components/Post"
import { useInView } from "react-intersection-observer"
import { useGetBookmarkedPosts } from "../features/posts/postsHooks/usePostsQueries"

const BookmarksPage = () => {
  const navigate = useNavigate()
  const { ref: loadMoreRef, inView } = useInView()
  const [searchQuery, setSearchQuery] = useState("")
  const {
    bookmarkedPosts,
    isLoadingBookmarkedPosts,
    bookmarkedPostsError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetBookmarkedPosts(searchQuery)

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value)
  }

  const isSearchActive = searchQuery.trim().length > 0
  const noPostsFound =
    !isLoadingBookmarkedPosts && !bookmarkedPostsError && bookmarkedPosts?.length === 0

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  return (
    <>
      <div className="min-h-screen flex-[4_4_0] border-accent template md:border-r">
        <div className="sticky top-0 z-10 flex items-center gap-2 border-accent bg-opacity-20 px-3 py-2 backdrop-blur-md md:gap-4 md:px-4 md:py-3.5">
          <button
            onClick={() => navigate(-1)}
            className="flex-shrink-0 rounded-full p-2.5 transition duration-200 hover:bg-gray-800"
          >
            <FaArrowLeft />
          </button>
          <h1 className="flex-1 truncate text-xl font-bold">Bookmarks</h1>
        </div>

        <div className="top-[60px] border-accent px-3.5 py-1">
          <div className="flex w-full items-center gap-2 rounded-full border border-accent px-3 py-2">
            <CiSearch className="size-5 text-gray-400" />{" "}
            <input
              type="text"
              className="grow bg-transparent placeholder-gray-400 outline-none"
              placeholder="Search Bookmarks"
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        {isLoadingBookmarkedPosts && bookmarkedPosts?.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center">
            <PostSkeleton />
            <PostSkeleton />
            <PostSkeleton />
          </div>
        )}

        {bookmarkedPostsError && (
          <div className="p-4 text-center text-red-500">
            <p className="text-xl font-bold">Error loading bookmarks</p>
            <p>{bookmarkedPostsError.message}</p>
            <p className="text-slate-500">Please try again later.</p>
          </div>
        )}

        {noPostsFound && !isSearchActive && (
          <div className="p-4 text-center">
            <p className="text-xl font-bold">No Bookmarked Posts Yet</p>
            <p className="text-slate-500">Bookmark posts to see them here.</p>
          </div>
        )}

        {noPostsFound && isSearchActive && (
          <div className="p-4 text-center">
            <p className="text-xl font-bold">No matching bookmarks found</p>
            <p className="text-slate-500">Try a different keyword or check your spelling.</p>
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
          <div className="py-4 text-center text-slate-500">
            <p>You've reached the end of your bookmarks!</p>
          </div>
        )}
      </div>
    </>
  )
}

export default BookmarksPage
