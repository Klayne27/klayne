import { useLocation, useNavigate } from "react-router-dom"
import { useAuthUser } from "../../features/auth/authHooks/useAuthUser"
import { useLogout } from "../../features/auth/authHooks/useLogout"
import { CiMail, CiSearch } from "react-icons/ci"
import { useState, useRef, useEffect, useCallback } from "react"
import { useDeleteAccount } from "../../features/users/usersHooks/useDeleteAccount"
import { useSocket } from "../../context/SocketContext"
import { useQueryClient } from "@tanstack/react-query"
import { BiLogOut } from "react-icons/bi"
import FollowListModal from "./FollowListModal"
import React from "react"
import { showAppToast } from "../../utils/showAppToast"
import { BsChatDots, BsChatDotsFill, BsThreeDots } from "react-icons/bs"
import ConfirmationModal from "./ConfirmationModal"
import FeatherIcon from "../svgs/FeatherIcon"
import { useAppStore } from "../../store/useAppStore"
import { useTouchHoverEffect } from "../../hooks/customHooks/useTouchHoverEffect"
import { formatCount } from "../../utils/textUtils"
import MobileSideModal from "./MobileSideModal"
import { postKeys } from "../../features/posts/postsHooks/postKeys"
import { TbMailFilled, TbUser, TbUserFilled, TbUserX } from "react-icons/tb"
import { GoBell, GoBellFill, GoHome, GoHomeFill } from "react-icons/go"
import { IoBookmark, IoBookmarkOutline } from "react-icons/io5"
import { HiPaintBrush, HiOutlinePaintBrush } from "react-icons/hi2"
import { useUpdateStatusPreference } from "../../features/users/usersHooks/useUpdateStatusPreference"
import klayneLogo from "/klaynelogo2.png"

import { MdLibraryBooks, MdOutlineLibraryBooks } from "react-icons/md"
import { IoIosTimer } from "react-icons/io"
import { LuListTodo } from "react-icons/lu"
import { getOptimizedImageUrl } from "../../utils/cloudinaryUtils"

const Sidebar = ({
  onOpenCreatePostModal,
  installApp,
  isInstalled,
  deferredPrompt,
  isIOSDevice,
}) => {
  const { authUser } = useAuthUser()
  const isChatWindowOpen = useAppStore((state) => state.isChatWindowOpen)
  const {
    setShowNewFeedPostsButton,
    unreadNotificationsCount,
    unreadMessageCount,
    unreadPublicChatCount,
    newPostCount,
    newVentPostCount,
  } = useSocket()

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
      type === "following"
        ? `follow_modal_list_following`
        : `follow_modal_list_followers`

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
    isChatWindowOpen

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

  const { socket } = useSocket()
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

  if (!shouldRenderMobileSidebar) {
    return null
  }

  return (
    <>
      {
        <div
          className={`template fixed bottom-0 left-0 z-[10] flex w-full items-center justify-around border-t border-accent bg-base-100 pt-1 transition-transform duration-300 ease-out md:sticky md:top-0 md:z-0 md:h-dvh md:max-w-[264px] md:flex-[2_2_0] md:flex-col md:items-start md:justify-start md:border-r md:border-t-0 ${!isMobileBarVisible ? "translate-y-full" : ""}`}
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
            className={`hidden h-12 w-auto cursor-pointer justify-start rounded-full fill-primary p-2 duration-200 hover:bg-secondary md:flex ${
              isTouchDevice && activeButtonId === "k-logo"
                ? "bg-secondary bg-opacity-50 transition duration-150"
                : ""
            }`}
            onTouchStart={() => handleTouchStart("k-logo")}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchCancel}
          >
            <img src={klayneLogo} className="rounded-lg bg-gray-950" loading="lazy" />
          </div>

          <ul className="mt-0 flex w-full flex-row justify-around md:mt-4 md:flex-col md:justify-start md:gap-3">
            <li
              onClick={() => {
                handleHomeClick()
              }}
              className="flex cursor-pointer items-center justify-center rounded-full p-1 transition duration-200 md:w-[125px] md:justify-start md:p-0 md:hover:bg-secondary"
            >
              <button
                className={`relative flex max-w-fit cursor-pointer items-center rounded-full px-2 py-2 pl-[9px] pr-[7px] transition duration-200 ${!isTouchDevice ? "hover:bg-secondary md:hover:bg-transparent" : ""} ${
                  isTouchDevice && activeButtonId === "home" ? "bg-secondary bg-opacity-80" : ""
                }`}
                onTouchStart={() => handleTouchStart("home")}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchCancel}
              >
                {pathname === "/" ? (
                  <GoHomeFill className={`size-[30px]`} />
                ) : (
                  <GoHome className={`size-[30px]`} />
                )}
                {feedType === "forYou" && newPostCount > 0 && (
                  <div
                    className="absolute right-2.5 top-3 h-3 w-3 rounded-full border-2 border-black bg-primary"
                    style={{ transform: "translate(50%, -50%)" }}
                  ></div>
                )}
                {feedType === "venting" && newVentPostCount > 0 && (
                  <div
                    className="absolute right-2.5 top-3 h-3 w-3 rounded-full border-2 border-black bg-primary"
                    style={{ transform: "translate(50%, -50%)" }}
                  ></div>
                )}
              </button>
              <span
                className={`ml-3 hidden text-lg md:block ${
                  pathname === "/" ? "font-bold text-opacity-100" : ""
                }`}
              >
                Home
              </span>
            </li>

            <li
              onClick={() => {
                if (pathname === "/messages") return
                navigate("/messages")
              }}
              className="flex cursor-pointer items-center justify-center rounded-full p-1 transition duration-200 md:w-[160px] md:justify-start md:p-0 md:hover:bg-secondary"
            >
              <button
                className={`relative flex max-w-fit cursor-pointer items-center justify-center gap-3 rounded-full px-2 py-2 pl-2.5 transition duration-200 ${!isTouchDevice ? "hover:bg-secondary md:hover:bg-transparent" : ""} ${
                  isTouchDevice && activeButtonId === "messages" ? "bg-secondary bg-opacity-80" : ""
                }`}
                onTouchStart={() => handleTouchStart("messages")}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchCancel}
              >
                {pathname.startsWith("/messages") ? (
                  <TbMailFilled className={`size-7`} />
                ) : (
                  <CiMail className={`size-7`} strokeWidth={0.5} />
                )}
                {unreadMessageCount > 0 && (
                  <div
                    className="absolute right-2.5 top-3 z-10 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full border-2 border-black bg-primary px-1 text-[11px] font-bold text-white" // Adjusted for Tailwind's direct utility classes
                    style={{ transform: "translate(50%, -50%)" }}
                  >
                    {formatCount(unreadMessageCount)}
                  </div>
                )}
              </button>
              <span
                className={`ml-3 hidden text-lg md:block ${
                  pathname.startsWith("/messages") ? "font-bold text-opacity-100" : ""
                }`}
              >
                Messages
              </span>
            </li>

            <li
              onClick={() => {
                if (pathname === "/notifications") return
                navigate("/notifications")
              }}
              className="flex cursor-pointer items-center justify-center rounded-full p-1 transition duration-200 md:w-[190px] md:justify-start md:p-0 md:hover:bg-secondary"
            >
              <button
                className={`relative flex max-w-fit cursor-pointer items-center gap-3 rounded-full px-2 py-2 pl-2.5 transition duration-200 ${!isTouchDevice ? "hover:bg-secondary md:hover:bg-transparent" : ""} ${
                  isTouchDevice && activeButtonId === "notifications"
                    ? "bg-secondary bg-opacity-80"
                    : ""
                }`}
                onTouchStart={() => handleTouchStart("notifications")}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchCancel}
              >
                {pathname === "/notifications" ? (
                  <GoBellFill className={`size-7`} />
                ) : (
                  <GoBell className={`size-7`} />
                )}
                {unreadNotificationsCount > 0 && (
                  <div
                    className="absolute right-2.5 top-3 z-10 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full border-2 border-black bg-primary px-1 text-[11px] font-bold text-white"
                    style={{ transform: "translate(50%, -50%)" }}
                  >
                    {formatCount(unreadNotificationsCount)}
                  </div>
                )}
              </button>
              <span
                className={`ml-3 hidden text-lg md:block ${
                  pathname === "/notifications" ? "font-bold text-opacity-100" : ""
                }`}
              >
                Notifications
              </span>
            </li>

            <li
              onClick={handlePublicChatClick}
              className="flex cursor-pointer items-center justify-center rounded-full p-1 transition duration-200 md:w-[175px] md:justify-start md:p-0 md:hover:bg-secondary"
            >
              <button
                className={`relative flex max-w-fit cursor-pointer items-center justify-center gap-3 rounded-full px-2 py-2.5 pl-2.5 transition duration-200 ${!isTouchDevice ? "hover:bg-secondary md:hover:bg-transparent" : ""} ${
                  isTouchDevice && activeButtonId === "public-chat"
                    ? "bg-secondary bg-opacity-80"
                    : ""
                }`}
                onTouchStart={() => handleTouchStart("public-chat")}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchCancel}
              >
                {pathname === "/public-chat" ? (
                  <BsChatDotsFill className={`ml-0.5 mr-0.5 size-6`} />
                ) : (
                  <BsChatDots className={`ml-0.5 mr-0.5 size-6`} />
                )}
                {/* Red dot for new public chat messages */}
                {unreadPublicChatCount > 0 && (
                  <div
                    className="absolute right-2.5 top-3 z-10 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full border-2 border-black bg-primary px-1 text-[11px] font-bold text-white" // Adjusted for Tailwind's direct utility classes
                    style={{ transform: "translate(50%, -50%)" }}
                  >
                    {formatCount(unreadPublicChatCount)}
                  </div>
                )}
              </button>
              <span
                className={`ml-3 hidden text-lg md:block ${
                  pathname === "/public-chat" ? "font-bold text-opacity-100" : ""
                }`}
              >
                Public Chat
              </span>
            </li>

            {/* Search (Mobile Only) */}
            <li
              className="flex cursor-pointer items-center justify-start lg:hidden"
              onClick={handleMobileSearchClick}
            >
              <button
                className={` ${
                  pathname === "/search" ? "font-bold text-opacity-100" : ""
                } flex max-w-fit cursor-pointer items-center gap-3 rounded-full px-[1px] py-2 transition duration-200 ${!isTouchDevice ? "hover:bg-secondary md:hover:bg-transparent" : ""} ${
                  isTouchDevice && activeButtonId === "search" ? "bg-secondary bg-opacity-80" : ""
                }`}
                onTouchStart={() => handleTouchStart("search")}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchCancel}
              >
                <CiSearch
                  className="size-7 w-11"
                  strokeWidth={pathname === "/search" ? 1.5 : 0.5}
                />
              </button>
              <span
                className={`ml-3 hidden text-lg md:block ${
                  pathname === "/search" ? "font-bold text-opacity-100" : ""
                }`}
              >
                Search
              </span>
            </li>

            {/* Bookmarks - Hidden on mobile, visible on desktop */}
            <li
              className="hidden cursor-pointer items-center justify-start rounded-full p-1 transition duration-200 md:flex md:w-[175px] md:p-0 md:hover:bg-secondary"
              onClick={handleBookmarksClick}
            >
              <button
                className={`${
                  pathname === "/bookmarks" ? "font-bold text-opacity-100" : ""
                } flex w-full max-w-fit cursor-pointer items-center gap-3 rounded-full px-2 py-2 pl-2.5 transition duration-200 ${!isTouchDevice ? "hover:bg-secondary md:hover:bg-transparent" : ""} ${
                  isTouchDevice && activeButtonId === "bookmarks"
                    ? "bg-secondary bg-opacity-80"
                    : ""
                }`}
                onTouchStart={() => handleTouchStart("bookmarks")}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchCancel}
              >
                {pathname === "/bookmarks" ? (
                  <IoBookmark className="size-7" />
                ) : (
                  <IoBookmarkOutline className="size-7" strokeWidth={0.5} />
                )}
              </button>
              <span
                className={`ml-3 hidden text-lg md:block ${
                  pathname === "/bookmarks" ? "font-bold text-opacity-100" : ""
                }`}
              >
                Bookmarks
              </span>
            </li>

            <li
              className="hidden cursor-pointer items-center justify-start rounded-full transition duration-200 md:flex md:w-[165px] md:p-0 md:hover:bg-secondary"
              onClick={() => navigate("/pomodoro")}
            >
              <button
                className={`${
                  pathname === "/pomodoro" ? "font-bold text-opacity-100" : ""
                } flex w-full max-w-fit cursor-pointer items-center gap-3 rounded-full px-2 py-2 pl-2.5 transition duration-200 ${!isTouchDevice ? "hover:bg-secondary md:hover:bg-transparent" : ""} ${
                  isTouchDevice && activeButtonId === "pomodoro" ? "bg-secondary bg-opacity-80" : ""
                }`}
                onTouchStart={() => handleTouchStart("pomodoro")}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchCancel}
              >
                <IoIosTimer className="size-7" strokeWidth={pathname === "/pomodoro" ? 2.5 : 2} />
              </button>
              <span
                className={`text-lg ml-3${
                  pathname === "/pomodoro" ? "font-bold text-opacity-100" : ""
                }`}
              >
                Pomodoro
              </span>
            </li>
            <li
              className="hidden cursor-pointer items-center justify-start rounded-full transition duration-200 md:flex md:w-[125px] md:p-0 md:hover:bg-secondary"
              onClick={() => navigate("/todos")}
            >
              <button
                className={`${
                  pathname === "/todos" ? "font-bold text-opacity-100" : ""
                } flex w-full max-w-fit cursor-pointer items-center gap-3 rounded-full px-2 py-2 pl-2.5 transition duration-200 ${!isTouchDevice ? "hover:bg-secondary md:hover:bg-transparent" : ""} ${
                  isTouchDevice && activeButtonId === "todos" ? "bg-secondary bg-opacity-80" : ""
                }`}
                onTouchStart={() => handleTouchStart("todos")}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchCancel}
              >
                <LuListTodo className="size-7" strokeWidth={pathname === "/todos" ? 2.5 : 2} />
              </button>
              <span
                className={`text-lg ml-3${pathname === "/todos" ? "font-bold text-opacity-100" : ""}`}
              >
                Todos
              </span>
            </li>
            {/* Themes */}
            <li
              className="hidden cursor-pointer items-center justify-start rounded-full transition duration-200 md:flex md:w-[140px] md:p-0 md:hover:bg-secondary"
              onClick={() => navigate("/themes")}
            >
              <button
                className={`${
                  pathname === "/themes" ? "font-bold text-opacity-100" : ""
                } flex w-full max-w-fit cursor-pointer items-center gap-3 rounded-full px-2 py-2 pl-2.5 transition duration-200 ${!isTouchDevice ? "hover:bg-secondary md:hover:bg-transparent" : ""} ${
                  isTouchDevice && activeButtonId === "themes" ? "bg-secondary bg-opacity-80" : ""
                }`}
                onTouchStart={() => handleTouchStart("themes")}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchCancel}
              >
                {pathname === "/themes" ? (
                  <HiPaintBrush className="size-7" />
                ) : (
                  <HiOutlinePaintBrush className="size-7" />
                )}
              </button>
              <span
                className={`ml-3 text-lg ${pathname === "/themes" ? "font-bold text-opacity-100" : ""}`}
              >
                Themes
              </span>
            </li>
            <li
              className="hidden cursor-pointer items-center justify-start rounded-full transition duration-200 md:flex md:w-[135px] md:p-0 md:hover:bg-secondary"
              onClick={() => navigate("/devlog")}
            >
              <button
                className={`${
                  pathname === "/devlog" ? "font-bold text-opacity-100" : ""
                } flex w-full max-w-fit cursor-pointer items-center gap-3 rounded-full px-2 py-2 pl-2.5 transition duration-200 ${!isTouchDevice ? "hover:bg-secondary md:hover:bg-transparent" : ""} ${
                  isTouchDevice && activeButtonId === "devlog" ? "bg-secondary bg-opacity-80" : ""
                }`}
                onTouchStart={() => handleTouchStart("devlog")}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchCancel}
              >
                {pathname === "/devlog" ? (
                  <MdLibraryBooks className="size-7" />
                ) : (
                  <MdOutlineLibraryBooks className="size-7" />
                )}
              </button>
              <span
                className={`ml-3 text-lg ${pathname === "/devlog" ? "font-bold text-opacity-100" : ""}`}
              >
                Devlog
              </span>
            </li>

            {/* Mobile Profile Image (to open side modal) */}
            <li className="flex cursor-pointer items-center justify-center px-[7px] py-1 md:hidden">
              <button
                id="mobile-profile-img-button" // Add an ID for click outside logic
                onClick={toggleSideModal}
                className={`rounded-full p-1 transition duration-200 hover:bg-secondary ${!isTouchDevice ? "hover:bg-secondary md:hover:bg-transparent" : ""} ${
                  isTouchDevice && activeButtonId === "mobile-profile-img"
                    ? "bg-secondary bg-opacity-80"
                    : ""
                }`}
                onTouchStart={() => handleTouchStart("mobile-profile-img")}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchCancel}
              >
                <img
                  src={getOptimizedImageUrl(
                    authUser?.profileImg?.imageUrl || "/avatar-placeholder.png",
                    "avatar",
                  )}
                  className="size-7 rounded-full"
                  alt="User Profile"
                />
              </button>
            </li>

            {/* Profile (Desktop Only) */}
            <li
              onClick={() => {
                if (pathname === `/profile/${authUser?.username}`) return
                navigate(`/profile/${authUser?.username}`)
              }}
              className="hidden cursor-pointer items-center justify-center rounded-full p-1 transition duration-200 md:flex md:w-[130px] md:justify-start md:p-0 md:hover:bg-secondary"
            >
              <button
                className={`hidden md:block ${
                  pathname === `/profile/${authUser?.username}` ? "font-bold text-opacity-100" : ""
                } flex max-w-fit cursor-pointer items-center gap-[10px] rounded-full px-2 py-2 pl-2 hover:bg-secondary md:hover:bg-transparent ${
                  isTouchDevice && activeButtonId === "desktop-profile"
                    ? "bg-secondary bg-opacity-50 transition duration-150"
                    : "transition duration-150"
                }`}
                onTouchStart={() => handleTouchStart("desktop-profile")}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchCancel}
              >
                {pathname === `/profile/${authUser?.username}` ? (
                  <TbUserFilled className="size-8" />
                ) : (
                  <TbUser className="size-8" />
                )}
              </button>
              <span
                className={`ml-3 hidden text-lg md:block ${
                  pathname === `/profile/${authUser?.username}` ? "font-bold text-opacity-100" : ""
                }`}
              >
                Profile
              </span>
            </li>

            <div className="mr-7 hidden md:block">
              <button
                className="w-full cursor-pointer rounded-full bg-primary px-4 py-3 font-semibold text-white transition duration-200 hover:bg-primary/85"
                onClick={onOpenCreatePostModal}
              >
                Post
              </button>
            </div>
          </ul>

          {/* User Profile and Popover (Desktop only) */}
          {authUser && (
            <div className="relative mb-3 mt-auto hidden w-full justify-start md:flex">
              <button
                ref={profileButtonRef}
                onClick={togglePopover}
                className={`mr-2 flex w-full gap-2 rounded-full px-2 py-2 duration-300 hover:bg-secondary ${
                  isTouchDevice && activeButtonId === "user-profile-button"
                    ? "bg-secondary bg-opacity-50 transition duration-150"
                    : "transition duration-150"
                }`}
                onTouchStart={() => handleTouchStart("user-profile-button")}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchCancel}
              >
                {/* <Link to={`/profile/${authUser.username}`}> */}
                <div className={`avatar relative flex justify-center`}>
                  <div className="w-10 rounded-full">
                    <img
                      src={getOptimizedImageUrl(
                        authUser?.profileImg?.imageUrl || "/avatar-placeholder.png",
                        "avatar",
                      )}
                    />
                  </div>
                  {isOnline ? (
                    <span className="absolute bottom-0 right-0 z-50 h-3 w-3 rounded-full border-2 border-base-100 bg-green-500"></span>
                  ) : (
                    <span className="absolute bottom-0 right-0 z-50 h-3 w-3 rounded-full border-2 border-base-100 bg-gray-500"></span>
                  )}
                </div>
                {/* </Link> */}
                <div className="flex flex-1 items-center justify-between">
                  <div className="flex flex-col">
                    <p className="self-start truncate text-sm font-bold">{authUser?.fullName}</p>
                    <p className="self-start text-sm text-slate-500">@{authUser?.username}</p>
                  </div>
                  <BsThreeDots className="h-5 w-5 cursor-pointer" />
                </div>
              </button>

              {showPopover && (
                <>
                  <div
                    className="fixed inset-0 z-10 h-screen w-screen cursor-default bg-transparent"
                    onClick={() => setShowPopover(false)}
                  />
                  <div
                    ref={popoverRef}
                    className="white-shadow absolute bottom-full left-1/2 z-[1001] mb-2 flex min-w-[250px] -translate-x-1/2 flex-col gap-1 rounded-2xl border border-accent bg-base-100 pb-3"
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
                        {/* The status badge */}
                        <span
                          className={`absolute -bottom-6 left-10 size-[14px] rounded-full border-2 border-base-100 ${
                            isOnline ? "bg-green-500" : "bg-gray-500"
                          }`}
                        ></span>
                      </div>
                      <div className="mt-4 flex flex-col items-start px-3">
                        <span className="text-sm font-bold">{authUser?.fullName}</span>
                        <span className="mb-1 text-xs text-gray-500">@{authUser?.username}</span>
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
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left font-semibold transition duration-200 hover:bg-gray-700/30 disabled:cursor-wait"
                        disabled={isUpdatingStatus}
                      >
                        <span className="size-[14px] rounded-full border-2 border-base-100 bg-green-500"></span>
                        <div className="flex flex-col">
                          <span className="text-sm">Online</span>
                          <span className="text-xs text-gray-500">You will appear online</span>
                        </div>
                      </button>
                      <button
                        onClick={() => handleStatusChange("offline")}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left font-semibold transition duration-200 hover:bg-gray-700/30 disabled:cursor-wait"
                        disabled={isUpdatingStatus}
                      >
                        <span className="size-[14px] rounded-full border-2 border-base-100 bg-gray-500"></span>
                        <div className="flex flex-col">
                          <span className="text-sm">Offline</span>
                          <span className="text-xs text-gray-500">You will appear offline</span>
                        </div>
                      </button>
                    </div>

                    <div className="h-[1px] w-full bg-accent"></div>

                    {/* Existing Buttons */}
                    <button
                      onClick={handleConfirmDeleteClick}
                      className={`text-md flex w-full items-center px-3 py-2 text-left font-bold text-red-500 hover:bg-secondary ${
                        isTouchDevice && activeButtonId === "delete-account-popover"
                          ? "bg-secondary bg-opacity-50 transition duration-150"
                          : "transition duration-150"
                      }`}
                      onTouchStart={() => handleTouchStart("delete-account-popover")}
                      onTouchEnd={handleTouchEnd}
                      onTouchCancel={handleTouchCancel}
                    >
                      <span>
                        <TbUserX className="mr-3 size-6" />
                      </span>
                      Delete Account
                    </button>
                    <button
                      onClick={handleLogout}
                      className={`text-md flex w-full items-center px-3 py-2 pl-2 text-left font-bold hover:bg-secondary ${
                        isTouchDevice && activeButtonId === "logout-popover"
                          ? "bg-secondary bg-opacity-50 transition duration-150"
                          : "transition duration-150"
                      }`}
                      onTouchStart={() => handleTouchStart("logout-popover")}
                      onTouchEnd={handleTouchEnd}
                      onTouchCancel={handleTouchCancel}
                    >
                      <span>
                        <BiLogOut className="mr-4 size-6" />
                      </span>
                      Logout @{authUser?.username}
                    </button>
                  </div>
                </>
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
