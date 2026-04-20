import { useLocation, useNavigate } from "react-router-dom"
import { useAuthUser } from "../../features/auth/authHooks/useAuthUser"
import { CiMail, CiSearch } from "react-icons/ci"
import { useState, useRef, useEffect, useCallback, Suspense } from "react"
import { useSocket } from "../../context/SocketContext"
import { useQueryClient } from "@tanstack/react-query"
import { BiLogOut } from "react-icons/bi"
import FollowListModal from "./FollowListModal"
import React from "react"
import { showAppToast } from "../../utils/showAppToast"
import { BsThreeDots } from "react-icons/bs"
import ConfirmationModal from "./ConfirmationModal"
import FeatherIcon from "../svgs/FeatherIcon"
import { useAppStore } from "../../store/useAppStore"
import { useTouchHoverEffect } from "../../hooks/customHooks/useTouchHoverEffect"
import { formatCount } from "../../utils/textUtils"
import MobileSideModal from "./MobileSideModal"
import { postKeys } from "../../features/posts/postsHooks/postKeys"
import {
  TbHanger2,
  TbHanger2Filled,
  TbMailFilled,
  TbUser,
  TbUserFilled,
  TbUserX,
} from "react-icons/tb"
import { GoBell, GoBellFill, GoHome, GoHomeFill } from "react-icons/go"
import { IoBookmark, IoBookmarkOutline, IoChatbubbles, IoChatbubblesOutline } from "react-icons/io5"
import { HiOutlinePaintBrush, HiOutlineEllipsisHorizontalCircle } from "react-icons/hi2"
import klayneLogo from "/klaynelogo2.png"

import { MdOutlineLibraryBooks } from "react-icons/md"
import { IoIosTimer } from "react-icons/io"
import { LuListTodo } from "react-icons/lu"
import { getOptimizedImageUrl } from "../../utils/cloudinaryUtils"
import { useLogout } from "../../features/auth/authHooks/useAuthMutations"
import {
  useDeleteAccount,
  useUpdateStatusPreference,
} from "../../features/users/usersHooks/useUserMutations"
import { useIsMobile } from "../../hooks/customHooks/useIsMobile"
import {
  PiCoatHanger,
  PiCoatHangerBold,
  PiSquaresFourFill,
  PiSquaresFourLight,
} from "react-icons/pi"
import { useTheme } from "../../context/ThemeContext"
import { getKlayneColor } from "../../utils/getKlayneColor"
import { shouldTextBeWhite } from "../../utils/shouldTextBeWhite"
import WardrobePage from "../../features/wardrobe/WardrobePage"
import UserAvatar from "./UserAvatar"

const Sidebar = ({
  onOpenCreatePostModal,
  installApp,
  isInstalled,
  deferredPrompt,
  isIOSDevice,
}) => {
  const { authUser } = useAuthUser()
  const isMobile = useIsMobile()
  const isChatWindowOpen = useAppStore((state) => state.isChatWindowOpen)
  const {
    setShowNewFeedPostsButton,
    unreadNotificationsCount,
    unreadMessageCount,
    unreadPublicChatCount,
    newPostCount,
    newVentPostCount,
    socket,
    newBoardPostCount,
    showNewBoardPostsButton,
  } = useSocket()

  const { theme } = useTheme()

  const { logout } = useLogout()
  const queryClient = useQueryClient()

  const { deleteAccount, isDeletingAccount } = useDeleteAccount()

  const { pathname } = useLocation()
  const navigate = useNavigate()

  const [showPopover, setShowPopover] = useState(false)
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false)
  const [isMobileBarVisible, setIsMobileBarVisible] = useState(true)
  const [showSideModal, setShowSideModal] = useState(false)
  const [isFeatherIconVisible, setIsFeatherIconVisible] = useState(true)

  const [isFollowingModalOpen, setIsFollowingModalOpen] = useState(false)
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false)

  const [showWardrobe, setShowWardrobe] = useState(false)

  const [showMorePopover, setShowMorePopover] = useState(false)
  const moreButtonRef = useRef(null)

  const lastScrollY = useRef(0)
  const profileButtonRef = useRef(null)
  const popoverRef = useRef(null)
  const sideModalRef = useRef(null)

  const originalTitle = useRef(document.title)
  const originalFaviconHref = useRef(null)

  const feedType = useAppStore((state) => state.feedType)

  const { isTouchDevice, activeButtonId, handleTouchCancel, handleTouchEnd, handleTouchStart } =
    useTouchHoverEffect()

  const togglePopover = useCallback((e) => {
    e.stopPropagation()
    setShowPopover((prev) => !prev)
  }, [])

  const toggleSideModal = useCallback((e) => {
    e.stopPropagation()
    setShowSideModal((prev) => !prev)
  }, [])

  useEffect(() => {
    let faviconLink = document.querySelector('link[rel="icon"]')

    if (!originalFaviconHref.current) {
      if (faviconLink) {
        const a = document.createElement("a")
        a.href = faviconLink.getAttribute("href")
        originalFaviconHref.current = a.href
      } else {
        faviconLink = document.createElement("link")
        faviconLink.rel = "icon"
        document.head.appendChild(faviconLink)
        originalFaviconHref.current = "/klaynelogoreal.png"
      }
    }
  }, [])

  const isOnline = authUser.statusPreference === "online"

  const totalNotifications =
    unreadMessageCount +
    unreadNotificationsCount +
    unreadPublicChatCount +
    newPostCount +
    newVentPostCount

  useEffect(() => {
    const hasAnyNewNotification =
      unreadMessageCount > 0 ||
      unreadNotificationsCount > 0 ||
      unreadPublicChatCount > 0 ||
      newPostCount > 0 ||
      newVentPostCount > 0

    document.title = hasAnyNewNotification
      ? `(${totalNotifications}) ${originalTitle.current}`
      : originalTitle.current

    const faviconLink = document.querySelector('link[rel="icon"]')
    if (!faviconLink || !originalFaviconHref.current) return

    if (!hasAnyNewNotification) {
      faviconLink.href = originalFaviconHref.current
      return
    }

    const canvas = document.createElement("canvas")
    canvas.width = 32
    canvas.height = 32
    const ctx = canvas.getContext("2d")

    const img = new Image()
    img.crossOrigin = "anonymous"

    img.onload = () => {
      ctx.clearRect(0, 0, 32, 32)
      ctx.drawImage(img, 0, 0, 32, 32)

      const badgeSize = 10
      ctx.beginPath()
      ctx.arc(32 - badgeSize / 2, badgeSize / 2, badgeSize / 2, 0, Math.PI * 2)
      ctx.fillStyle = "red"
      ctx.fill()
      ctx.lineWidth = 1
      ctx.strokeStyle = "#000"
      ctx.stroke()

      faviconLink.href = canvas.toDataURL("image/png")
    }

    img.onerror = () => {
      ctx.clearRect(0, 0, 32, 32)
      ctx.beginPath()
      ctx.arc(24, 8, 5, 0, Math.PI * 2)
      ctx.fillStyle = "red"
      ctx.fill()
      faviconLink.href = canvas.toDataURL("image/png")
    }

    img.src = originalFaviconHref.current
    const originallTitleCurrent = originalTitle.current

    return () => {
      document.title = originallTitleCurrent
      if (faviconLink && originalFaviconHref.current) {
        faviconLink.href = originalFaviconHref.current
      }
    }
  }, [
    unreadMessageCount,
    unreadNotificationsCount,
    unreadPublicChatCount,
    newPostCount,
    newVentPostCount,
    totalNotifications,
  ])
  const handleMobileSearchClick = () => {
    navigate("/search")
  }

  const handleHomeClick = useCallback(() => {
    if (pathname === "/") {
      window.scrollTo({
        top: 0,
        behavior: pathname === "/" ? "smooth" : "instant",
      })
      return
    } else {
      navigate("/")
    }
    setShowNewFeedPostsButton(true)
  }, [setShowNewFeedPostsButton, navigate, pathname])

  const handleBookmarksClick = () => {
    if (pathname === "/bookmarks") return
    queryClient.invalidateQueries({ queryKey: postKeys.bookmarked() })
    navigate("/bookmarks")
  }

  const openFollowListModal = (type) => {
    const modalId =
      type === "following" ? `follow_modal_list_following` : `follow_modal_list_followers`

    const modalElement = document.getElementById(modalId)
    if (modalElement) {
      modalElement.showModal()
      if (type === "following") {
        setIsFollowingModalOpen(true)
      } else {
        setIsFollowersModalOpen(true)
      }
    }
  }

  const closeFollowListModal = (type) => {
    const modalId =
      type === "following" ? `follow_modal_list_following` : `follow_modal_list_followers`

    const modalElement = document.getElementById(modalId)
    if (modalElement) {
      modalElement.close()
      if (type === "following") {
        setIsFollowingModalOpen(false)
        setShowSideModal(true)
      } else {
        setIsFollowersModalOpen(false)
        setShowSideModal(true)
      }
    }
  }

  useEffect(() => {
    if (pathname === "/" || pathname === "/bookmarks") {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant",
      })
    }
  }, [pathname])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        profileButtonRef.current &&
        !profileButtonRef.current.contains(event.target) &&
        popoverRef.current &&
        !popoverRef.current.contains(event.target)
      ) {
        setShowPopover(false)
      }
    }

    if (showPopover) {
      document.addEventListener("mousedown", handleClickOutside)
    } else {
      document.removeEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showPopover])

  useEffect(() => {
    const handleClickOutsideSideModal = (event) => {
      if (
        showSideModal &&
        sideModalRef.current &&
        !sideModalRef.current.contains(event.target) &&
        !isFollowingModalOpen &&
        !isFollowersModalOpen
      ) {
        setShowSideModal(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutsideSideModal)

    return () => {
      document.removeEventListener("mousedown", handleClickOutsideSideModal)
    }
  }, [showSideModal, isFollowingModalOpen, isFollowersModalOpen])

  const handleLogout = (e) => {
    e.preventDefault()
    logout()
    setShowPopover(false)
    setShowSideModal(false)
  }

  const handleConfirmDeleteClick = () => {
    setShowPopover(false)
    setShowSideModal(false)
    setShowConfirmDeleteModal(true)
  }

  const handleDeleteAccount = async () => {
    if (authUser && authUser._id) {
      try {
        await deleteAccount({ userId: authUser._id })
      } catch (error) {
        console.error("Deletion failed:", error)
      }
    } else {
      showAppToast("User ID not available. Cannot proceed with deletion.", "error")
    }
  }

  const shouldAlwaysHide =
    pathname.includes("/public-chat") ||
    pathname.includes("/post/") ||
    isChatWindowOpen ||
    pathname.includes("/board/")

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerWidth < 768) {
        if (shouldAlwaysHide) {
          setIsMobileBarVisible(false)
          setIsFeatherIconVisible(false)
          lastScrollY.current = window.scrollY
          return
        }

        if (pathname.startsWith("/messages")) {
          setIsMobileBarVisible(true)
        } else {
          const currentScrollY = window.scrollY
          if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
            setIsMobileBarVisible(false)
            setIsFeatherIconVisible(false)
          } else if (currentScrollY < lastScrollY.current) {
            setIsMobileBarVisible(true)
            setIsFeatherIconVisible(true)
          }
          lastScrollY.current = currentScrollY
        }
      } else {
        setIsMobileBarVisible(true)
        setIsFeatherIconVisible(true)
      }
    }

    if (window.innerWidth < 768) {
      if (shouldAlwaysHide) {
        setIsMobileBarVisible(false)
        setIsFeatherIconVisible(false)
      } else {
        setIsMobileBarVisible(true)
        setIsFeatherIconVisible(true)
      }
    } else {
      setIsMobileBarVisible(true)
      setIsFeatherIconVisible(true)
    }

    window.addEventListener("scroll", handleScroll)
    window.addEventListener("resize", handleScroll)

    return () => {
      window.removeEventListener("scroll", handleScroll)
      window.removeEventListener("resize", handleScroll)
    }
  }, [isChatWindowOpen, pathname, shouldAlwaysHide])

  const shouldRenderMobileSidebar = !isChatWindowOpen || window.innerWidth >= 768

  const handlePublicChatClick = () => {
    if (pathname === "/public-chat") return
    navigate("/public-chat")
  }

  const { updateStatus, isUpdatingStatus } = useUpdateStatusPreference()

  const handleStatusChange = (status) => {
    updateStatus(status)
    if (socket) {
      socket.emit("changeOnlineStatus", { status })
    }
  }

  const handleClickProfile = () => {
    navigate(`/profile/${authUser.username}`)
    setShowPopover(false)
  }

  const iconWrapperStyle =
    "relative flex w-12 items-center justify-center rounded-full  py-2 transition duration-200 group-hover:bg-secondary md:group-hover:bg-transparent"
  const shouldCollapseSidebar =
    pathname.includes("/messages") || pathname.includes("/board") || pathname.includes("/wardrobe")

  if (!shouldRenderMobileSidebar) {
    return null
  }

  return (
    <>
      {
        <div
          className={`template fixed bottom-0 left-0 z-[10] flex w-full items-center justify-around border-t border-accent bg-base-100 pt-0.5 md:sticky md:top-0 md:z-0 md:h-dvh md:flex-col md:border-r md:border-t-0 ${
            shouldCollapseSidebar
              ? "md:max-w-[60px] md:flex-[0_0_auto] md:items-center" // Collapsed State
              : "md:max-w-[264px] md:flex-[2_2_0] md:items-start" // Expanded State
          } ${!isMobileBarVisible ? "translate-y-full md:translate-y-0" : ""}`}
        >
          <div
            className={
              `block md:hidden ${
                pathname.includes("/messages") ? "hidden" : ""
              } white-shadow fixed bottom-[73px] right-5 z-[50] size-[56px] transform cursor-pointer rounded-full bg-primary p-4 text-white transition-all duration-300 ease-in-out hover:bg-opacity-85 ${isFeatherIconVisible ? "scale-100 opacity-100" : "scale-0 opacity-0"}` // <-- ADD THESE CLASSES
            }
            onClick={onOpenCreatePostModal}
          >
            <FeatherIcon />
          </div>
          <div
            to="/"
            onClick={handleHomeClick}
            className={`hidden h-12 w-auto cursor-pointer justify-start rounded-full fill-primary p-1.5 ${shouldCollapseSidebar ? "mr-1" : ""} hover:bg-secondary md:flex ${
              isTouchDevice && activeButtonId === "k-logo"
                ? "bg-secondary bg-opacity-50 transition duration-150"
                : ""
            }`}
            onTouchStart={() => handleTouchStart("k-logo")}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchCancel}
          >
            <img
              src={klayneLogo}
              className={`rounded-lg p-0.5 ${getKlayneColor(theme)}`}
              loading="lazy"
            />
          </div>

          <ul
            className={`mt-0 flex w-full flex-row justify-around md:flex-col md:justify-start md:gap-1 ${shouldCollapseSidebar ? "md:mt-3 lg:gap-3" : "md:mt-2 lg:gap-1"}`}
          >
            {/* HOME */}
            <li
              onClick={handleHomeClick}
              className={`group flex cursor-pointer items-center justify-center rounded-full ${shouldCollapseSidebar && !isMobile ? "" : "py-1 pr-1 md:pr-8"} transition duration-200 md:w-fit md:justify-start md:hover:bg-secondary`}
            >
              {/* FIXED WIDTH ICON WRAPPER (This ensures vertical alignment) */}
              <div className={iconWrapperStyle}>
                {pathname === "/" ? (
                  <GoHomeFill className="size-[30px]" />
                ) : (
                  <GoHome className="size-[30px]" />
                )}
                {((feedType === "forYou" && newPostCount > 0) ||
                  (feedType === "venting" && newVentPostCount > 0)) && (
                  <div
                    className="absolute right-2 top-2 h-3 w-3 rounded-full border-2 border-black bg-primary"
                    style={{ transform: "translate(25%, -25%)" }}
                  />
                )}
              </div>
              {!shouldCollapseSidebar && (
                <span
                  className={`ml-2.5 hidden text-lg md:block ${pathname === "/" ? "font-bold" : ""}`}
                >
                  Home
                </span>
              )}
            </li>

            {/* MESSAGES */}
            <li
              onClick={() => pathname !== "/messages" && navigate("/messages")}
              className={`group flex cursor-pointer items-center justify-center rounded-full ${shouldCollapseSidebar && !isMobile ? "" : "py-1 pr-1 md:pr-8"} transition duration-200 md:w-fit md:justify-start md:hover:bg-secondary`}
            >
              <div className={iconWrapperStyle}>
                {pathname.startsWith("/messages") ? (
                  <TbMailFilled className="size-7" />
                ) : (
                  <CiMail className="size-7" strokeWidth={0.5} />
                )}
                {unreadMessageCount > 0 && (
                  <div
                    className={`absolute right-2 top-2 z-10 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full border-2 border-black bg-primary px-1 text-[11px] font-bold ${shouldTextBeWhite(theme)}`}
                    style={{ transform: "translate(40%, -40%)" }}
                  >
                    {formatCount(unreadMessageCount)}
                  </div>
                )}
              </div>
              {!shouldCollapseSidebar && (
                <span
                  className={`ml-2.5 hidden text-lg md:block ${pathname.startsWith("/messages") ? "font-bold" : ""}`}
                >
                  Messages
                </span>
              )}
            </li>

            {/* NOTIFICATIONS */}
            <li
              onClick={() => pathname !== "/notifications" && navigate("/notifications")}
              className={`group flex cursor-pointer items-center justify-center rounded-full ${shouldCollapseSidebar && !isMobile ? "" : "py-1 pr-1 md:pr-8"} transition duration-200 md:w-fit md:justify-start md:hover:bg-secondary`}
            >
              <div className={iconWrapperStyle}>
                {pathname === "/notifications" ? (
                  <GoBellFill className="size-7" />
                ) : (
                  <GoBell className="size-7" />
                )}
                {unreadNotificationsCount > 0 && (
                  <div
                    className={`absolute right-2 top-2 z-10 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full border-2 border-black bg-primary px-1 text-[11px] font-bold ${shouldTextBeWhite(theme)}`}
                    style={{ transform: "translate(40%, -40%)" }}
                  >
                    {formatCount(unreadNotificationsCount)}
                  </div>
                )}
              </div>
              {!shouldCollapseSidebar && (
                <span
                  className={`ml-2.5 hidden text-lg md:block ${pathname === "/notifications" ? "font-bold" : ""}`}
                >
                  Notifications
                </span>
              )}
            </li>

            {/* PUBLIC CHAT */}
            <li
              onClick={handlePublicChatClick}
              className={`group flex cursor-pointer items-center justify-center rounded-full ${shouldCollapseSidebar && !isMobile ? "" : "py-1 pr-1 md:pr-8"} transition duration-200 md:w-fit md:justify-start md:hover:bg-secondary`}
            >
              <div className={iconWrapperStyle}>
                {pathname === "/public-chat" ? (
                  <IoChatbubbles className="size-7" />
                ) : (
                  <IoChatbubblesOutline className="size-7" />
                )}
                {unreadPublicChatCount > 0 && (
                  <div
                    className={`absolute right-2 top-2 z-10 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full border-2 border-black bg-primary px-1 text-[11px] font-bold ${shouldTextBeWhite(theme)}`}
                    style={{ transform: "translate(40%, -40%)" }}
                  >
                    {formatCount(unreadPublicChatCount)}
                  </div>
                )}
              </div>
              {!shouldCollapseSidebar && (
                <span
                  className={`ml-2.5 hidden text-lg md:block ${pathname === "/public-chat" ? "font-bold" : ""}`}
                >
                  Public Chat
                </span>
              )}
            </li>

            <li
              onClick={() => navigate("/board")}
              className={`hidden cursor-pointer items-center justify-start rounded-full ${shouldCollapseSidebar && !isMobile ? "" : "py-1 pr-1 md:pr-8"} transition duration-200 md:flex md:w-fit md:hover:bg-secondary`}
            >
              <div className={iconWrapperStyle}>
                {pathname === "/board" ? (
                  <PiSquaresFourFill className="size-8" />
                ) : (
                  <PiSquaresFourLight className="size-8" />
                )}
                {showNewBoardPostsButton && newBoardPostCount > 0 && (
                  <div
                    className="absolute right-2 top-2 z-10 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full border-2 border-black bg-primary px-1 text-[11px] font-bold text-white"
                    style={{ transform: "translate(40%, -40%)" }}
                  >
                    {formatCount(newBoardPostCount)}
                  </div>
                )}
              </div>
              {!shouldCollapseSidebar && (
                <span
                  className={`ml-2.5 hidden text-lg md:block ${pathname === "/board" ? "font-bold" : ""}`}
                >
                  Board
                </span>
              )}
            </li>

            {/* SEARCH (Mobile Only) */}
            <li
              onClick={handleMobileSearchClick}
              className="flex cursor-pointer items-center justify-center lg:hidden"
            >
              <div className="flex items-center justify-center rounded-full p-2 transition duration-200 hover:bg-secondary">
                <CiSearch className="size-7" strokeWidth={pathname === "/search" ? 1.5 : 0.5} />
              </div>
            </li>

            {/* BOOKMARKS */}
            <li
              onClick={handleBookmarksClick}
              className={`hidden cursor-pointer items-center justify-start rounded-full ${shouldCollapseSidebar && !isMobile ? "" : "py-1 pr-1 md:pr-8"} transition duration-200 md:flex md:w-fit md:hover:bg-secondary`}
            >
              <div className={iconWrapperStyle}>
                {pathname === "/bookmarks" ? (
                  <IoBookmark className="size-7" />
                ) : (
                  <IoBookmarkOutline className="size-7" />
                )}
              </div>
              {!shouldCollapseSidebar && (
                <span
                  className={`ml-2.5 hidden text-lg md:block ${pathname === "/bookmarks" ? "font-bold" : ""}`}
                >
                  Bookmarks
                </span>
              )}
            </li>

            {/* POMODORO */}
            <li
              onClick={() => navigate("/pomodoro")}
              className={`hidden cursor-pointer items-center justify-start rounded-full ${shouldCollapseSidebar && !isMobile ? "" : "py-1 pr-1 md:pr-8"} transition duration-200 md:flex md:w-fit md:hover:bg-secondary`}
            >
              <div className={iconWrapperStyle}>
                <IoIosTimer className="size-7" strokeWidth={pathname === "/pomodoro" ? 0.5 : 0} />
              </div>
              {!shouldCollapseSidebar && (
                <span
                  className={`ml-2.5 hidden text-lg md:block ${pathname === "/pomodoro" ? "font-bold" : ""}`}
                >
                  Pomodoro
                </span>
              )}
            </li>

            {/* TODOS */}
            <li
              onClick={() => navigate("/todos")}
              className={`hidden cursor-pointer items-center justify-start rounded-full ${shouldCollapseSidebar && !isMobile ? "" : "py-1 pr-1 md:pr-8"} transition duration-200 md:flex md:w-fit md:hover:bg-secondary`}
            >
              <div className={iconWrapperStyle}>
                <LuListTodo className="size-7" />
              </div>
              {!shouldCollapseSidebar && (
                <span
                  className={`ml-2.5 hidden text-lg md:block ${pathname === "/todos" ? "font-bold" : ""}`}
                >
                  Todos
                </span>
              )}
            </li>

            {/* MOBILE PROFILE */}
            <li className="flex cursor-pointer items-center justify-center p-1 md:hidden">
              <button
                onClick={toggleSideModal}
                className="rounded-full p-1 transition duration-200 hover:bg-secondary"
              >
                <img
                  src={getOptimizedImageUrl(
                    authUser?.profileImg?.imageUrl || "/avatar-placeholder.png",
                    "avatar",
                  )}
                  className="size-7 rounded-full object-cover"
                  alt="User Profile"
                />
              </button>
            </li>

            {/* DESKTOP PROFILE */}
            <li
              onClick={() =>
                pathname !== `/profile/${authUser?.username}` &&
                navigate(`/profile/${authUser?.username}`)
              }
              className={`hidden cursor-pointer items-center justify-center rounded-full ${shouldCollapseSidebar && !isMobile ? "" : "py-1 pr-1 md:pr-8"} transition duration-200 md:flex md:w-fit md:justify-start md:hover:bg-secondary`}
            >
              <div className={iconWrapperStyle}>
                {pathname === `/profile/${authUser?.username}` ? (
                  <TbUserFilled className="size-8" />
                ) : (
                  <TbUser className="size-8" />
                )}
              </div>
              {!shouldCollapseSidebar && (
                <span
                  className={`ml-2.5 hidden text-lg md:block ${pathname === `/profile/${authUser?.username}` ? "font-bold" : ""}`}
                >
                  Profile
                </span>
              )}
            </li>

            <li
              ref={moreButtonRef}
              onClick={() => setShowMorePopover(!showMorePopover)}
              className={`relative hidden cursor-pointer items-center justify-start rounded-full ${shouldCollapseSidebar && !isMobile ? "" : "py-1 pr-1 md:pr-8"} transition duration-200 md:flex md:w-fit md:hover:bg-secondary`}
            >
              <div className={iconWrapperStyle}>
                <HiOutlineEllipsisHorizontalCircle className="size-7" />
              </div>
              {!shouldCollapseSidebar && (
                <span className="ml-2.5 hidden text-lg md:block">More</span>
              )}

              {/* MORE POPOVER */}
              {showMorePopover && (
                <>
                  <div
                    className="fixed inset-0 z-[60] cursor-default"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowMorePopover(false)
                    }}
                  />
                  <div
                    style={{
                      animation: "fadeInSlideDown 0.2s ease-out forwards",
                    }}
                    className={`white-shadow absolute bottom-full z-[70] mb-2 w-56 overflow-hidden rounded-2xl border border-accent bg-base-100 py-2 shadow-2xl ${shouldCollapseSidebar ? "-translate-x-[80%]" : "left-0"}`}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate("/devlog")
                        setShowMorePopover(false)
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left font-semibold transition hover:bg-secondary"
                    >
                      <MdOutlineLibraryBooks className="size-6" />
                      <span>Devlog</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate("/wardrobe")
                        setShowMorePopover(false)
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left font-semibold transition hover:bg-secondary"
                    >
                      <PiCoatHangerBold className="size-6" />
                      <span>Wardrobe</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate("/themes")
                        setShowMorePopover(false)
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left font-semibold transition hover:bg-secondary"
                    >
                      <HiOutlinePaintBrush className="size-6" />
                      <span>Themes</span>
                    </button>
                  </div>
                </>
              )}
            </li>

            {/* POST BUTTON */}
            {shouldCollapseSidebar && !isMobile ? (
              <div
                className={
                  `z-[50] mt-4 size-[50px] cursor-pointer rounded-full bg-primary p-3 ${shouldTextBeWhite(theme)} hover:bg-opacity-85` // <-- ADD THESE CLASSES
                }
                onClick={onOpenCreatePostModal}
              >
                <FeatherIcon />
              </div>
            ) : (
              <div className="mt-5 hidden w-full pr-6 md:block">
                <button
                  className={`w-full cursor-pointer rounded-full bg-primary py-3 font-bold shadow-lg transition duration-200 hover:bg-primary/90 active:scale-95 ${shouldTextBeWhite(theme)}`}
                  onClick={onOpenCreatePostModal}
                >
                  Post
                </button>
              </div>
            )}
          </ul>

          {/* User Profile and Popover (Desktop only) */}
          {authUser && (
            <div className="relative mb-3 mt-auto hidden w-full items-center justify-start md:flex">
              <button
                ref={profileButtonRef}
                onClick={togglePopover}
                className={`mr-2 flex w-full min-w-0 items-center gap-2 rounded-full px-2 py-2 duration-300 hover:bg-secondary ${
                  isTouchDevice && activeButtonId === "user-profile-button"
                    ? "bg-secondary bg-opacity-50 transition duration-150"
                    : "transition duration-150"
                }`}
                onTouchStart={() => handleTouchStart("user-profile-button")}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchCancel}
              >
                {/* Avatar: Removed justify-center */}
                <div className="relative flex shrink-0">
                  <div className="rounded-full">
                    <UserAvatar user={authUser} size={"sm"} />
                  </div>
                  {isOnline ? (
                    <span className="absolute bottom-0 right-0 z-50 h-3 w-3 rounded-full border-2 border-base-100 bg-green-500"></span>
                  ) : (
                    <span className="absolute bottom-0 right-0 z-50 h-3 w-3 rounded-full border-2 border-base-100 bg-gray-500"></span>
                  )}
                </div>

                {!shouldCollapseSidebar && (
                  <div className="flex min-w-0 flex-1 items-center justify-between">
                    {/* Changed items-center to items-start to align text to the left */}
                    <div className="flex min-w-0 flex-col items-start overflow-hidden">
                      <p
                        className="w-full truncate text-start text-sm font-bold"
                        style={authUser.nameColor ? { color: authUser.nameColor } : undefined}
                      >
                        {authUser?.fullName}
                      </p>
                      <p className="w-full truncate text-start text-sm text-slate-500">
                        @{authUser?.username}
                      </p>
                    </div>
                    <BsThreeDots className="ml-2 h-5 w-5 shrink-0 cursor-pointer text-slate-400 transition-colors hover:text-white" />
                  </div>
                )}
              </button>

              {showPopover && (
                <div>
                  <div
                    className="fixed inset-0 z-50 h-screen w-screen cursor-default bg-transparent"
                    onClick={() => setShowPopover(false)}
                  />

                  {/* Popover Container */}
                  <div
                    ref={popoverRef}
                    className={`white-shadow absolute bottom-full left-1/2 z-[1001] mb-2 flex min-w-[250px] max-w-[250px] flex-col gap-1 rounded-2xl border border-accent bg-base-100 pb-3 shadow-xl ${shouldCollapseSidebar ? "-translate-x-[90%]" : "-translate-x-1/2"} /* Animation Classes */ animate-in fade-in slide-in-from-top-2 duration-200 ease-out`}
                    style={{
                      animation: "fadeInSlideDown 0.2s ease-out forwards",
                    }}
                  >
                    {/* Mini-Profile Section */}
                    <div className="flex flex-col pb-2">
                      <div className="relative mb-2 cursor-pointer" onClick={handleClickProfile}>
                        <img
                          src={getOptimizedImageUrl(
                            authUser?.coverImg?.imageUrl || "/cover.png",
                            "cover",
                          )}
                          alt="User cover"
                          className="h-16 w-full rounded-t-xl object-cover"
                        />
                        <img
                          src={getOptimizedImageUrl(
                            authUser?.profileImg?.imageUrl || "/avatar-placeholder.png",
                            "avatar",
                          )}
                          alt="User profile"
                          className="absolute -bottom-6 left-2 size-12 rounded-full border-2 border-base-100 object-cover"
                        />
                        <span
                          className={`absolute -bottom-6 left-10 size-[14px] rounded-full border-2 border-base-100 ${
                            isOnline ? "bg-green-500" : "bg-gray-500"
                          }`}
                        ></span>
                      </div>

                      {/* Name Section - Enforced Truncation */}
                      <div className="mt-4 flex w-full flex-col items-start overflow-hidden px-3">
                        <span
                          className="w-full truncate text-sm font-bold text-white"
                          style={authUser.nameColor ? { color: authUser.nameColor } : undefined}
                        >
                          {authUser?.fullName}
                        </span>
                        <span className="mb-1 w-full truncate text-xs text-gray-500">
                          @{authUser?.username}
                        </span>
                        <div className="flex gap-2 text-xs text-gray-400">
                          <span>
                            <span className="font-semibold text-white">
                              {authUser?.following?.length}
                            </span>{" "}
                            Following
                          </span>
                          <span>
                            <span className="font-semibold text-white">
                              {authUser?.followers?.length}
                            </span>{" "}
                            Followers
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="h-[1px] w-full bg-accent"></div>

                    {/* Status Options Section */}
                    <div className="flex flex-col gap-1 px-3 py-2">
                      <span className="px-1 text-xs font-bold text-gray-400">Set Status</span>
                      <button
                        onClick={() => handleStatusChange("online")}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left font-semibold transition hover:bg-gray-700/30 disabled:cursor-wait"
                        disabled={isUpdatingStatus}
                      >
                        <span className="size-[14px] shrink-0 rounded-full border-2 border-base-100 bg-green-500"></span>
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-sm">Online</span>
                          <span className="truncate text-xs text-gray-500">
                            You will appear online
                          </span>
                        </div>
                      </button>
                      <button
                        onClick={() => handleStatusChange("offline")}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left font-semibold transition hover:bg-gray-700/30 disabled:cursor-wait"
                        disabled={isUpdatingStatus}
                      >
                        <span className="size-[14px] shrink-0 rounded-full border-2 border-base-100 bg-gray-500"></span>
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-sm">Offline</span>
                          <span className="truncate text-xs text-gray-500">
                            You will appear offline
                          </span>
                        </div>
                      </button>
                    </div>

                    <div className="h-[1px] w-full bg-accent"></div>

                    {/* Action Buttons */}
                    <button
                      onClick={handleConfirmDeleteClick}
                      className="flex w-full items-center px-3 py-2.5 text-left font-bold text-red-500 transition hover:bg-secondary/20"
                    >
                      <TbUserX className="mr-3 size-5 shrink-0" />
                      <span className="text-sm">Delete Account</span>
                    </button>

                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center px-3 py-2.5 text-left font-bold transition hover:bg-secondary/20"
                    >
                      <BiLogOut className="mr-3 size-5 shrink-0" />
                      <span className="min-w-0 truncate text-sm">Logout @{authUser?.username}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      }

      {
        <MobileSideModal
          showSideModal={showSideModal}
          sideModalRef={sideModalRef}
          openFollowListModal={openFollowListModal}
          setShowSideModal={setShowSideModal}
          installApp={installApp}
          isInstalled={isInstalled}
          deferredPrompt={deferredPrompt}
          handleLogout={handleLogout}
          handleConfirmDeleteClick={handleConfirmDeleteClick}
          isIOSDevice={isIOSDevice}
        />
      }

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
          className="fixed inset-0 z-[999] bg-black bg-opacity-75 md:hidden"
          onClick={() => setShowSideModal(false)}
        ></div>
      )}

      <ConfirmationModal
        modalTitle="Confirm Account Deletion"
        isOpen={showConfirmDeleteModal}
        onClose={() => setShowConfirmDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        message="This action is irreversible. Please enter your password to confirm."
        danger={true}
        confirmButtonText={isDeletingAccount ? "Deleting..." : "Yes, Delete Account"}
        isLoading={isDeletingAccount}
      ></ConfirmationModal>
    </>
  )
}
export default React.memo(Sidebar)
