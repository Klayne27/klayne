import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { CiSearch } from "react-icons/ci";
import { useSearchUsers } from "../../hooks/usersHooks/userSearchUsers";

const SearchPanel = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showResults, setShowResults] = useState(false); // New state to control dropdown visibility

  // Effect for debouncing the search query.
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);

    return () => {
      clearTimeout(timerId);
    };
  }, [searchQuery]);

  // Use the custom hook to fetch search results based on the debounced query
  const { users, isLoading, isError, error, isFetching } = useSearchUsers(debouncedQuery);

  // Effect to control dropdown visibility
  useEffect(() => {
    // Show results if there's a debounced query and not loading, or if there are results
    // or if there's an error. Basically, if we've attempted a search, show the panel.
    if (debouncedQuery || users?.length > 0 || isError) {
      setShowResults(true);
    } else {
      setShowResults(false);
    }
  }, [debouncedQuery, users, isError]);

  return (
    // The main container. Its position relative will be the anchor for the absolute dropdown.
    // Removed sticky, top-0, right-0 from here as it might conflict if this panel
    // is part of a larger layout that's already sticky. Keeping it simple.
    // If you need the entire panel to be sticky, apply sticky to a parent that wraps this.
    <div className="bg-black rounded-lg relative w-full md:block">
      {/* Search Input */}
      <div className="relative mb-4 w-full">
        <input
          type="text"
          placeholder="Search by username or name"
          className="w-full bg-black text-white border border-gray-700 rounded-full py-2 px-4 pl-10 focus:outline-none focus:border-primary z-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => {
            // Show results when input is focused, even if no query yet
            if (debouncedQuery || users?.length > 0 || isError) {
              setShowResults(true);
            }
          }}
          onBlur={() => {
            // Hide results when focus leaves, with a small delay
            // Use a timeout to allow click on results before hiding
            setTimeout(() => setShowResults(false), 100);
          }}
        />
        <CiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
      </div>

      {showResults && (debouncedQuery.length > 0 || users?.length > 0) ? ( 
        <div className="max-h-[500px] w-full overflow-y-auto custom-scrollbar border rounded-2xl absolute top-[43px] left-0 z-50 bg-black border-gray-700 shadow-md shadow-gray-400">
          {(isLoading || isFetching) && debouncedQuery ? (
            <p className="p-4 text-gray-400 text-center">Searching...</p>
          ) : isError ? (
            <p className="p-4 text-red-500 text-center">Error: {error.message}</p>
          ) : users && users.length > 0 ? (
            <>
              {users.map((user) => (
                <Link
                  to={`/profile/${user.username}`}
                  key={user._id}
                  className="flex items-center gap-3 py-2 hover:bg-gray-800 px-2 transition-colors"
                  onClick={() => setSearchQuery("")}
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
            </>
          ) : debouncedQuery && !isLoading && !isFetching && users.length === 0 ? ( 
            <p className="p-4 text-gray-400 text-center">No users found.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default SearchPanel;
