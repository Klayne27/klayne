import { Link } from "react-router-dom";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";
import FollowButton from "../ui/FollowButton";

const UserListItem = ({ user: listUser }) => {
  const { authUser } = useAuthUser();

  const amIFollowing = authUser?.following.includes(listUser?._id);

  const isMyProfile = authUser?._id === listUser?._id;

  return (
    <div className="flex items-center justify-between  border-accent last:border-b-0  px-4 py-3">
      <Link to={`/profile/${listUser?.username}`} className="flex items-center gap-2">
        <div className="avatar">
          <div className="w-8 rounded-full">
            <img
              src={listUser?.profileImg?.imageUrl || "/avatar-placeholder.png"}
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
          <FollowButton
            user={listUser}
            currentUserId={authUser?._id}
            isFollowing={amIFollowing}
          />
      )}
    </div>
  );
};

export default UserListItem;
