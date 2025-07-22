import XSvg from "../svgs/X";
import { PiBellThin, PiHouseThin } from "react-icons/pi";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { HiDotsHorizontal } from "react-icons/hi";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";
import { useLogout } from "../../hooks/authHooks/useLogout";
import { CiBookmark, CiMail, CiSearch, CiUser } from "react-icons/ci";
import { useState, useRef, useEffect, useCallback } from "react";
import Modal from "./Modal"; // Assuming you have a generic Modal component
import { useDeleteAccount } from "../../hooks/usersHooks/useDeleteAccount";
import toast from "react-hot-toast";
import { useSocket } from "../../context/SocketContext";
import { useQueryClient } from "@tanstack/react-query";
import { LuPalette, LuUserRound, LuUserRoundX } from "react-icons/lu";
import { IoChatbubbleEllipsesOutline, IoClose } from "react-icons/io5"; // Import a close icon
import { BiLogOut } from "react-icons/bi";
import FollowListModal from "./FollowListModal";
import React from "react";

const Sidebar = ({ isChatWindowOpen, isMobileMessagesListScrollingDown }) => {
  const { authUser } = useAuthUser();

  const { logout } = useLogout();
  const { deleteAccount, isDeletingAccount } = useDeleteAccount();
  const {
    hasUnreadMessages,
    hasUnreadNotifications,
    hasNewFeedPosts,
    setHasNewFeedPosts,
    hasUnreadPublicChat,
  } = useSocket();
  const queryClient = useQueryClient();
  // const {username} = useParams()

  const { pathname } = useLocation();
  const navigate = useNavigate();


  const [showPopover, setShowPopover] = useState(false);
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [isMobileBarVisible, setIsMobileBarVisible] = useState(true);
  const [showSideModal, setShowSideModal] = useState(false); // New state for side modal
  const [modalType, setModalType] = useState("");

  // NEW STATE: To track if FollowListModals are open
  const [isFollowingModalOpen, setIsFollowingModalOpen] = useState(false);
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);

  const lastScrollY = useRef(0);
  const profileButtonRef = useRef(null); // Used for desktop popover
  const popoverRef = useRef(null); // Used for desktop popover
  const sideModalRef = useRef(null); // Ref for the new side modal

  const originalTitle = useRef(document.title);
  const originalFaviconHref = useRef(null);

  // --- NEW STATE FOR TOUCH EFFECT ---
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [activeButton, setActiveButton] = useState(null); // Tracks which button is "active" on touch

  // --- NEW TOUCH HANDLERS ---
  const handleTouchStart = useCallback(
    (id) => {
      if (isTouchDevice) {
        setActiveButton(id);
      }
    },
    [isTouchDevice]
  );

  const handleTouchEnd = useCallback(() => {
    if (isTouchDevice) {
      setTimeout(() => {
        setActiveButton(null);
      }, 200); // Match your desired fade-out duration (e.g., 150ms for a quick fade)
    }
  }, [isTouchDevice]);

  const handleTouchCancel = useCallback(() => {
    if (isTouchDevice) {
      setTimeout(() => {
        setActiveButton(null);
      }, 200);
    }
  }, [isTouchDevice]);

  const togglePopover = useCallback((e) => {
    e.stopPropagation();
    setShowPopover((prev) => !prev);
  }, []);

  // New function to toggle the side modal
  const toggleSideModal = useCallback((e) => {
    e.stopPropagation();
    setShowSideModal((prev) => !prev);
  }, []);

  // Effect to handle favicon and title updates
  useEffect(() => {
    let faviconLink = document.querySelector('link[rel="icon"]');
    if (faviconLink && !originalFaviconHref.current) {
      originalFaviconHref.current = faviconLink.href;
    } else if (!faviconLink) {
      const canvas = document.createElement("canvas");
      canvas.width = 32;
      canvas.height = 32;
      canvas.getContext("2d").clearRect(0, 0, 0, 0);
      originalFaviconHref.current = canvas.toDataURL();
      faviconLink = document.createElement("link");
      faviconLink.rel = "icon";
      document.head.appendChild(faviconLink);
    }
  }, []);

  // --- EFFECT TO DETECT TOUCH DEVICE ---
  useEffect(() => {
    setIsTouchDevice(
      "ontouchstart" in window ||
        navigator.maxTouchPoints > 0 ||
        navigator.msMaxTouchPoints > 0
    );
  }, []);

  useEffect(() => {
    const hasAnyNotification =
      hasUnreadMessages ||
      hasUnreadNotifications ||
      hasNewFeedPosts ||
      hasUnreadPublicChat;

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
  }, [hasUnreadMessages, hasUnreadNotifications, hasNewFeedPosts, hasUnreadPublicChat]);

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

  // Function to open FollowListModal
  const openFollowListModal = (type) => {
    // We need to get the specific modal ID to show it
    const modalId =
      type === "following"
        ? `follow_modal_list_following` // Use the fixed IDs from FollowListModal
        : `follow_modal_list_followers`;

    const modalElement = document.getElementById(modalId);
    if (modalElement) {
      modalElement.showModal();
      if (type === "following") {
        setIsFollowingModalOpen(true);
      } else {
        setIsFollowersModalOpen(true);
      }
    }
  };

  // Function to close FollowListModal
  const closeFollowListModal = (type) => {
    const modalId =
      type === "following"
        ? `follow_modal_list_following`
        : `follow_modal_list_followers`;

    const modalElement = document.getElementById(modalId);
    if (modalElement) {
      modalElement.close(); // Use native close
      if (type === "following") {
        setIsFollowingModalOpen(false);
        setShowSideModal(true);
      } else {
        setIsFollowersModalOpen(false);
        setShowSideModal(true);
      }
    }
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

  // Handle click outside desktop popover
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

  // Logic for handling clicks outside the mobile sidebar itself
  useEffect(() => {
    const handleClickOutsideSideModal = (event) => {
      // If the side modal is open and the click is outside it AND outside any follow list modal
      if (
        showSideModal &&
        sideModalRef.current &&
        !sideModalRef.current.contains(event.target) &&
        !isFollowingModalOpen && // Check if following modal is NOT open
        !isFollowersModalOpen // Check if followers modal is NOT open
      ) {
        // We only close the sidebar if *no* follow list modal is active
        setShowSideModal(false);
      }
    };

    // Add event listener to the document
    document.addEventListener("mousedown", handleClickOutsideSideModal);

    // Cleanup the event listener
    return () => {
      document.removeEventListener("mousedown", handleClickOutsideSideModal);
    };
  }, [showSideModal, isFollowingModalOpen, isFollowersModalOpen]); // Dependencies

  const handleLogout = (e) => {
    e.preventDefault();
    logout();
    setShowPopover(false);
    setShowSideModal(false); // Close side modal on logout
  };

  const handleConfirmDeleteClick = () => {
    setShowPopover(false);
    setShowSideModal(false); // Close side modal before showing delete confirmation
    setShowConfirmDeleteModal(true);
  };

  const handleDeleteAccount = async () => {
    if (authUser && authUser._id) {
      await deleteAccount(authUser._id);
      setShowSideModal(false); // Close side modal after deletion attempt
    } else {
      toast.error("User ID not available. Cannot proceed with deletion.");
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      // This is generally for hiding on scroll down on certain pages
      if (
        window.innerWidth < 768 &&
        !pathname.startsWith("/messages") &&
        !pathname.includes("/post/")
      ) {
        const currentScrollY = window.scrollY;

        if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
          setIsMobileBarVisible(false);
        } else if (currentScrollY < lastScrollY.current) {
          setIsMobileBarVisible(true);
        }
        lastScrollY.current = currentScrollY;
      }
    };

    if (window.innerWidth < 768) {
      // Prioritize hiding for specific pages on mobile
      if (
        isChatWindowOpen ||
        pathname.includes("/post/") ||
        pathname.includes("/public-chat")
      ) {
        // <-- ADDED: Hide if on PostPage
        setIsMobileBarVisible(false);
      } else if (pathname.startsWith("/messages")) {
        setIsMobileBarVisible(!isMobileMessagesListScrollingDown);
      } else {
        // Default visibility for other pages that use scroll-hide behavior
        setIsMobileBarVisible(true);
      }
    } else {
      // Always visible on desktop
      setIsMobileBarVisible(true);
    }

    // Add/remove event listeners
    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [isChatWindowOpen, isMobileMessagesListScrollingDown, pathname]); // Keep pathname in dependencies

  const shouldRenderMobileSidebar = !isChatWindowOpen || window.innerWidth >= 768;

  const handlePublicChatClick = () => {
    navigate("/public-chat");
  };

  if (!shouldRenderMobileSidebar) {
    return null;
  }

  return (
    <>
      {/* Main Sidebar */}
      <div
        className={`fixed bottom-0 left-0 w-full bg-base-100 md:sticky md:top-0 md:h-dvh flex md:flex-col items-center md:items-start justify-around md:justify-start border-t md:border-t-0 md:border-r border-accent md:z-0 z-[10] md:flex-[2_2_0] md:max-w-56
          transition-transform duration-300 ease-out
          ${!isMobileBarVisible ? "translate-y-full" : ""}`}
      >
        {/* X-SVG button, apply hover & active */}
        <Link
          to="/"
          onClick={handleHomeClick}
          className={`hidden md:flex justify-start px-2 w-12 h-12 fill-primary rounded-full hover:bg-secondary duration-200
            ${
              isTouchDevice && activeButton === "x-logo"
                ? "bg-secondary bg-opacity-50 transition duration-150"
                : ""
            }`}
          onTouchStart={() => handleTouchStart("x-logo")}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
        >
          <XSvg className="fill-primary" />
        </Link>

        <ul className="flex flex-row md:flex-col md:gap-4 mt-0 md:mt-4 w-full md:w-auto justify-around md:justify-start">
          {/* Home */}
          <li
            onClick={() => {
              navigate("/");
              handleHomeClick();
            }}
            className="flex justify-center md:justify-start items-center cursor-pointer md:hover:bg-secondary rounded-full md:w-[115px] p-1 md:p-0"
          >
            <button
              className={`relative flex items-center rounded-full py-2 px-2 pl-[9px] pr-[7px] max-w-fit cursor-pointer
                transition duration-200
                ${!isTouchDevice ? "hover:bg-secondary md:hover:bg-transparent" : ""} 
                ${
                  isTouchDevice && activeButton === "home"
                    ? "bg-secondary bg-opacity-80"
                    : ""
                }`}
              onTouchStart={() => handleTouchStart("home")}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchCancel}
            >
              <PiHouseThin
                className={`size-[26px] ${
                  pathname === "/" ? "font-bold text-opacity-100" : "opacity-80"
                }`}
                strokeWidth={pathname === "/" ? 18 : 12}
              />
              {hasNewFeedPosts && (
                <div
                  className="absolute top-3 right-2.5 w-3 h-3 bg-red-500 rounded-full border-2 border-black"
                  style={{ transform: "translate(50%, -50%)" }}
                ></div>
              )}
            </button>
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

          <li
            onClick={() => {
              navigate("/messages");
              queryClient.invalidateQueries({queryKey: ["conversations"]})
            }}
            className="flex justify-center md:justify-start items-center cursor-pointer md:hover:bg-secondary rounded-full md:w-[140px] p-1 md:p-0"
          >
            <button
              className={` flex gap-3 items-center justify-center rounded-full py-2 px-2 pl-2.5 max-w-fit cursor-pointer relative
                transition duration-200
                ${!isTouchDevice ? "hover:bg-secondary md:hover:bg-transparent" : ""} 
                ${
                  isTouchDevice && activeButton === "messages"
                    ? "bg-secondary bg-opacity-80"
                    : ""
                }`}
              onTouchStart={() => handleTouchStart("messages")}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchCancel}
            >
              <CiMail
                className={`size-6 ${
                  pathname.startsWith("/messages")
                    ? "font-bold text-opacity-100"
                    : "opacity-80"
                }`}
                strokeWidth={pathname.startsWith("/messages") ? 2 : 1}
              />
              {hasUnreadMessages && (
                <div
                  className="absolute top-3 right-2.5 w-3 h-3 bg-red-500 rounded-full border-2 border-black"
                  style={{ transform: "translate(50%, -50%)" }}
                ></div>
              )}
            </button>
            <span
              className={`text-lg hidden md:block ${
                pathname.startsWith("/messages")
                  ? "font-bold text-opacity-100"
                  : "opacity-80"
              }`}
            >
              Messages
            </span>
          </li>

          <li
            onClick={() => navigate("/notifications")}
            className="flex justify-center md:justify-start items-center cursor-pointer md:hover:bg-secondary rounded-full md:w-[168px] p-1 md:p-0"
          >
            <button
              className={`flex gap-3 items-center rounded-full py-2 px-2 pl-2.5 max-w-fit cursor-pointer relative
                transition duration-200
                ${!isTouchDevice ? "hover:bg-secondary md:hover:bg-transparent" : ""} 
                ${
                  isTouchDevice && activeButton === "notifications"
                    ? "bg-secondary bg-opacity-80"
                    : ""
                }`}
              onTouchStart={() => handleTouchStart("notifications")}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchCancel}
            >
              <PiBellThin
                className={`size-6 ${
                  pathname === "/notifications"
                    ? "font-bold text-opacity-100"
                    : "opacity-80"
                }`}
                strokeWidth={pathname === "/notifications" ? 25 : 15}
              />
              {hasUnreadNotifications && (
                <div
                  className="absolute top-3 right-2.5 w-3 h-3 bg-red-500 rounded-full border-2 border-black"
                  style={{ transform: "translate(50%, -50%)" }}
                ></div>
              )}
            </button>
            <span
              className={`text-lg hidden md:block ${
                pathname === "/notifications"
                  ? "font-bold text-opacity-100"
                  : "opacity-80"
              }`}
            >
              Notifications
            </span>
          </li>

          <li
            onClick={handlePublicChatClick}
            className="flex justify-center md:justify-start items-center cursor-pointer md:hover:bg-secondary rounded-full md:w-[160px] p-1 md:p-0"
          >
            <button
              className={`flex gap-3 items-center justify-center rounded-full py-2 px-2 pl-2.5 max-w-fit cursor-pointer relative
                transition duration-200
                ${!isTouchDevice ? "hover:bg-secondary md:hover:bg-transparent" : ""}
                ${
                  isTouchDevice && activeButton === "public-chat"
                    ? "bg-secondary bg-opacity-80"
                    : ""
                }`}
              onTouchStart={() => handleTouchStart("public-chat")}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchCancel}
            >
              <IoChatbubbleEllipsesOutline
                className={`size-6 ${
                  pathname === "/public-chat" // Adjust based on your actual public chat route
                    ? "font-bold text-opacity-100"
                    : "opacity-80"
                }`}
                strokeWidth={pathname === "/public-chat" ? 2 : 1}
              />
              {/* Red dot for new public chat messages */}
              {hasUnreadPublicChat && (
                <div
                  className="absolute top-3 right-2.5 w-3 h-3 bg-red-500 rounded-full border-2 border-black"
                  style={{ transform: "translate(50%, -50%)" }}
                ></div>
              )}
            </button>
            <span
              className={`text-lg hidden md:block ${
                pathname === "/public-chat" ? "font-bold text-opacity-100" : "opacity-80"
              }`}
            >
              Public Chat
            </span>
          </li>

          {/* Search (Mobile Only) */}
          <li
            className="flex md:flex justify-start lg:hidden items-center cursor-pointer "
            onClick={handleMobileSearchClick}
          >
            <button
              className={` ${
                pathname === "/search" ? "font-bold text-opacity-100" : "opacity-80"
              } flex gap-3 items-center rounded-full py-2 px-[13px] max-w-fit cursor-pointer
                transition duration-200
                ${!isTouchDevice ? "hover:bg-secondary md:hover:bg-transparent" : ""} 
                ${
                  isTouchDevice && activeButton === "search"
                    ? "bg-secondary bg-opacity-80"
                    : ""
                }`}
              onTouchStart={() => handleTouchStart("search")}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchCancel}
            >
              <CiSearch className="size-6" strokeWidth={pathname === "/search" ? 2 : 1} />
            </button>
            <span
              className={`text-lg hidden md:block ${
                pathname === "/search" ? "font-bold text-opacity-100" : "opacity-80"
              }`}
            >
              Search
            </span>
          </li>

          {/* Bookmarks - Hidden on mobile, visible on desktop */}
          <li
            className="hidden md:flex justify-start items-center cursor-pointer md:hover:bg-secondary rounded-full md:w-[150px] p-1 md:p-0"
            onClick={handleBookmarksClick}
          >
            <button
              className={`${
                pathname === "/bookmarks" ? "font-bold text-opacity-100" : "opacity-80"
              } flex gap-3 items-center rounded-full py-2 px-2 pl-2.5 max-w-fit cursor-pointer w-full
                transition duration-200
                ${!isTouchDevice ? "hover:bg-secondary md:hover:bg-transparent" : ""} 
                ${
                  isTouchDevice && activeButton === "bookmarks"
                    ? "bg-secondary bg-opacity-80"
                    : ""
                }`}
              onTouchStart={() => handleTouchStart("bookmarks")}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchCancel}
            >
              <CiBookmark
                className="size-6"
                strokeWidth={pathname === "/bookmarks" ? 2 : 1}
              />
            </button>
            <span
              className={`text-lg hidden md:block ${
                pathname === "/bookmarks" ? "font-bold text-opacity-100" : "opacity-80"
              }`}
            >
              Bookmarks
            </span>
          </li>

          {/* Themes */}
          <li
            className="hidden md:flex justify-start items-center cursor-pointer md:hover:bg-secondary rounded-full md:w-[120px] md:p-0"
            onClick={() => navigate("/themes")}
          >
            <button
              className={`${
                pathname === "/themes" ? "font-bold text-opacity-100" : "opacity-80"
              } flex gap-3 items-center rounded-full py-2 px-2 pl-2.5 max-w-fit cursor-pointer w-full
                transition duration-200
                ${!isTouchDevice ? "hover:bg-secondary md:hover:bg-transparent" : ""} 
                ${
                  isTouchDevice && activeButton === "themes"
                    ? "bg-secondary bg-opacity-80"
                    : ""
                }`}
              onTouchStart={() => handleTouchStart("themes")}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchCancel}
            >
              <LuPalette
                className="size-6"
                strokeWidth={pathname === "/themes" ? 2.5 : 2}
              />
            </button>
            <span
              className={`text-lg ${
                pathname === "/themes" ? "font-bold text-opacity-100" : "opacity-80"
              }`}
            >
              Themes
            </span>
          </li>

          {/* Mobile Profile Image (to open side modal) */}
          <li className="flex md:hidden justify-center items-center cursor-pointer py-1 px-[7px]">
            <button
              id="mobile-profile-img-button" // Add an ID for click outside logic
              onClick={toggleSideModal}
              className={`p-1 rounded-full hover:bg-secondary
                transition duration-200
                ${!isTouchDevice ? "hover:bg-secondary md:hover:bg-transparent" : ""} 
                ${
                  isTouchDevice && activeButton === "mobile-profile-img"
                    ? "bg-secondary bg-opacity-80"
                    : ""
                }`}
              onTouchStart={() => handleTouchStart("mobile-profile-img")}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchCancel}
            >
              <img
                src={authUser?.profileImg || "/avatar-placeholder.png"}
                className="size-7 rounded-full"
                alt="User Profile"
              />
            </button>
          </li>

          {/* Profile (Desktop Only) */}
          <li
            onClick={() => navigate(`/profile/${authUser?.username}`)}
            className="hidden md:flex justify-center md:justify-start items-center cursor-pointer md:hover:bg-secondary rounded-full md:w-[110px] p-1 md:p-0"
          >
            <button
              className={`hidden md:block ${
                pathname === `/profile/${authUser?.username}`
                  ? "font-bold text-opacity-100"
                  : "opacity-80"
              } flex gap-[10px] items-center hover:bg-secondary md:hover:bg-transparent rounded-full py-2 px-2 pl-2 max-w-fit cursor-pointer
                ${
                  isTouchDevice && activeButton === "desktop-profile"
                    ? "bg-secondary bg-opacity-50 transition duration-150"
                    : "transition duration-150"
                }`}
              onTouchStart={() => handleTouchStart("desktop-profile")}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchCancel}
            >
              <LuUserRound
                className="size-7"
                strokeWidth={pathname === `/profile/${authUser?.username}` ? 2 : 1.5}
              />
            </button>
            <span
              className={`text-lg hidden md:block ${
                pathname === `/profile/${authUser?.username}`
                  ? "font-bold text-opacity-100"
                  : "opacity-80"
              }`}
            >
              Profile
            </span>
          </li>
        </ul>

        {/* User Profile and Popover (Desktop only) */}
        {authUser && (
          <div className="hidden md:flex mt-auto mb-3 relative w-full justify-start">
            <button
              ref={profileButtonRef}
              onClick={togglePopover}
              className={`flex gap-2 items-start duration-300 hover:bg-secondary py-2 px-2 rounded-full w-full max-w-[220px]
                ${
                  isTouchDevice && activeButton === "user-profile-button"
                    ? "bg-secondary bg-opacity-50 transition duration-150"
                    : "transition duration-150"
                }`}
              onTouchStart={() => handleTouchStart("user-profile-button")}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchCancel}
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
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-base-100 py-3 rounded-2xl border border-accent min-w-[250px] z-1000 flex flex-col gap-1 shadow-md shadow-gray-400"
              >
                {/* Popover buttons also need the touch effect */}
                <button
                  onClick={handleConfirmDeleteClick}
                  className={`w-full text-left px-3 py-2 text-red-500 text-md hover:bg-secondary font-bold
                    ${
                      isTouchDevice && activeButton === "delete-account-popover"
                        ? "bg-secondary bg-opacity-50 transition duration-150"
                        : "transition duration-150"
                    }`}
                  onTouchStart={() => handleTouchStart("delete-account-popover")}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchCancel}
                >
                  Delete Account
                </button>
                <button
                  onClick={handleLogout}
                  className={`w-full text-left px-3 py-2 text-md hover:bg-secondary font-bold
                    ${
                      isTouchDevice && activeButton === "logout-popover"
                        ? "bg-secondary bg-opacity-50 transition duration-150"
                        : "transition duration-150"
                    }`}
                  onTouchStart={() => handleTouchStart("logout-popover")}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchCancel}
                >
                  Logout @{authUser?.username}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Side Modal */}
      <div
        ref={sideModalRef}
        className={`fixed top-0 left-0 h-full w-[80vw] max-w-[300px] bg-base-100 border-r border-accent z-[1000] transform transition-transform duration-300 ease-out
          ${showSideModal ? "translate-x-0" : "-translate-x-full"}
          md:hidden`} // Only show on mobile
      >
        {authUser && (
          <div className="flex flex-col h-full">
            {/* Header with user info and close button */}
            <div className="p-4 border-b border-accent">
              <div className="flex justify-between items-center mb-1">
                <div className="avatar">
                  <div
                    className={`w-11 rounded-full cursor-pointer
                    ${
                      isTouchDevice && activeButton === "modal-profile-img"
                        ? "bg-secondary bg-opacity-50 transition duration-150"
                        : "transition duration-150"
                    }`}
                    onClick={() => {
                      navigate(`/profile/${authUser?.username}`);
                      setShowSideModal(false); // Close modal on navigation
                    }}
                    onTouchStart={() => handleTouchStart("modal-profile-img")}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={handleTouchCancel}
                  >
                    <img
                      src={authUser?.profileImg || "/avatar-placeholder.png"}
                      alt="User Profile"
                    />
                  </div>
                </div>

                <button
                  onClick={() => setShowSideModal(false)}
                  className={`p-1 rounded-full hover:bg-secondary
                    ${
                      isTouchDevice && activeButton === "modal-close-button"
                        ? "bg-secondary bg-opacity-50 transition duration-150"
                        : "transition duration-150"
                    }`}
                  onTouchStart={() => handleTouchStart("modal-close-button")}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchCancel}
                >
                  <IoClose className="w-6 h-6" />
                </button>
              </div>
              <div className="flex flex-col">
                <p className="font-bold text-lg">{authUser?.fullName}</p>
                <p className="text-slate-500 text-sm">@{authUser?.username}</p>
              </div>
              <div className="flex gap-4 mt-4 text-sm">
                {/* Follower/Following links in modal */}
                <p
                  onClick={() => {
                    openFollowListModal("following");
                    // setShowSideModal(false); // Add this line if you want the sidebar to close
                  }}
                  className={`cursor-pointer font-bold p-1 rounded-md
                    ${
                      isTouchDevice && activeButton === "modal-following"
                        ? "underline"
                        : "transition duration-150"
                    }`}
                  onTouchStart={() => handleTouchStart("modal-following")}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchCancel}
                >
                  <span className="font-bold">{authUser?.following.length || 0}</span>{" "}
                  <span className="text-slate-500">Following</span>
                </p>
                <p
                  onClick={() => {
                    openFollowListModal("followers");
                    // setShowSideModal(false); // Add this line if you want the sidebar to close
                  }}
                  className={`cursor-pointer font-bold p-1 rounded-md
                    ${
                      isTouchDevice && activeButton === "modal-followers"
                        ? "underline"
                        : "transition duration-150"
                    }`}
                  onTouchStart={() => handleTouchStart("modal-followers")}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchCancel}
                >
                  <span className="font-bold">{authUser?.followers.length || 0}</span>{" "}
                  <span className="text-slate-500">Followers</span>
                </p>
              </div>
            </div>

            {/* Scrollable navigation links */}
            <div className="flex-1 overflow-y-auto scrollbar-on-hover py-2">
              <ul className="flex flex-col gap-0">
                {/* Profile Tab in Side Modal */}
                <li
                  onClick={() => {
                    navigate(`/profile/${authUser?.username}`);
                    setShowSideModal(false); // Close modal on navigation
                  }}
                  className={`flex items-center cursor-pointer hover:bg-secondary py-2 px-4
                    ${
                      isTouchDevice && activeButton === "modal-profile"
                        ? "bg-secondary bg-opacity-50 transition duration-150"
                        : "transition duration-150"
                    }`}
                  onTouchStart={() => handleTouchStart("modal-profile")}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchCancel}
                >
                  <LuUserRound
                    className="size-6 mr-4"
                    strokeWidth={pathname === `/profile/${authUser?.username}` ? 2 : 2}
                  />
                  <span
                    className={`text-lg ${
                      pathname === `/profile/${authUser?.username}` ? "font-bold" : ""
                    }`}
                  >
                    Profile
                  </span>
                </li>
                {/* Bookmarks Tab in Side Modal (now visible only in modal on mobile) */}
                <li
                  onClick={() => {
                    navigate("/bookmarks");
                    setShowSideModal(false); // Close modal on navigation
                  }}
                  className={`flex items-center cursor-pointer hover:bg-secondary py-2 px-4
                    ${
                      isTouchDevice && activeButton === "modal-bookmarks"
                        ? "bg-secondary bg-opacity-50 transition duration-150"
                        : "transition duration-150"
                    }`}
                  onTouchStart={() => handleTouchStart("modal-bookmarks")}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchCancel}
                >
                  <CiBookmark
                    className="size-6 mr-4"
                    strokeWidth={pathname === "/bookmarks" ? 2 : 1}
                  />
                  <span
                    className={`text-lg ${pathname === "/bookmarks" ? "font-bold" : ""}`}
                  >
                    Bookmarks
                  </span>
                </li>
                {/* Themes Tab in Side Modal */}
                <li
                  onClick={() => {
                    navigate("/themes");
                    setShowSideModal(false); // Close modal on navigation
                  }}
                  className={`flex items-center cursor-pointer hover:bg-secondary py-2 px-4
                    ${
                      isTouchDevice && activeButton === "modal-themes"
                        ? "bg-secondary bg-opacity-50 transition duration-150"
                        : "transition duration-150"
                    }`}
                >
                  <LuPalette
                    className="size-6 mr-4"
                    strokeWidth={pathname === "/themes" ? 2 : 2}
                  />
                  <span
                    className={`text-lg ${pathname === "/themes" ? "font-bold" : ""}`}
                  >
                    Themes
                  </span>
                </li>

                {/* Separator if needed */}
                <div className="border-t border-accent my-2"></div>

                {/* Delete Account Button in Side Modal */}
                <li
                  onClick={handleConfirmDeleteClick}
                  className={`flex items-center cursor-pointer hover:bg-secondary py-2 px-4 text-red-500 font-bold gap-1
                    ${
                      isTouchDevice && activeButton === "modal-delete-account"
                        ? "bg-secondary bg-opacity-50 transition duration-150"
                        : "transition duration-150"
                    }`}
                  onTouchStart={() => handleTouchStart("modal-delete-account")}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchCancel}
                >
                  <span>
                    <LuUserRoundX className="size-6 mr-3" />
                  </span>
                  Delete Account
                </li>
                {/* Logout Button in Side Modal */}
                <li
                  onClick={handleLogout}
                  className={`flex items-center cursor-pointer hover:bg-secondary py-2 px-4 font-bold
                    ${
                      isTouchDevice && activeButton === "modal-logout"
                        ? "bg-secondary bg-opacity-50 transition duration-150"
                        : "transition duration-150"
                    }`}
                  onTouchStart={() => handleTouchStart("modal-logout")}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchCancel}
                >
                  <span>
                    <BiLogOut className="size-6 mr-4" />
                  </span>
                  Logout
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {authUser && (
        <FollowListModal
          userId={authUser._id}
          type="following"
          page="sidebar"
          onClose={() => closeFollowListModal("following")}
        />
      )}

      {authUser && (
        <FollowListModal
          userId={authUser._id}
          type="followers"
          page="sidebar"
          onClose={() => closeFollowListModal("followers")}
        />
      )}

      {/* Background Overlay for Side Modal */}
      {showSideModal && !isFollowingModalOpen && !isFollowersModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-[999] md:hidden"
          onClick={() => setShowSideModal(false)}
        ></div>
      )}

      {/* Modal for Account Deletion (already exists) */}
      <Modal
        isOpen={showConfirmDeleteModal}
        onClose={() => setShowConfirmDeleteModal(false)}
      >
        <h2 className="text-lg font-bold mb-4 text-center">Confirm Account Deletion</h2>
        <p className="text-gray-500 mb-6 text-center">
          Are you absolutely sure you want to delete your account? This action is
          irreversible and all your data will be permanently removed.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={handleDeleteAccount}
            className={`w-full bg-red-600 text-white py-2 rounded-full hover:bg-red-700 transition-colors
            ${
              isTouchDevice && activeButton === "confirm-delete"
                ? "bg-red-700 transition duration-150"
                : "transition duration-150"
            }`}
            onTouchStart={() => handleTouchStart("confirm-delete")}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchCancel}
            disabled={isDeletingAccount}
          >
            {isDeletingAccount ? "Deleting..." : "Yes, Delete Account"}
          </button>
          <button
            onClick={() => setShowConfirmDeleteModal(false)}
            className={`w-full bg-gray-500 text-white py-2 rounded-full hover:bg-gray-600 transition-colors
            ${
              isTouchDevice && activeButton === "cancel-delete"
                ? "bg-secondary bg-opacity-50 transition duration-150"
                : "transition duration-150"
            }`}
            onTouchStart={() => handleTouchStart("cancel-delete")}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchCancel}
          >
            Cancel
          </button>
        </div>
      </Modal>
    </>
  );
};
export default React.memo(Sidebar);
