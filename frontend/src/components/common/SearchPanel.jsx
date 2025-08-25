import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { CiSearch } from "react-icons/ci";
import { useSearchUsers } from "../../hooks/usersHooks/userSearchUsers";
import { useAuthUser } from "../../features/auth/authHooks/useAuthUser";

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

  const { suggestedUsers, isLoadingSuggestedUsers, isError, error, isFetching } = useSearchUsers(debouncedQuery);

  useEffect(() => {
    if (debouncedQuery || suggestedUsers?.length > 0 || isError) {
      setShowResults(true);
    } else {
      setShowResults(false);
    }
  }, [debouncedQuery, suggestedUsers, isError]);

  return (
    <div className="relative w-full md:block">
      <div className="flex mb-4 items-center gap-2 rounded-full px-3 py-2 border border-accent w-full">
        <CiSearch className=" text-gray-400 size-5" />
        <input
          type="text"
          placeholder="Search by username or name"
          className=" bg-base-100 focus:outline-none grow focus:border-accent/99 z-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => {
            if (debouncedQuery || suggestedUsers?.length > 0 || isError) {
              setShowResults(true);
            }
          }}
          onBlur={() => {
            setTimeout(() => setShowResults(false), 100);
          }}
        />
      </div>

      {showResults && (debouncedQuery.length > 0 || suggestedUsers?.length > 0) ? (
        <div className="max-h-[500px] w-full overflow-y-auto border rounded-2xl absolute top-[51px] left-0 z-50 bg-base-100 border-accent shadow-md shadow-gray-400">
          {(isLoadingSuggestedUsers || isFetching) && debouncedQuery ? (
            <p className="p-4 text-gray-400 text-center">Searching...</p>
          ) : isError ? (
            <p className="p-4 text-red-500 text-center">Error: {error.message}</p>
          ) : suggestedUsers && suggestedUsers.length > 0 ? (
            <>
              {suggestedUsers.map((user) => {
                const hasBlockedYou = user.blockedUsers.includes(authUser._id);

                return (
                  <Link
                    to={`/profile/${user.username}`}
                    key={user._id}
                    className="flex items-center gap-3 py-2 hover:bg-secondary px-2 transition-colors"
                    onClick={() => setSearchQuery("")}
                  >
                    <div className="avatar">
                      <div className="w-8 rounded-full">
                        <img
                          src={
                            hasBlockedYou || !user.profileImg?.imageUrl
                              ? "/avatar-placeholder.png"
                              : user.profileImg?.imageUrl
                          }
                          alt={`${user.username}'s profile`}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold  truncate max-w-[120px]">
                        {user.fullName}
                      </span>
                      <span className="text-sm text-slate-500 truncate max-w-[120px]">
                        @{user.username}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </>
          ) : debouncedQuery && !isLoadingSuggestedUsers && !isFetching && suggestedUsers?.length === 0 ? (
            <p className="p-4 text-slate-500 text-center">No users found.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default SearchPanel;
