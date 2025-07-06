import XSvg from "../svgs/X";
import { PiBellThin, PiHouseThin } from "react-icons/pi"; // Combined PiHouseThin
import { Link, useLocation, useNavigate } from "react-router-dom";
import { HiDotsHorizontal } from "react-icons/hi";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";
import { useLogout } from "../../hooks/authHooks/useLogout";
import { CiBookmark, CiMail, CiSearch, CiUser } from "react-icons/ci";
import { useState, useRef, useEffect, useCallback } from "react"; // Combined imports
import Modal from "./Modal";
import { useDeleteAccount } from "../../hooks/usersHooks/useDeleteAccount";
import toast from "react-hot-toast";
import { useSocket } from "../../context/SocketContext";
import { useQueryClient } from "@tanstack/react-query";
import { LuPalette } from "react-icons/lu";

const Sidebar = ({ isChatWindowOpen, isMobileMessagesListScrollingDown }) => {
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
  // New state for controlling mobile bar visibility
  const [isMobileBarVisible, setIsMobileBarVisible] = useState(true);
  const lastScrollY = useRef(0);

  const profileButtonRef = useRef(null);
  const popoverRef = useRef(null);

  const navigate = useNavigate();

  const originalTitle = useRef(document.title);
  const originalFaviconHref = useRef(null);

  const togglePopover = useCallback((e) => {
    e.stopPropagation();
    setShowPopover((prev) => !prev);
  }, []);

  useEffect(() => {
    let faviconLink = document.querySelector('link[rel="icon"]');
    if (faviconLink && !originalFaviconHref.current) {
      originalFaviconHref.current = faviconLink.href;
    } else if (!faviconLink) {
      const canvas = document.createElement("canvas");
      canvas.width = 32;
      canvas.height = 32;
      canvas.getContext("2d").clearRect(0, 0, 0, 0); // Changed to 0,0,0,0
      originalFaviconHref.current = canvas.toDataURL();
      faviconLink = document.createElement("link");
      faviconLink.rel = "icon";
      document.head.appendChild(faviconLink);
    }
  }, []);

  useEffect(() => {
    const hasAnyNotification =
      hasUnreadMessages || hasUnreadNotifications || hasNewFeedPosts;

    if (hasAnyNotification) {
      document.title = `(New) ${originalTitle.current}`;
    } else {
      document.title = originalTitle.current;
    }

    const faviconLink = document.querySelector('link[rel="icon"]');
    if (!faviconLink || !originalFaviconHref.current) {
      console.warn(
        "Favicon link not found or original favicon not captured. Cannot apply badge."
      );
      return;
    }

    if (hasAnyNotification) {
      const canvas = document.createElement("canvas");
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext("2d");

      const img = new Image();
      img.src = originalFaviconHref.current;
      img.crossOrigin = "anonymous";

      const drawFaviconWithBadge = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const badgeSize = 13;
        const padding = 0;
        ctx.beginPath();
        ctx.arc(
          canvas.width - badgeSize / 2 - padding,
          badgeSize / 2 + padding,
          badgeSize / 2,
          0,
          Math.PI * 2,
          false
        );
        ctx.fillStyle = "red";
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = "#000";
        ctx.stroke();

        faviconLink.href = canvas.toDataURL("image/png");
      };

      img.onload = drawFaviconWithBadge;

      img.onerror = () => {
        console.warn(
          "Could not load original favicon for badging. Reverting to basic red dot as fallback."
        );
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, 8, 0, Math.PI * 2, false);
        ctx.fillStyle = "red";
        ctx.fill();
        faviconLink.href = canvas.toDataURL("image/png");
      };

      if (img.complete) {
        drawFaviconWithBadge();
      }
    } else {
      faviconLink.href = originalFaviconHref.current;
    }

    return () => {
      document.title = originalTitle.current;
      if (faviconLink && originalFaviconHref.current) {
        faviconLink.href = originalFaviconHref.current;
      }
    };
  }, [hasUnreadMessages, hasUnreadNotifications, hasNewFeedPosts]);

  const handleMobileSearchClick = () => {
    navigate("/search");
  };

  const handleHomeClick = () => {
    queryClient.invalidateQueries({ queryKey: ["posts"] });
    if (hasNewFeedPosts) {
      setHasNewFeedPosts(false);
    }
  };

  const handleBookmarksClick = () => {
    queryClient.invalidateQueries({ queryKey: ["bookmarkedPosts"] });
    navigate("/bookmarks");
  };

  useEffect(() => {
    if (pathname === "/" || pathname === "/bookmarks") {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant",
      });
    }
  }, [pathname]);

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

  // Modified useEffect for scroll behavior
  useEffect(() => {
    const handleScroll = () => {
      // Only apply window scroll behavior for non-message pages
      if (window.innerWidth < 768 && !pathname.startsWith("/messages")) {
        const currentScrollY = window.scrollY;

        if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
          setIsMobileBarVisible(false); // Scrolling down, hide
        } else if (currentScrollY < lastScrollY.current) {
          setIsMobileBarVisible(true); // Scrolling up, show
        }
        lastScrollY.current = currentScrollY;
      }
    };

    // --- New logic for Sidebar visibility based on props ---
    if (window.innerWidth < 768) {
      if (isChatWindowOpen) {
        // If a chat window is open on mobile, always hide sidebar
        setIsMobileBarVisible(false);
      } else if (pathname.startsWith("/messages")) {
        // If on mobile messages list, use the new scroll state
        setIsMobileBarVisible(!isMobileMessagesListScrollingDown);
      } else {
        // For other pages (Home, Notifications, etc.), use window scroll
        // This is handled by the `handleScroll` event listener
        // The initial state should be true unless scrolling occurs.
        setIsMobileBarVisible(true); // Default to visible
      }
    } else {
      // On desktop, always visible
      setIsMobileBarVisible(true);
    }
    // --- End of new logic ---

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleScroll); // Good to re-evaluate on resize

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [isChatWindowOpen, isMobileMessagesListScrollingDown, pathname]); // Add new prop and pathname to dependencies

  // Determine if the sidebar should be rendered at all on mobile
  const shouldRenderMobileSidebar = !isChatWindowOpen || window.innerWidth >= 768;

  if (!shouldRenderMobileSidebar) {
    return null; // Don't render the sidebar at all if a chat window is open on mobile
  }

  return (
    // Add `transform` and `transition` classes for the hide/show animation
    // Use `isMobileBarVisible` to control `translate-y-full`
    <div
      className={`fixed bottom-0 left-0 w-full md:sticky md:top-0 md:h-dvh flex md:flex-col items-center md:items-start justify-around md:justify-start border-t md:border-t-0 md:border-r border-gray-700 bg-base-100 z-50 md:flex-[2_2_0] md:max-w-56
      transition-transform duration-300 ease-out
      ${
        // Apply `translate-y-full` to hide on mobile if not visible.
        // This covers both window scroll on other pages and the new list scroll logic.
        !isMobileBarVisible ? "translate-y-full" : ""
      }`}
    >
      <Link
        to="/"
        onClick={handleHomeClick}
        className="hidden md:flex justify-start" // Only show X icon on desktop
      >
        <XSvg className="px-2 w-12 h-12 fill-primary rounded-full hover:bg-secondary duration-200" />
      </Link>

      {/* Navigation Links */}
      <ul className="flex flex-row md:flex-col md:gap-4 mt-0 md:mt-4 w-full md:w-auto justify-around md:justify-start">
        {/* Home */}
        <li
          onClick={() => {
            navigate("/");
            handleHomeClick();
          }}
          className="flex justify-center md:justify-start items-center cursor-pointer md:hover:bg-secondary rounded-full md:w-[115px] p-1 md:p-0"
        >
          <Link
            to="/"
            onClick={handleHomeClick}
            className={`relative flex items-center hover:bg-secondary md:hover:bg-transparent rounded-full py-2 px-2 pl-[9px] pr-[7px] max-w-fit cursor-pointer`}
          >
            <PiHouseThin
              className={`size-5 md:size-[26px] ${
                pathname === "/" ? "font-bold text-opacity-100" : "opacity-80"
              }`}
              strokeWidth={pathname === "/" ? 18 : 12}
            />
            {/* The notification dot for Home */}
            {hasNewFeedPosts && (
              <div
                className="absolute top-3 right-2.5 w-3 h-3 bg-red-500 rounded-full border-2 border-black"
                style={{ transform: "translate(50%, -50%)" }}
              ></div>
            )}
          </Link>
          <span
            className={`text-lg hidden md:block ${
              pathname === "/" ? "font-bold text-opacity-100" : "opacity-80"
            }`}
            onClick={() => {
              navigate("/");
              handleHomeClick();
            }}
          >
            Home
          </span>
        </li>

        {/* Messages */}
        <li
          onClick={() => navigate("/messages")}
          className="flex justify-center md:justify-start items-center cursor-pointer md:hover:bg-secondary rounded-full md:w-[140px] p-1 md:p-0"
        >
          <Link
            to="/messages"
            className={` flex gap-3 items-center justify-center hover:bg-secondary md:hover:bg-transparent rounded-full py-2 px-2 pl-2.5 max-w-fit cursor-pointer relative`}
          >
            <CiMail
              className={`size-5 md:size-6 ${
                pathname.startsWith("/messages")
                  ? "font-bold text-opacity-100"
                  : "opacity-80"
              }`}
              strokeWidth={pathname.startsWith("/messages") ? 2 : 1}
            />
            {/* The notification dot for Messages */}
            {hasUnreadMessages && (
              <div
                className="absolute top-3 right-2.5 w-3 h-3 bg-red-500 rounded-full border-2 border-black"
                style={{ transform: "translate(50%, -50%)" }}
              ></div>
            )}
          </Link>
          <span
            className={`text-lg hidden md:block ${
              pathname.startsWith("/messages")
                ? "font-bold text-opacity-100"
                : "opacity-80"
            }`}
            onClick={() => navigate("/messages")}
          >
            Messages
          </span>
        </li>

        {/* Notifications */}
        <li
          onClick={() => navigate("/notifications")}
          className="flex justify-center md:justify-start items-center cursor-pointer md:hover:bg-secondary rounded-full md:w-[168px] p-1 md:p-0"
        >
          <Link
            to="/notifications"
            className={`flex gap-3 items-center hover:bg-secondary md:hover:bg-transparent rounded-full py-2 px-2 pl-2.5 max-w-fit cursor-pointer relative`}
          >
            <PiBellThin
              className={`size-5 md:size-6 ${
                pathname === "/notifications"
                  ? "font-bold text-opacity-100"
                  : "opacity-80"
              }`}
              strokeWidth={pathname === "/notifications" ? 25 : 15}
            />
            {/* The notification dot for Notifications */}
            {hasUnreadNotifications && (
              <div
                className="absolute top-3 right-2.5 w-3 h-3 bg-red-500 rounded-full border-2 border-black"
                style={{ transform: "translate(50%, -50%)" }}
              ></div>
            )}
          </Link>
          <span
            className={`text-lg hidden md:block ${
              pathname === "/notifications" ? "font-bold text-opacity-100" : "opacity-80"
            }`}
            onClick={() => navigate("/notifications")}
          >
            Notifications
          </span>
        </li>

        {/* Bookmarks - Only visible on desktop now, as per X/Twitter mobile */}
        <li
          className="flex md:flex justify-start items-center cursor-pointer md:hover:bg-secondary rounded-full md:w-[150px] p-1 md:p-0"
          onClick={handleBookmarksClick}
        >
          <Link
            to="/bookmarks"
            className={`${
              pathname === "/bookmarks" ? "font-bold text-opacity-100" : "opacity-80"
            } flex gap-3 items-center hover:bg-secondary rounded-full py-2 px-2 pl-2.5 max-w-fit cursor-pointer w-full`}
          >
            <CiBookmark
              className="size-5 md:size-6"
              strokeWidth={pathname === "/bookmarks" ? 2 : 1}
            />
          </Link>
          <span
            className={`text-lg hidden md:block ${
              pathname === "/bookmarks" ? "font-bold text-opacity-100" : "opacity-80"
            }`}
          >
            Bookmarks
          </span>
        </li>

        {/* Search (Mobile Only) */}
        <li
          className="flex justify-center md:hidden items-center cursor-pointer "
          onClick={handleMobileSearchClick}
        >
          <button
            className={`${
              pathname === "/search" ? "font-bold text-opacity-100" : "opacity-80"
            } flex gap-3 items-center hover:bg-secondary rounded-full py-2 px-2 pl-2.5 max-w-fit cursor-pointer`}
          >
            <CiSearch
              className="size-5 md:size-6"
              strokeWidth={pathname === "/search" ? 2 : 1}
            />
            {/* Optional: Add a text label for search on mobile if you want, currently only icon */}
            {/* <span className="text-lg">Search</span> */}
          </button>
        </li>

        {/* Profile */}
        <li
          onClick={() => navigate(`/profile/${authUser?.username}`)}
          className="flex justify-center md:justify-start items-center cursor-pointer md:hover:bg-secondary rounded-full md:w-[110px] p-1 md:p-0"
        >
          <Link
            to={`/profile/${authUser?.username}`}
            className={`${
              pathname === `/profile/${authUser?.username}`
                ? "font-bold text-opacity-100"
                : "opacity-80"
            } flex gap-[10px] items-center hover:bg-secondary md:hover:bg-transparent rounded-full py-2 px-2 pl-2 max-w-fit cursor-pointer`}
          >
            <CiUser
              className="size-5 md:size-6"
              strokeWidth={pathname === `/profile/${authUser?.username}` ? 1.5 : 1}
            />
          </Link>
          <span
            onClick={() => navigate(`/profile/${authUser?.username}`)}
            className={`text-lg hidden md:block ${
              pathname === `/profile/${authUser?.username}`
                ? "font-bold text-opacity-100"
                : "opacity-80"
            }`}
          >
            Profile
          </span>
        </li>

        <li
          className="hidden md:flex justify-start items-center cursor-pointer md:hover:bg-secondary rounded-full md:w-[120px] p-1 md:p-0"
          onClick={() => navigate("/themes")}
        >
          <Link
            to="/themes"
            className={`${
              pathname === "/themes" ? "font-bold text-opacity-100" : "opacity-80"
            } flex gap-3 items-center hover:bg-secondary rounded-full py-2 px-2 pl-2.5 max-w-fit cursor-pointer w-full`}
          >
            <LuPalette
              className="size-6"
              strokeWidth={pathname === "/themes" ? 2.5 : 2}
            />
          </Link>
          <span
            className={`text-lg ${
              pathname === "/themes" ? "font-bold text-opacity-100" : "opacity-80"
            }`}
          >
            Themes
          </span>
        </li>
      </ul>

      {/* User Profile and Popover (Desktop only for full info, icon only for mobile if needed) */}
      {authUser && (
        <div className="hidden md:flex mt-auto mb-3 relative w-full justify-start">
          <button
            ref={profileButtonRef}
            onClick={togglePopover}
            className="flex gap-2 items-start duration-300 hover:bg-secondary py-2 px-2 rounded-full w-full max-w-[220px]"
          >
            <div className="avatar">
              <div className="w-8 rounded-full">
                <img
                  src={authUser?.profileImg || "/avatar-placeholder.png"}
                  alt="User Profile"
                />
              </div>
            </div>
            <div className="flex justify-between flex-1 items-center">
              <div>
                <p className="font-bold text-sm w-20 truncate">{authUser?.fullName}</p>
                <p className="text-slate-500 text-sm">@{authUser?.username}</p>
              </div>
              <HiDotsHorizontal className="w-5 h-5 cursor-pointer " />
            </div>
          </button>

          {showPopover && (
            <div
              ref={popoverRef}
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-base-100 py-3 rounded-2xl border border-gray-700 min-w-[250px] z-1000 flex flex-col gap-1 shadow-md shadow-gray-400"
            >
              <button
                onClick={handleConfirmDeleteClick}
                className="w-full text-left px-3 py-2 text-red-500 text-md hover:bg-secondary transition-colors font-bold"
              >
                Delete Account
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 text-white text-md hover:bg-secondary transition-colors font-bold"
              >
                Logout @{authUser?.username}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Mobile profile/logout popover if desired, currently hidden.
        You might want to make a dedicated mobile profile button somewhere else,
        or only show the full desktop popover on mobile if user explicitly taps their small avatar.
      */}
      {showPopover && (
        <div
          ref={popoverRef}
          className="md:hidden fixed bottom-16 left-1/2 -translate-x-1/2 mb-2
                       bg-base-100 py-3 rounded-2xl border border-gray-700
                       min-w-[150px] z-1000 flex flex-col gap-1 shadow-md shadow-gray-400"
        >
          <button
            onClick={handleConfirmDeleteClick}
            className="w-full text-left px-3 py-2 text-red-500 text-md hover:bg-secondary transition-colors font-bold"
          >
            Delete Account
          </button>
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 text-white text-md hover:bg-secondary transition-colors font-bold"
          >
            Logout @{authUser?.username}
          </button>
        </div>
      )}

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
            className="w-full bg-gray-700 text-white py-2 rounded-full hover:bg-secondary transition-colors"
          >
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  );
};
export default Sidebar;
