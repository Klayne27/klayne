import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useFollow from "../../hooks/usersHooks/useFollow";

import Posts from "../../components/common/Posts";
import ProfileHeaderSkeleton from "../../components/skeletons/ProfileHeaderSkeleton";
import EditProfileModal from "./EditProfileModal";
import FollowListModal from "../../components/common/FollowListModal";

import { FaArrowLeft } from "react-icons/fa6";
import { IoCalendarOutline } from "react-icons/io5";
import { FaLink } from "react-icons/fa";
import { MdEdit } from "react-icons/md";
import { formatMemberSinceDate } from "../../utils/date";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";
import { useUpdateUserProfile } from "../../hooks/usersHooks/useUpdateUserProfile";
import { useFetchUserProfile } from "../../hooks/usersHooks/useFetchUserProfile";
import { useFetchConversations } from "../../hooks/messagesHooks/useFetchConversations";
import { CiMail } from "react-icons/ci";

const ProfilePage = () => {
  const [coverImg, setCoverImg] = useState(null);
  const [profileImg, setProfileImg] = useState(null);
  const [feedType, setFeedType] = useState("posts");
  const [modalType, setModalType] = useState(null);
  const navigate = useNavigate();

  const [userPostsCount, setUserPostsCount] = useState(0);

  const coverImgRef = useRef(null);
  const profileImgRef = useRef(null);

  const { username } = useParams();

  const { authUser } = useAuthUser();
  const { follow, isPending } = useFollow();

  const { user, isLoading, refetch, isRefetching } = useFetchUserProfile(username);
  const { updateProfile, isUpdatingProfile } = useUpdateUserProfile();
  const { conversations, isLoadingConversations } = useFetchConversations();

  const isMyProfile = authUser?._id === user?._id;
  const amIFollowing = authUser?.following?.includes(user?._id);

  const handleImgChange = (e, state) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        state === "coverImg" && setCoverImg(reader.result);
        state === "profileImg" && setProfileImg(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMessageClick = () => {
    const existingConversation = conversations.find((conv) =>
      conv.participants.some((p) => p?._id.toString() === user._id.toString())
    );

    if (existingConversation) {
      navigate(`/messages/${existingConversation._id}`);
    } else {
      navigate("/messages", { state: { targetUserId: user._id } });
    }
  };

  useEffect(() => {
    refetch();
  }, [username, refetch]);

  const openFollowListModal = (type) => {
    setModalType(type);
    document.getElementById(`follow_list_modal_${type}`).showModal();
  };

  const closeFollowListModal = (type) => {
    document.getElementById(`follow_list_modal_${type}`).close();
    setModalType(null);
  };

  const handlePostsFetched = (postsArray) => {
    if (postsArray) {
      setUserPostsCount(postsArray.length);
    } else {
      setUserPostsCount(0);
    }
  };

  return (
    <>
      <div className="flex-[4_4_0] border-r border-gray-700 min-h-screen">
        {(isLoading || isRefetching) && <ProfileHeaderSkeleton />}
        {!isLoading && !isRefetching && !user && (
          <p className="text-center text-lg mt-4">User not found</p>
        )}
        <div className="flex flex-col">
          {!isLoading && !isRefetching && user && (
            <>
              <div className="flex gap-10 px-4 py-2 items-center">
                <button
                  onClick={() => navigate(-1)}
                  className="hover:bg-gray-800 rounded-full p-2.5 transition duration-200"
                >
                  <FaArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex flex-col">
                  <p className="font-bold text-lg">{user?.fullName}</p>
                  <span className="text-sm text-slate-500">
                    {feedType === "posts" ? `${userPostsCount} posts` : ""}
                  </span>{" "}
                </div>
              </div>
              <div className="relative group/cover">
                <img
                  src={coverImg || user?.coverImg || "/cover.png"}
                  className="h-52 w-full object-cover"
                  alt="cover image"
                />
                {isMyProfile && (
                  <div
                    className="absolute top-2 right-2 rounded-full p-2 bg-gray-800 bg-opacity-75 cursor-pointer opacity-0 group-hover/cover:opacity-100 transition duration-200"
                    onClick={() => coverImgRef.current.click()}
                  >
                    <MdEdit className="w-5 h-5 text-white" />
                  </div>
                )}

                <input
                  type="file"
                  hidden
                  accept="image/*"
                  ref={coverImgRef}
                  onChange={(e) => handleImgChange(e, "coverImg")}
                />
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  ref={profileImgRef}
                  onChange={(e) => handleImgChange(e, "profileImg")}
                />
                <div className="avatar absolute -bottom-16 left-4">
                  <div className="w-32 rounded-full relative group/avatar">
                    <img
                      src={profileImg || user?.profileImg || "/avatar-placeholder.png"}
                      alt="user avatar"
                    />
                    {isMyProfile && (
                      <div className="absolute top-5 right-3 p-1 bg-primary rounded-full group-hover/avatar:opacity-100 opacity-0 cursor-pointer">
                        <MdEdit
                          className="w-4 h-4 text-white"
                          onClick={() => profileImgRef.current.click()}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex justify-end px-4 mt-5 gap-2">
                {isMyProfile && <EditProfileModal authUser={authUser} />}
                {!isMyProfile && amIFollowing && (
                  <button
                    onClick={handleMessageClick}
                    className=" p-2 border rounded-full hover:bg-secondary transition duration-200 z-20 bg-black"
                  >
                    <CiMail size={20} strokeWidth={1} />
                  </button>
                )}
                {!isMyProfile && (
                  <button
                    className={`${
                      !amIFollowing
                        ? "bg-white text-black hover:bg-gray-400 duration-200 transition border-none"
                        : "hover:bg-secondary"
                    } font-bold border px-4 rounded-full py-1.5  transition duration-200`}
                    onClick={() => follow(user?._id)}
                  >
                    {isPending && "Loading..."}
                    {!isPending && amIFollowing && "Unfollow"}
                    {!isPending && !amIFollowing && "Follow"}
                  </button>
                )}
                {(coverImg || profileImg) && (
                  <button
                    className=" rounded-full px-4 py-1.5 bg-primary text-white font-semibold hover:bg-[#1d9cf0d8] transition duration-300"
                    onClick={async () => {
                      await updateProfile({
                        coverImg,
                        profileImg,
                      });
                      setProfileImg(null);
                      setCoverImg(null);
                    }}
                  >
                    {isUpdatingProfile ? "Updating..." : "Update"}
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-4 mt-14 px-4">
                <div className="flex flex-col">
                  <span className="font-bold text-lg">{user?.fullName}</span>
                  <span className="text-sm text-slate-500">@{user?.username}</span>
                  <span className="text-sm my-1">{user?.bio}</span>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {user?.link && (
                    <div className="flex gap-1 items-center ">
                      <>
                        <FaLink className="w-3 h-3 text-slate-500" />
                        <a
                          href={user?.link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          {user?.link.slice(12)}
                        </a>
                      </>
                    </div>
                  )}
                  <div className="flex gap-2 items-center">
                    <IoCalendarOutline className="w-4 h-4 text-slate-500" />
                    <span className="text-sm text-slate-500">
                      {formatMemberSinceDate(user?.createdAt)}
                    </span>
                  </div>
                </div>
                <div className="flex gap-4">
                  {" "}
                  <div
                    className="flex gap-1 items-center cursor-pointer hover:underline"
                    onClick={() => openFollowListModal("following")}
                  >
                    <span className="font-bold text-sm">{user?.following.length}</span>{" "}
                    <span className="text-slate-500 text-sm">Following</span>{" "}
                  </div>
                  <div
                    className="flex gap-1 items-center cursor-pointer hover:underline"
                    onClick={() => openFollowListModal("followers")}
                  >
                    <span className="font-bold text-sm">{user?.followers.length}</span>{" "}
                    <span className="text-slate-500 text-sm">Followers</span>{" "}
                  </div>
                </div>
              </div>
              <div className="flex w-full border-b border-gray-700 mt-4">
                <div
                  className="flex justify-center flex-1 p-3 hover:bg-secondary transition duration-300 relative cursor-pointer"
                  onClick={() => setFeedType("posts")}
                >
                  Posts
                  {feedType === "posts" && (
                    <div className="absolute bottom-0 w-10 h-1 rounded-full bg-primary" />
                  )}
                </div>
                <div
                  className="flex justify-center flex-1 p-3 hover:bg-secondary transition duration-300 relative cursor-pointer"
                  onClick={() => setFeedType("likes")}
                >
                  Likes
                  {feedType === "likes" && (
                    <div className="absolute bottom-0 w-10 h-1 rounded-full bg-primary" />
                  )}
                </div>
              </div>
            </>
          )}

          <Posts
            feedType={feedType}
            username={username}
            userId={user?._id}
            onPostsFetched={handlePostsFetched}
          />
        </div>
      </div>

      {user && (
        <FollowListModal
          userId={user._id}
          type="following"
          onClose={() => closeFollowListModal("following")}
        />
      )}

      {user && (
        <FollowListModal
          userId={user._id}
          type="followers"
          onClose={() => closeFollowListModal("followers")}
        />
      )}
    </>
  );
};
export default ProfilePage;
