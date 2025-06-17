import { Link } from "react-router-dom";

import RightPanelSkeleton from "../skeletons/RightPanelSkeleton";
import useFollow from "../../hooks/usersHooks/useFollow";
import { useSuggestedUsers } from "../../hooks/usersHooks/useSuggestedUsers";
import LoadingSpinner from "./LoadingSpinner";

const RightPanel = () => {
  const { suggestedUsers, isLoading } = useSuggestedUsers();
  const { follow, isPending } = useFollow();

  if (suggestedUsers?.length === 0) return <div className="md:w-[390px] w-0 ml-2"></div>;


  return (
    <div className="hidden lg:block mt-4 mx-6 h-[105vh] w-[350px]">
      <div className="p-4 rounded-2xl sticky top-2 border border-gray-700 ">
        <p className="font-bold mb-4 text-xl">Who to follow</p>
        <div className="flex flex-col gap-4">
          {isLoading && (
            <>
              <RightPanelSkeleton />
              <RightPanelSkeleton />
              <RightPanelSkeleton />
              <RightPanelSkeleton />
            </>
          )}
          {!isLoading &&
            suggestedUsers?.map((user) => (
              <Link
                to={`/profile/${user.username}`}
                className="flex items-center justify-between gap-4"
                key={user._id}
              >
                <div className="flex gap-2 items-center flex-grow">
                  <div className="avatar">
                    <div className="w-8 rounded-full">
                      <img src={user.profileImg || "/avatar-placeholder.png"} />
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold tracking-tight truncate w-full hover:underline flex items-center gap-1">
                      {user.fullName.length > 15
                        ? user.fullName.slice(0, 15) + "..."
                        : user.fullName}{" "}
                      {user.isVerified && <img src="/verified.png" className="size-[17px]" />}
                    </span>

                    <span className="text-sm text-slate-500">@{user.username}</span>
                  </div>
                </div>
                <div>
                  <button
                    className="btn bg-white text-black hover:bg-gray-400 hover:opacity-90 rounded-full btn-sm active:bg-gray-500 "
                    onClick={(e) => {
                      e.preventDefault();
                      follow(user._id);
                    }}
                  >
                    {isPending ? <LoadingSpinner size="sm" /> : "Follow"}
                  </button>
                </div>
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
};
export default RightPanel;
