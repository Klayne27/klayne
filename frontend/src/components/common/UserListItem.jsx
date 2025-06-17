import { Link } from "react-router-dom";
import useFollow from "../../hooks/usersHooks/useFollow";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";
import LoadingSpinner from "./LoadingSpinner";

const UserListItem = ({ user: listUser }) => {
  const { authUser } = useAuthUser();
  const { follow, isPending } = useFollow();

  const amIFollowing = authUser?.following.includes(listUser?._id);
  
  const isMyProfile = authUser?._id === listUser?._id;

  return (
    <div className="flex items-center justify-between  border-gray-700 last:border-b-0  px-4 py-3">
      <Link to={`/profile/${listUser.username}`} className="flex items-center gap-2">
        <div className="avatar">
          <div className="w-8 rounded-full">
            <img
              src={listUser.profileImg || "/avatar-placeholder.png"}
              alt={`${listUser.username}'s avatar`}
            />
          </div>
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm">{listUser.fullName}</span>
          <span className="text-gray-500 text-xs">@{listUser.username}</span>
        </div>
      </Link>
      {!isMyProfile && (
        <button
          className={`${!amIFollowing ? 'bg-white text-black hover:bg-gray-400 duration-200 transition' : ''} font-bold px-4 py-1.5 hover:bg-gray-800 duration-200 transition rounded-full border border-gray-700`}
          onClick={() => follow(listUser?._id)}
          disabled={isPending}
        >
          {isPending ? (
            <LoadingSpinner size="sm" />
          ) : amIFollowing ? (
            "Unfollow"
          ) : (
            "Follow"
          )}
        </button>
      )}
    </div>
  );
};

export default UserListItem;
