import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { CiSearch } from "react-icons/ci";
import { useSearchUsers } from "../../hooks/usersHooks/userSearchUsers";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";

const SearchPanel = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const { authUser } = useAuthUser();

  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);

    return () => {
      clearTimeout(timerId);
    };
  }, [searchQuery]);

  const { users, isLoading, isError, error, isFetching } = useSearchUsers(debouncedQuery);

  useEffect(() => {
    if (debouncedQuery || users?.length > 0 || isError) {
      setShowResults(true);
    } else {
      setShowResults(false);
    }
  }, [debouncedQuery, users, isError]);

  return (
    <div className="relative w-full md:block">
      <div className="relative mb-4 w-full">
        <input
          type="text"
          placeholder="Search by username or name"
          className="w-full bg-se text-white border border-gray-700 bg-black rounded-full py-2 px-4 pl-10 focus:outline-none focus:border-primary z-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => {
            if (debouncedQuery || users?.length > 0 || isError) {
              setShowResults(true);
            }
          }}
          onBlur={() => {
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
              {users.map((user) => {
                const hasBlockedYou = user.blockedUsers.includes(authUser._id);

                return (
                  <Link
                    to={`/profile/${user.username}`}
                    key={user._id}
                    className="flex items-center gap-3 py-2 hover:bg-gray-800 px-2 transition-colors"
                    onClick={() => setSearchQuery("")}
                  >
                    <div className="avatar">
                      <div className="w-8 rounded-full">
                        <img
                          src={
                            hasBlockedYou || !user.profileImg
                              ? "/avatar-placeholder.png"
                              : user.profileImg
                          }
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
                );
              })}
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
