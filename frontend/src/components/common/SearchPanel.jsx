import { useState, useEffect } from "react";
import { Link } from "react-router-dom"; // For navigating to user profiles when a result is clicked
import { CiSearch } from "react-icons/ci"; // Assuming you are using react-icons for icons
import { useSearchUsers } from "../../hooks/usersHooks/userSearchUsers";

const SearchPanel = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Effect for debouncing the search query.
  // This delays updating `debouncedQuery` until `searchQuery` hasn't changed for 500ms.
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500); // Debounce time: 500 milliseconds

    // Cleanup function: If `searchQuery` changes again before 500ms, clear the previous timeout.
    return () => {
      clearTimeout(timerId);
    };
  }, [searchQuery]); // Re-run this effect whenever `searchQuery` changes

  // Use the custom hook to fetch search results based on the debounced query
  const { users, isLoading, isError, error, isFetching } = useSearchUsers(debouncedQuery);

  return (
    <div className="bg-black rounded-lg sticky top-0 right-0 z-10 hidden md:block">
      <div className="relative mb-4 w-full">
        <input
          type="text"
          placeholder="Search by username or name"
          className="w-full bg-black text-white border  border-gray-700 rounded-full py-2 px-4 pl-10 focus:outline-none focus:border-primary z-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <CiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
      </div>
      {(isLoading || isFetching) && debouncedQuery ? ( // Show "Searching..." only if a query has been typed
        <p className="text-gray-400">Searching...</p>
      ) : isError ? (
        <p className="text-red-500">Error: {error.message}</p>
      ) : users && users.length > 0 ? (
        // Display results if users array is not empty
        <div className="max-h-[500px] w-full overflow-y-auto custom-scrollbar border rounded-2xl absolute top-[43px] -z-2 bg-black rouned-xl border-gray-700 shadow-md shadow-gray-400">
          {users.map((user) => (
            <Link
              to={`/profile/${user.username}`} // Link to the user's profile page
              key={user._id}
              className="flex items-center gap-3 py-2 hover:bg-gray-800 px-2 transition-colors"
              onClick={() => setSearchQuery("")} // Optional: Clear search input when a user is clicked
            >
              <div className="avatar">
                <div className="w-8 rounded-full">
                  <img
                    src={user.profileImg || "/avatar-placeholder.png"}
                    alt={`${user.username}'s profile`}
                  />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-white truncate max-w-[120px]">
                  {user.fullName}
                </span>
                <span className="text-sm text-gray-500 truncate max-w-[120px]">
                  @{user.username}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : debouncedQuery && !isLoading && !isFetching ? ( // Show "No users found" if query typed but no results
        <p className="text-gray-400 text-center mb-4">No users found.</p>
      ) : null}{" "}
      {/* Nothing displayed if search query is empty and no results */}
    </div>
  );
};

export default SearchPanel;
