import { Link } from "react-router-dom";

// import { USERS_FOR_RIGHT_PANEL } from "../../utils/db/dummy";
import RightPanelSkeleton from "../skeletons/RightPanelSkeleton";
import { useQuery } from "@tanstack/react-query";
import useFollow from "../../hooks/useFollow";
import LoadingSpinner from "./LoadingSpinner";

const RightPanel = () => {
  const { data: suggestedUsers, isLoading } = useQuery({
    queryKey: ["suggestedUsers"],
    queryFn: async () => {
      const res = await fetch("/api/users/suggested");

      const data = res.json();

      if (!res.ok) throw new Error(data.error || "Something went wrong");

      return data;
    },
  });

  const {followMutation} = useFollow()

  if(suggestedUsers?.length === 0) return <div className="md:w-[275px] w-0 ml-2"></div>;

  return (
    <div className="hidden lg:block  mx-2 h-[105vh]">
      <div className="p-4 rounded-2xl sticky top-2 border border-gray-700 ">
        <p className="font-bold mb-4 text-xl">Who to follow</p>
        {/* {suggestedUsers?.length === 0 && <div className="md:w-64 w-0 border"></div>} */}
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
                <div className="flex gap-2 items-center">
                  <div className="avatar">
                    <div className="w-8 rounded-full">
                      <img src={user.profileImg || "/avatar-placeholder.png"} />
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold tracking-tight truncate w-28 hover:underline">
                      {user.fullName}
                    </span>
                    <span className="text-sm text-slate-500">@{user.username}</span>
                  </div>
                </div>
                <div>
                  <button
                    className="btn bg-white text-black hover:bg-gray-400 hover:opacity-90 rounded-full btn-sm active:bg-gray-500 "
                    onClick={(e) => {
                      e.preventDefault();
                      followMutation(user._id);
                    }}
                  >
                     Follow
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
