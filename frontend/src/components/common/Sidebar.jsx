import XSvg from "../svgs/X";
import { PiBellThin, PiHouseThin } from "react-icons/pi";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";
import { useLogout } from "../../hooks/authHooks/useLogout";
import { CiBookmark, CiMail, CiSearch, CiUser } from "react-icons/ci";
import { useState, useRef, useEffect, useCallback } from "react";
import { useDeleteAccount } from "../../hooks/usersHooks/useDeleteAccount";
import { useSocket } from "../../context/SocketContext";
import { useQueryClient } from "@tanstack/react-query";
import { LuPalette, LuUserRound, LuUserRoundX } from "react-icons/lu";
import { IoChatbubbleEllipsesOutline, IoClose } from "react-icons/io5"; // Import a close icon
import { BiLogOut } from "react-icons/bi";
import FollowListModal from "./FollowListModal";
import React from "react";
import { showAppToast } from "../../utils/showAppToast";
import { BsThreeDots } from "react-icons/bs";
import ConfirmationModal from "../ui/ConfirmationModal";
import FeatherIcon from "../svgs/FeatherIcon";
import { useMarkPostsAsRead } from "../../hooks/postsHooks/useMarkPostsAsRead";
import { useAppStore } from "../../store/appStore";

const Sidebar = ({
  onOpenCreatePostModal,
}) => {
  const { authUser } = useAuthUser();
  const isChatWindowOpen = useAppStore(state => state.isChatWindowOpen)


  const { logout } = useLogout();
  const { deleteAccount, isDeletingAccount } = useDeleteAccount();
  const {
    hasUnreadMessages,
    hasUnreadNotifications,
    hasNewFeedPosts,
    setHasNewFeedPosts,
    hasUnreadPublicChat,
    setShowNewFeedPostsButton,
    unreadNotificationsCount,
    unreadMessageCount,
    unreadPublicChatCount,
    newPostCount,
  } = useSocket();
  const queryClient = useQueryClient();
  // const {username} = useParams()

  const { pathname } = useLocation();
  const navigate = useNavigate();

  const [showPopover, setShowPopover] = useState(false);
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [isMobileBarVisible, setIsMobileBarVisible] = useState(true);
  const [showSideModal, setShowSideModal] = useState(false); // New state for side modal
  const [isFeatherIconVisible, setIsFeatherIconVisible] = useState(true);

  const [passwordInput, setPasswordInput] = useState("");

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

  const { markFeedAsRead } = useMarkPostsAsRead();
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

  // const hasAnyNewNotification =
  //   unreadMessageCount > 0 ||
  //   unreadNotificationsCount > 0 ||
  //   unreadPublicChatCount > 0 ||
  //   newPostCount > 0;

  const totalNotifications =
    unreadMessageCount + unreadNotificationsCount + unreadPublicChatCount + newPostCount;

  useEffect(() => {
    const hasAnyNewNotification =
      unreadMessageCount > 0 ||
      unreadNotificationsCount > 0 ||
      unreadPublicChatCount > 0 ||
      newPostCount > 0;

    if (hasAnyNewNotification) {
      document.title = `(${totalNotifications}) ${originalTitle.current}`;
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

    if (hasAnyNewNotification) {
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

        const badgeSize = 10;
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
  }, [
    hasUnreadMessages,
    hasUnreadNotifications,
    hasNewFeedPosts,
    hasUnreadPublicChat,
    newPostCount,
    totalNotifications,
    unreadMessageCount,
    unreadNotificationsCount,
    unreadPublicChatCount,
  ]);

  const handleMobileSearchClick = () => {
    navigate("/search");
  };

  const handleHomeClick = useCallback(() => {
    navigate("/");

    window.scrollTo({
      top: 0,
      behavior: pathname === "/" ? 'smooth' : "instant",
    });

    queryClient.invalidateQueries({ queryKey: ["posts", "/api/posts/all"] });

    markFeedAsRead();
    setShowNewFeedPostsButton(false);
  }, [queryClient, setShowNewFeedPostsButton, markFeedAsRead, navigate, pathname]);

  const handleBookmarksClick = () => {
    if (pathname === "/bookmarks") return;
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
    if (!passwordInput) {
      showAppToast("Please enter your password.", "error");
      return;
    }

    if (authUser && authUser._id) {
      try {
        await deleteAccount({ userId: authUser._id, password: passwordInput });
        // On success, the useDeleteAccount hook redirects, so the modal will unmount anyway.
        // If it didn't redirect, you'd setShowConfirmDeleteModal(false);
      } catch (error) {
        // Error handling is already done by useDeleteAccount's onError,
        // but you can add more specific modal closing logic if needed.
        // For example, if you want the modal to stay open on error for correction.
        console.error("Deletion failed:", error);
      } finally {
        // Clear password input regardless of success/failure when the async operation finishes
        setPasswordInput("");
      }
    } else {
      showAppToast("User ID not available. Cannot proceed with deletion.", "error");
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      // Always hide on specific paths regardless of scroll on mobile
      const shouldAlwaysHide =
        pathname.includes("/public-chat") || // Public chat
        pathname.includes("/post/") || // Individual post page
        isChatWindowOpen; // Private chat window is open

      if (window.innerWidth < 768) {
        if (shouldAlwaysHide) {
          setIsMobileBarVisible(false);
          setIsFeatherIconVisible(false); // Immediately hid
          lastScrollY.current = window.scrollY; // Reset lastScrollY to current to prevent immediate re-showing
          return; // Exit early, no further scroll logic needed for these paths
        }

        if (pathname.startsWith("/messages")) {
          // Special handling for messages page, based on prop
          setIsMobileBarVisible(true);
        } else {
          // General scroll-hide/show behavior for other mobile pages
          const currentScrollY = window.scrollY;
          if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
            setIsMobileBarVisible(false);
            setIsFeatherIconVisible(false);
          } else if (currentScrollY < lastScrollY.current) {
            setIsMobileBarVisible(true);
            setIsFeatherIconVisible(true);
          }
          lastScrollY.current = currentScrollY;
        }
      } else {
        // Always visible on desktop
        setIsMobileBarVisible(true);
        setIsFeatherIconVisible(true);
      }
    };

    // Initial check when component mounts or dependencies change
    // This handles navigation directly to a hidden path
    if (window.innerWidth < 768) {
      const shouldAlwaysHide =
        pathname.includes("/public-chat") ||
        pathname.includes("/post/") ||
        isChatWindowOpen;

      if (shouldAlwaysHide) {
        setIsMobileBarVisible(false);
        setIsFeatherIconVisible(false);
      } else if (pathname.startsWith("/messages")) {
        setIsMobileBarVisible(true);
      } else {
        setIsMobileBarVisible(true); // Default to visible for other paths
        setIsFeatherIconVisible(true); // Default to visible for other paths on mobile initially
      }
    } else {
      setIsMobileBarVisible(true);
      setIsFeatherIconVisible(true);
    }

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [isChatWindowOpen, pathname]);

  const shouldRenderMobileSidebar = !isChatWindowOpen || window.innerWidth >= 768;

  const handlePublicChatClick = () => {
    if (pathname === "/public-chat") return;
    navigate("/public-chat");
  };

  const isConfirmButtonDisabled = passwordInput.length === 0 || isDeletingAccount;

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
        <div
          className={
            `block md:hidden ${
              pathname.includes("/messages") ? "hidden" : ""
            } fixed bottom-[73px] right-5 z-[50] rounded-full size-[56px] cursor-pointer hover:bg-opacity-85 p-4 bg-primary text-white
            transform transition-all duration-300 ease-in-out white-shadow
             ${isFeatherIconVisible ? "scale-100 opacity-100" : "scale-0 opacity-0"}` // <-- ADD THESE CLASSES
          }
          onClick={onOpenCreatePostModal}
        >
          <FeatherIcon />
        </div>
        {/* X-SVG button, apply hover & active */}
        <div
          to="/"
          onClick={handleHomeClick}
          className={`hidden md:flex justify-start cursor-pointer px-2 w-12 h-12 fill-primary rounded-full hover:bg-secondary duration-200
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
        </div>

        <ul className="flex flex-row md:flex-col md:gap-4 mt-0 md:mt-4 w-full  justify-around md:justify-start">
          {/* Home */}
          <li
            onClick={() => {
              // if (pathname === "/") return
              // navigate("/");
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
                className={`size-[30px] ${
                  pathname === "/" ? "font-bold text-opacity-100" : "opacity-80"
                }`}
                strokeWidth={pathname === "/" ? 10 : 8}
              />
              {newPostCount > 0 && (
                <div
                  className="absolute top-3 right-2.5 w-3 h-3 bg-primary rounded-full border-2 border-black"
                  style={{ transform: "translate(50%, -50%)" }}
                ></div>
              )}
            </button>
            <span
              className={`text-xl hidden md:block ${
                pathname === "/" ? "font-bold text-opacity-100" : "opacity-80"
              }`}
            >
              Home
            </span>
          </li>

          <li
            onClick={() => {
              if (pathname === "/messages") return;
              navigate("/messages");
              queryClient.invalidateQueries({ queryKey: ["conversations"] });
            }}
            className="flex justify-center md:justify-start items-center cursor-pointer md:hover:bg-secondary rounded-full md:w-[150px] p-1 md:p-0"
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
                className={`size-7 ${
                  pathname.startsWith("/messages")
                    ? "font-bold text-opacity-100"
                    : "opacity-80"
                }`}
                strokeWidth={pathname.startsWith("/messages") ? 1 : 0.5}
              />
              {unreadMessageCount > 0 && (
                <div
                  className="absolute top-3 right-2.5 bg-primary rounded-full border-2 border-black 
               flex items-center justify-center 
               text-white text-[11px] font-bold 
               min-w-[1.25rem] h-5 px-1" // Adjusted for Tailwind's direct utility classes
                  style={{ transform: "translate(50%, -50%)" }}
                >
                  {unreadMessageCount}
                </div>
              )}
            </button>
            <span
              className={`text-xl hidden md:block ${
                pathname.startsWith("/messages")
                  ? "font-bold text-opacity-100"
                  : "opacity-80"
              }`}
            >
              Messages
            </span>
          </li>

          <li
            onClick={() => {
              if (pathname === "/notifications") return;
              navigate("/notifications");
            }}
            className="flex justify-center md:justify-start items-center cursor-pointer md:hover:bg-secondary rounded-full md:w-[180px] p-1 md:p-0"
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
                className={`size-7 ${
                  pathname === "/notifications"
                    ? "font-bold text-opacity-100"
                    : "opacity-80"
                }`}
                strokeWidth={pathname === "/notifications" ? 14 : 10}
              />
              {unreadNotificationsCount > 0 && (
                <div
                  className="absolute top-3 right-2.5 bg-primary rounded-full border-2 border-black 
               flex items-center justify-center 
               text-white text-[11px] font-bold 
               min-w-[1.25rem] h-5 px-1" // Adjusted for Tailwind's direct utility classes
                  style={{ transform: "translate(50%, -50%)" }}
                >
                  {unreadNotificationsCount}
                </div>
              )}
            </button>
            <span
              className={`text-xl hidden md:block ${
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
            className="flex justify-center md:justify-start items-center cursor-pointer md:hover:bg-secondary rounded-full md:w-[170px] p-1 md:p-0"
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
                className={`size-7 ${
                  pathname === "/public-chat" // Adjust based on your actual public chat route
                    ? "font-bold text-opacity-100"
                    : "opacity-80"
                }`}
                strokeWidth={pathname === "/public-chat" ? 2 : 1}
              />
              {/* Red dot for new public chat messages */}
              {unreadPublicChatCount > 0 && (
                <div
                  className="absolute top-3 right-2.5 bg-primary rounded-full border-2 border-black 
               flex items-center justify-center 
               text-white text-[11px] font-bold 
               min-w-[1.25rem] h-5 px-1" // Adjusted for Tailwind's direct utility classes
                  style={{ transform: "translate(50%, -50%)" }}
                >
                  {unreadPublicChatCount}
                </div>
              )}
            </button>
            <span
              className={`text-xl hidden md:block ${
                pathname === "/public-chat" ? "font-bold text-opacity-100" : "opacity-80"
              }`}
            >
              Public Chat
            </span>
          </li>

          {/* Search (Mobile Only) */}
          <li
            className="flex justify-start lg:hidden items-center cursor-pointer "
            onClick={handleMobileSearchClick}
          >
            <button
              className={` ${
                pathname === "/search" ? "font-bold text-opacity-100" : "opacity-80"
              } flex gap-3 items-center rounded-full py-2 px-[1px] max-w-fit cursor-pointer
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
              <CiSearch
                className="size-7 w-11"
                strokeWidth={pathname === "/search" ? 1 : 0.5}
              />
            </button>
            <span
              className={`text-xl hidden md:block ${
                pathname === "/search" ? "font-bold text-opacity-100" : "opacity-80"
              }`}
            >
              Search
            </span>
          </li>

          {/* Bookmarks - Hidden on mobile, visible on desktop */}
          <li
            className="hidden md:flex justify-start items-center cursor-pointer md:hover:bg-secondary rounded-full md:w-[165px] p-1 md:p-0"
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
                className="size-7"
                strokeWidth={pathname === "/bookmarks" ? 2 : 1}
              />
            </button>
            <span
              className={`text-xl hidden md:block ${
                pathname === "/bookmarks" ? "font-bold text-opacity-100" : "opacity-80"
              }`}
            >
              Bookmarks
            </span>
          </li>

          {/* Themes */}
          <li
            className="hidden md:flex justify-start items-center cursor-pointer md:hover:bg-secondary rounded-full md:w-[125px] md:p-0"
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
                className="size-7"
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
            onClick={() => {
              if (pathname === `/profile/${authUser?.username}`) return;
              navigate(`/profile/${authUser?.username}`);
            }}
            className="hidden md:flex justify-center md:justify-start items-center cursor-pointer md:hover:bg-secondary rounded-full md:w-[125px] p-1 md:p-0"
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
                className="size-8"
                strokeWidth={pathname === `/profile/${authUser?.username}` ? 2 : 1.5}
              />
            </button>
            <span
              className={`text-xl hidden md:block ${
                pathname === `/profile/${authUser?.username}`
                  ? "font-bold text-opacity-100"
                  : "opacity-80"
              }`}
            >
              Profile
            </span>
          </li>
          <div className="hidden md:block mr-7">
            <button
              className="font-semibold  rounded-full w-full px-4 py-3 bg-primary duration-200 transition hover:bg-primary/85 cursor-pointer text-white"
              onClick={onOpenCreatePostModal}
            >
              Post
            </button>
          </div>
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
                <BsThreeDots className="w-5 h-5 cursor-pointer " />
              </div>
            </button>

            {showPopover && (
              <div
                ref={popoverRef}
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-base-100 py-3 rounded-2xl border border-accent min-w-[250px] z-1000 flex flex-col gap-1 white-shadow"
              >
                {/* Popover buttons also need the touch effect */}
                <button
                  onClick={handleConfirmDeleteClick}
                  className={`w-full flex items-center text-left px-3 py-2 text-red-500 text-md hover:bg-secondary font-bold
                    ${
                      isTouchDevice && activeButton === "delete-account-popover"
                        ? "bg-secondary bg-opacity-50 transition duration-150"
                        : "transition duration-150"
                    }`}
                  onTouchStart={() => handleTouchStart("delete-account-popover")}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchCancel}
                >
                  <span>
                    <LuUserRoundX className="size-6 mr-3" />
                  </span>
                  Delete Account
                </button>
                <button
                  onClick={handleLogout}
                  className={`w-full flex items-center text-left px-3 py-2 pl-2 text-md hover:bg-secondary font-bold
                    ${
                      isTouchDevice && activeButton === "logout-popover"
                        ? "bg-secondary bg-opacity-50 transition duration-150"
                        : "transition duration-150"
                    }`}
                  onTouchStart={() => handleTouchStart("logout-popover")}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchCancel}
                >
                  <span>
                    <BiLogOut className="size-6 mr-4" />
                  </span>
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
                    className="size-7 mr-4"
                    strokeWidth={pathname === `/profile/${authUser?.username}` ? 2 : 2}
                  />
                  <span
                    className={`text-xl ${
                      pathname === `/profile/${authUser?.username}` ? "font-bold" : ""
                    }`}
                  >
                    Profile
                  </span>
                </li>
                {/* Bookmarks Tab in Side Modal (now visible only in modal on mobile) */}
                <li
                  onClick={() => {
                    if (pathname === "/bookmarks") return;
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
                    className="size-7 mr-4"
                    strokeWidth={pathname === "/bookmarks" ? 2 : 1}
                  />
                  <span
                    className={`text-xl ${pathname === "/bookmarks" ? "font-bold" : ""}`}
                  >
                    Bookmarks
                  </span>
                </li>
                {/* Themes Tab in Side Modal */}
                <li
                  onClick={() => {
                    if (pathname === "/themes") return;
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
                    className="size-7 mr-4"
                    strokeWidth={pathname === "/themes" ? 2 : 2}
                  />
                  <span
                    className={`text-xl ${pathname === "/themes" ? "font-bold" : ""}`}
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
                  Logout @{authUser?.username}
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

      <ConfirmationModal
        modalTitle="Confirm Account Deletion"
        isOpen={showConfirmDeleteModal}
        onClose={() => {
          setShowConfirmDeleteModal(false);
          setPasswordInput(""); // Clear password when modal is closed without confirmation
        }}
        onConfirm={handleDeleteAccount}
        isConfirmDisabled={isConfirmButtonDisabled} // Control disabled state from here
        message="This action is irreversible. Please enter your password to confirm."
        danger={true}
        confirmButtonText={isDeletingAccount ? "Deleting..." : "Yes, Delete Account"}
        isLoading={isDeletingAccount} // Show loading state
      >
        <input
          type="password"
          placeholder="Enter your password"
          value={passwordInput}
          onChange={(e) => setPasswordInput(e.target.value)}
          className="w-full p-2 px-4 mb-2 bg-base-100 border border-slate-500 rounded-xl focus:outline-none focus:border-primary focus:ring-primary"
          autoFocus // Optional: Automatically focus this input when modal opens
        />
      </ConfirmationModal>
    </>
  );
};
export default React.memo(Sidebar);
