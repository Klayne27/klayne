import XSvg from "../svgs/X";
import { PiBellThin } from "react-icons/pi";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { HiDotsHorizontal } from "react-icons/hi";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";
import { useLogout } from "../../hooks/authHooks/useLogout";
import { CiMail, CiSearch, CiUser } from "react-icons/ci";
import { PiHouseThin } from "react-icons/pi";
import { useState, useRef, useEffect } from "react";
import Modal from "./Modal";
import { useDeleteAccount } from "../../hooks/usersHooks/useDeleteAccount";
import toast from "react-hot-toast";
import { useSocket } from "../../context/SocketContext";
import { useQueryClient } from "@tanstack/react-query";

const Sidebar = ({ setFeedType }) => {
  const { authUser } = useAuthUser();
  const { logout } = useLogout();
  const { deleteAccount, isDeletingAccount } = useDeleteAccount();
  const {
    hasUnreadMessages,
    hasUnreadNotifications,
    hasNewFeedPosts,
    setHasNewFeedPosts,
  } = useSocket();
  const queryClient = useQueryClient();

  const { pathname } = useLocation();

  const [showPopover, setShowPopover] = useState(false);
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);

  const profileButtonRef = useRef(null);
  const popoverRef = useRef(null);

  const navigate = useNavigate();

  const handleMobileSearchClick = () => {
    navigate("/search");
  };

  const handleHomeClick = () => {
    queryClient.invalidateQueries({ queryKey: ["posts"] });

    if (hasNewFeedPosts) {
      console.log("Home clicked, resetting hasNewFeedPosts to false.");
      setHasNewFeedPosts(false);
    }

    if (pathname === "/") {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant",
      });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        profileButtonRef.current &&
        !profileButtonRef.current.contains(event.target) &&
        popoverRef.current &&
        !popoverRef.current.contains(event.target)
      ) {
        setShowPopover(false);
      }
    };

    if (showPopover) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showPopover]);

  const handleLogout = (e) => {
    e.preventDefault();
    logout();
    setShowPopover(false);
  };

  const handleConfirmDeleteClick = () => {
    setShowPopover(false);
    setShowConfirmDeleteModal(true);
  };

  const handleDeleteAccount = async () => {
    if (authUser && authUser._id) {
      await deleteAccount(authUser._id);
    } else {
      toast.error("User ID not available. Cannot proceed with deletion.");
    }
  };

  return (
    <div className="md:flex-[2_2_0] max-w-56">
      <div className="sticky top-0 left-0 h-dvh flex flex-col border-r border-gray-700 w-[46px] md:w-full">
        <Link
          to="/"
          onClick={handleHomeClick}
          className="flex justify-start md:justify-start"
        >
          <XSvg className="px-2 w-12 h-12 rounded-full fill-white hover:bg-stone-900" />
        </Link>
        <ul className="flex flex-col gap-3 mt-4">
          <li
            onClick={() => {
              navigate("/");
              handleHomeClick();
            }}
            className="flex justify-start md:justify-start items-center gap-0.5 md:hover:bg-stone-900 transition-all rounded-full cursor-pointer w-[115px]"
          >
            <Link
              to="/"
              onClick={handleHomeClick}
              className={`${
                pathname === "/" ? "font-bold text-white" : ""
              } relative flex gap-2.5 items-center hover:bg-stone-900 transition-all rounded-full py-2 px-2 pl-2 pr-2 max-w-fit cursor-pointer`}
            >
              <PiHouseThin
                className="w-7 h-7 fill-white"
                strokeWidth={pathname === "/" ? 18 : 12}
              />
              {hasNewFeedPosts && (
                <div
                  className="absolute top-3 right-3 w-3 h-3 bg-red-500 rounded-full border-2 border-black"
                  style={{ transform: "translate(50%, -50%)" }}
                ></div>
              )}
            </Link>
            <Link
              to="/"
              onClick={handleHomeClick}
              className={`${pathname === "/" ? "font-bold text-white" : ""} `}
            >
              <span className="text-lg hidden md:block">Home</span>
            </Link>
          </li>
          <li
            onClick={() => navigate("/messages")}
            className="flex justify-start md:justify-start items-center gap-1 md:hover:bg-stone-900 transition-all rounded-full cursor-pointer w-[140px]"
          >
            <Link
              to="/messages"
              className={`${
                pathname.startsWith("/messages") ? "font-bold text-white" : ""
              } flex gap-3 items-center hover:bg-stone-900 transition-all rounded-full py-2 px-2 pl-2.5 max-w-fit cursor-pointer relative`}
            >
              <CiMail
                className="w-6 h-6 "
                strokeWidth={pathname.startsWith("/messages") ? 2 : 1}
              />
              {hasUnreadMessages && (
                <div
                  className="absolute top-3 right-2.5 w-3 h-3 bg-red-500 rounded-full border-2 border-black"
                  style={{ transform: "translate(50%, -50%)" }}
                ></div>
              )}
            </Link>
            <Link
              to="/messages"
              className={`${
                pathname.startsWith("/messages") ? "font-bold text-white" : ""
              } `}
            >
              <span className="text-lg hidden md:block">Messages</span>
            </Link>
          </li>
          <li
            onClick={() => navigate("/notifications")}
            className="flex justify-start md:justify-start items-center gap-1 md:hover:bg-stone-900 transition-all rounded-full cursor-pointer w-[168px]"
          >
            <Link
              to="/notifications"
              className={`${
                pathname === "/notifications" ? "font-bold text-white" : ""
              } flex gap-3 items-center hover:bg-stone-900 transition-all rounded-full py-2 px-2 pl-2.5 max-w-fit cursor-pointer relative`}
            >
              <PiBellThin
                className="w-6 h-6"
                strokeWidth={pathname === "/notifications" ? 25 : 15}
              />
              {hasUnreadNotifications && (
                <div
                  className="absolute top-3 right-2.5 w-3 h-3 bg-red-500 rounded-full border-2 border-black"
                  style={{ transform: "translate(50%, -50%)" }}
                ></div>
              )}
            </Link>
            <Link
              to="/notifications"
              className={`${pathname === "/notifications" ? "font-bold text-white" : ""}`}
            >
              <span className="text-lg hidden md:block">Notifications</span>
            </Link>
          </li>
          <li className="flex justify-start md:justify-start md:hidden">
            <div
              className={`${
                pathname === "/search" ? "font-bold text-white" : ""
              }  flex gap-3 items-center hover:bg-stone-900 transition-all rounded-full py-2 px-2 pl-2.5 max-w-fit cursor-pointer`}
            >
              <button onClick={handleMobileSearchClick}>
                <CiSearch
                  className="w-6 h-6"
                  strokeWidth={pathname === "/search" ? 2 : 1}
                />
              </button>
            </div>
          </li>

          <li
            onClick={() => navigate(`/profile/${authUser?.username}`)}
            className="flex justify-start md:justify-start md:hover:bg-stone-900 transition-all rounded-full cursor-pointer w-[115px]"
          >
            <Link
              to={`/profile/${authUser?.username}`}
              className={`${
                pathname === `/profile/${authUser?.username}`
                  ? "font-bold text-white"
                  : ""
              } flex gap-[10px] items-center hover:bg-stone-900 transition-all rounded-full py-2 px-2 pl-2 max-w-fit cursor-pointer`}
            >
              <CiUser
                className="w-7 h-7"
                strokeWidth={pathname === `/profile/${authUser?.username}` ? 2 : 1}
              />
              <span className="text-lg hidden md:block">Profile</span>
            </Link>
          </li>
        </ul>

        {authUser && (
          <div className="mt-auto mb-3 relative w-full flex justify-center md:justify-start">
            <button
              ref={profileButtonRef}
              onClick={() => setShowPopover(!showPopover)}
              className="flex gap-2 items-start transition-all duration-300 hover:bg-[#181818] py-2 px-2 rounded-full w-full max-w-[220px]"
            >
              <div className="avatar hidden md:inline-flex">
                <div className="w-8 rounded-full">
                  <img
                    src={authUser?.profileImg || "/avatar-placeholder.png"}
                    alt="User Profile"
                  />
                </div>
              </div>
              <div className="flex justify-center md:justify-between flex-1 items-center">
                <div className="hidden md:block">
                  <p className="text-white font-bold text-sm w-20 truncate">
                    {authUser?.fullName}
                  </p>
                  <p className="text-slate-500 text-sm">@{authUser?.username}</p>
                </div>
                <HiDotsHorizontal className="w-5 h-5 cursor-pointer text-white" />
              </div>
            </button>

            {showPopover && (
              <div
                ref={popoverRef}
                className="fixed bottom-4 left-[40px]
                md:absolute md:bottom-full md:left-1/2 md:-translate-x-1/2 md:mb-2
                bg-black py-3 rounded-2xl border border-gray-700
                min-w-[150px] md:min-w-[250px] z-[60] flex flex-col gap-1
                shadow-md shadow-gray-400"
              >
                <button
                  onClick={handleConfirmDeleteClick}
                  className="w-full text-left px-3 py-2 text-red-500 text-md hover:bg-gray-800 transition-colors font-bold"
                >
                  Delete Account
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-white text-md hover:bg-gray-800 transition-colors font-bold"
                >
                  Logout @{authUser?.username}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <Modal
        isOpen={showConfirmDeleteModal}
        onClose={() => setShowConfirmDeleteModal(false)}
      >
        <h2 className="text-lg font-bold text-white mb-4 text-center">
          Confirm Account Deletion
        </h2>
        <p className="text-gray-300 mb-6 text-center">
          Are you absolutely sure you want to delete your account? This action is
          irreversible and all your data will be permanently removed.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={handleDeleteAccount}
            className="w-full bg-red-600 text-white py-2 rounded-full hover:bg-red-700 transition-colors"
            disabled={isDeletingAccount}
          >
            {isDeletingAccount ? "Deleting..." : "Yes, Delete Account"}
          </button>
          <button
            onClick={() => setShowConfirmDeleteModal(false)}
            className="w-full bg-gray-700 text-white py-2 rounded-full hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  );
};
export default Sidebar;
