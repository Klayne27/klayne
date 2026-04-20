import { useLocation, useNavigate } from "react-router-dom"
import { useAuthUser } from "../../features/auth/authHooks/useAuthUser"
import { useTouchHoverEffect } from "../../hooks/customHooks/useTouchHoverEffect"
import { checkSubscriptionStatus, handleEnablePushNotifications } from "../../utils/push"
import { IoBookmark, IoBookmarkOutline, IoClose } from "react-icons/io5"
import { BiLogOut } from "react-icons/bi"
import { useEffect } from "react"
import { useState } from "react"
import { TbUser, TbUserFilled, TbUserX } from "react-icons/tb"
import { HiPaintBrush, HiOutlinePaintBrush } from "react-icons/hi2"
import { useSocket } from "../../context/SocketContext"
import { MdLibraryBooks, MdOutlineLibraryBooks } from "react-icons/md"
import { IoIosTimer } from "react-icons/io"
import { LuListTodo } from "react-icons/lu"
import { getOptimizedImageUrl } from "../../utils/cloudinaryUtils"
import { useUpdateStatusPreference } from "../../features/users/usersHooks/useUserMutations"
import { PiCoatHanger, PiSquaresFourFill, PiSquaresFourLight } from "react-icons/pi"

function MobileSideModal({
  showSideModal,
  sideModalRef,
  openFollowListModal,
  setShowSideModal,
  installApp,
  isInstalled,
  deferredPrompt,
  handleLogout,
  handleConfirmDeleteClick,
  isIOSDevice,
}) {
  const { authUser } = useAuthUser()
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const { socket } = useSocket()
  const { updateStatus, isUpdatingStatus } = useUpdateStatusPreference()

  const handleStatusChange = (status) => {
    updateStatus(status)
    if (socket) {
      socket.emit("changeOnlineStatus", { status })
    }
  }

  const { isTouchDevice, activeButtonId, handleTouchCancel, handleTouchEnd, handleTouchStart } =
    useTouchHoverEffect()

  const [isPushSubscribed, setIsPushSubscribed] = useState(false)
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(true)
  const [notifPermission, setNotifPermission] = useState("default")

  useEffect(() => {
    const checkPushStatus = async () => {
      setIsCheckingSubscription(true)
      const isSubscribed = await checkSubscriptionStatus()
      setIsPushSubscribed(isSubscribed)
      setIsCheckingSubscription(false)
    }

    checkPushStatus()
  }, [isInstalled])

  useEffect(() => {
    const checkPushStatus = async () => {
      setIsCheckingSubscription(true)
      const isSubscribed = await checkSubscriptionStatus()
      setIsPushSubscribed(isSubscribed)
      if ("Notification" in window) {
        setNotifPermission(Notification.permission)
      }
      setIsCheckingSubscription(false)
    }
    checkPushStatus()
  }, [isInstalled])

  const handleNotificationClick = async () => {
    if (Notification.permission === "denied") {
      alert(
        "Notifications are blocked. To enable them, go to your device Settings → Apps → [this app] → Notifications and turn them on.",
      )
      return
    }

    const success = await handleEnablePushNotifications()

    if (success) {
      setIsPushSubscribed(true)
      setNotifPermission("granted") // ADD
    } else if (!isInstalled) {
      alert("Open the installed app to fully enable notifications.")
    }
  }

  const isOnline = authUser.statusPreference === "online"

  return (
    <div
      ref={sideModalRef}
      className={`template fixed left-0 top-0 z-[1000] h-full w-[80vw] max-w-[300px] transform border-r border-accent bg-base-100 transition-transform duration-300 ease-out ${showSideModal ? "translate-x-0" : "-translate-x-full"} md:hidden`} // Only show on mobile
    >
      {authUser && (
        <div className="flex h-full flex-col">
          {/* Header with user info and close button */}
          <div className="border-b border-accent p-4">
            <div className="mb-1 flex items-center justify-between">
              <div className="avatar">
                <div
                  className={`w-11 cursor-pointer rounded-full ${
                    isTouchDevice && activeButtonId === "modal-profile-img"
                      ? "bg-secondary bg-opacity-50 transition duration-150"
                      : "transition duration-150"
                  }`}
                  onClick={() => {
                    navigate(`/profile/${authUser?.username}`)
                    setShowSideModal(false) // Close modal on navigation
                  }}
                  onTouchStart={() => handleTouchStart("modal-profile-img")}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchCancel}
                >
                  <img
                    src={getOptimizedImageUrl(
                      authUser?.profileImg?.imageUrl || "/avatar-placeholder.png",
                      "avatar",
                    )}
                    alt="User Profile"
                  />
                  {isOnline ? (
                    <span className="absolute bottom-0 right-0 z-50 h-3 w-3 rounded-full border-2 border-base-100 bg-green-500"></span>
                  ) : (
                    <span className="absolute bottom-0 right-0 z-50 h-3 w-3 rounded-full border-2 border-base-100 bg-gray-500"></span>
                  )}
                </div>
              </div>

              <button
                onClick={() => setShowSideModal(false)}
                className={`rounded-full p-1 hover:bg-secondary ${
                  isTouchDevice && activeButtonId === "modal-close-button"
                    ? "bg-secondary bg-opacity-50 transition duration-150"
                    : "transition duration-150"
                }`}
                onTouchStart={() => handleTouchStart("modal-close-button")}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchCancel}
              >
                <IoClose className="h-6 w-6" />
              </button>
            </div>
            <div className="flex flex-col">
              <p
                className="min-w-0 truncate text-lg font-bold"
                style={authUser.nameColor ? { color: authUser.nameColor } : undefined}
              >
                {authUser?.fullName}
              </p>
              <p className="min-w-0 truncate text-sm text-slate-500">@{authUser?.username}</p>
            </div>
            <div className="mt-4 flex gap-4 text-sm">
              <p
                onClick={() => {
                  openFollowListModal("following")
                }}
                className={`cursor-pointer rounded-md p-1 font-bold ${
                  isTouchDevice && activeButtonId === "modal-following"
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
                  openFollowListModal("followers")
                }}
                className={`cursor-pointer rounded-md p-1 font-bold ${
                  isTouchDevice && activeButtonId === "modal-followers"
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

          <div className="scrollbar-on-hover flex-1 overflow-y-auto py-2">
            <ul className="flex flex-col gap-0">
              <li
                onClick={() => {
                  navigate(`/profile/${authUser?.username}`)
                  setShowSideModal(false)
                }}
                className={`flex cursor-pointer items-center px-4 py-2 hover:bg-secondary ${
                  isTouchDevice && activeButtonId === "modal-profile"
                    ? "bg-secondary bg-opacity-50 transition duration-150"
                    : "transition duration-150"
                }`}
                onTouchStart={() => handleTouchStart("modal-profile")}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchCancel}
              >
                {pathname === `/profile/${authUser?.username}` ? (
                  <TbUserFilled className="mr-4 size-7" />
                ) : (
                  <TbUser className="mr-4 size-7" />
                )}
                <span
                  className={`text-xl ${
                    pathname === `/profile/${authUser?.username}` ? "font-bold" : ""
                  }`}
                >
                  Profile
                </span>
              </li>
              <li
                onClick={() => {
                  if (pathname === "/board") return
                  navigate("/board")
                  setShowSideModal(false)
                }}
                className={`flex cursor-pointer items-center px-4 py-2 hover:bg-secondary ${
                  isTouchDevice && activeButtonId === "modal-board"
                    ? "bg-secondary bg-opacity-50 transition duration-150"
                    : "transition duration-150"
                }`}
              >
                {pathname === "/board" ? (
                  <PiSquaresFourFill className="mr-4 size-7" />
                ) : (
                  <PiSquaresFourLight className="mr-4 size-7" />
                )}{" "}
                <span className={`text-xl ${pathname === "/board" ? "font-bold" : ""}`}>Board</span>
              </li>
              <li
                onClick={() => {
                  if (pathname === "/bookmarks") return
                  navigate("/bookmarks")
                  setShowSideModal(false)
                }}
                className={`flex cursor-pointer items-center px-4 py-2 hover:bg-secondary ${
                  isTouchDevice && activeButtonId === "modal-bookmarks"
                    ? "bg-secondary bg-opacity-50 transition duration-150"
                    : "transition duration-150"
                }`}
                onTouchStart={() => handleTouchStart("modal-bookmarks")}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchCancel}
              >
                {pathname === "/bookmarks" ? (
                  <IoBookmark className="mr-4 size-7" />
                ) : (
                  <IoBookmarkOutline className="mr-4 size-7" strokeWidth={0.5} />
                )}
                <span className={`text-xl ${pathname === "/bookmarks" ? "font-bold" : ""}`}>
                  Bookmarks
                </span>
              </li>
              <li
                onClick={() => {
                  if (pathname === "/pomodoro") return
                  navigate("/pomodoro")
                  setShowSideModal(false)
                }}
                className={`flex cursor-pointer items-center px-4 py-2 hover:bg-secondary ${
                  isTouchDevice && activeButtonId === "modal-pomodoro"
                    ? "bg-secondary bg-opacity-50 transition duration-150"
                    : "transition duration-150"
                }`}
              >
                <IoIosTimer
                  className="mr-4 size-7"
                  strokeWidth={pathname === "/pomodoro" ? 2 : 2}
                />
                <span className={`text-xl ${pathname === "/pomodoro" ? "font-bold" : ""}`}>
                  Pomodoro
                </span>
              </li>
              <li
                onClick={() => {
                  if (pathname === "/todos") return
                  navigate("/todos")
                  setShowSideModal(false)
                }}
                className={`flex cursor-pointer items-center px-4 py-2 hover:bg-secondary ${
                  isTouchDevice && activeButtonId === "modal-todos"
                    ? "bg-secondary bg-opacity-50 transition duration-150"
                    : "transition duration-150"
                }`}
              >
                <LuListTodo className="mr-4 size-7" strokeWidth={pathname === "/todos" ? 2 : 2} />
                <span className={`text-xl ${pathname === "/todos" ? "font-bold" : ""}`}>Todos</span>
              </li>
              <li
                onClick={() => {
                  if (pathname === "/wardrobe") return
                  navigate("/wardrobe")
                  setShowSideModal(false)
                }}
                className={`flex cursor-pointer items-center px-4 py-2 hover:bg-secondary ${
                  isTouchDevice && activeButtonId === "modal-wardrobe"
                    ? "bg-secondary bg-opacity-50 transition duration-150"
                    : "transition duration-150"
                }`}
              >
                <PiCoatHanger className="mr-4 size-7" />
                <span className={`text-xl ${pathname === "/wardrobe" ? "font-bold" : ""}`}>
                  Wardrobe
                </span>
              </li>
              <li
                onClick={() => {
                  if (pathname === "/themes") return
                  navigate("/themes")
                  setShowSideModal(false)
                }}
                className={`flex cursor-pointer items-center px-4 py-2 hover:bg-secondary ${
                  isTouchDevice && activeButtonId === "modal-themes"
                    ? "bg-secondary bg-opacity-50 transition duration-150"
                    : "transition duration-150"
                }`}
              >
                {pathname === "/themes" ? (
                  <HiPaintBrush className="mr-4 size-7" />
                ) : (
                  <HiOutlinePaintBrush className="mr-4 size-7" />
                )}{" "}
                <span className={`text-xl ${pathname === "/themes" ? "font-bold" : ""}`}>
                  Themes
                </span>
              </li>
              <li
                onClick={() => {
                  if (pathname === "/devlog") return
                  navigate("/devlog")
                  setShowSideModal(false)
                }}
                className={`flex cursor-pointer items-center px-4 py-2 hover:bg-secondary ${
                  isTouchDevice && activeButtonId === "modal-devlog"
                    ? "bg-secondary bg-opacity-50 transition duration-150"
                    : "transition duration-150"
                }`}
              >
                {pathname === "/devlog" ? (
                  <MdLibraryBooks className="mr-4 size-7" />
                ) : (
                  <MdOutlineLibraryBooks className="mr-4 size-7" />
                )}{" "}
                <span className={`text-xl ${pathname === "/devlog" ? "font-bold" : ""}`}>
                  Devlog
                </span>
              </li>

              <div className="my-2 border-t border-accent"></div>
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
              <div className="my-2 border-t border-accent"></div>

              <li
                onClick={handleConfirmDeleteClick}
                className={`flex cursor-pointer items-center gap-1 px-4 py-2 font-bold text-red-500 hover:bg-secondary ${
                  isTouchDevice && activeButtonId === "modal-delete-account"
                    ? "bg-secondary bg-opacity-50 transition duration-150"
                    : "transition duration-150"
                }`}
                onTouchStart={() => handleTouchStart("modal-delete-account")}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchCancel}
              >
                <span>
                  <TbUserX className="mr-3 size-6" />
                </span>
                Delete Account
              </li>
              <li
                onClick={handleLogout}
                className={`flex cursor-pointer items-center px-4 py-2 font-bold hover:bg-secondary ${
                  isTouchDevice && activeButtonId === "modal-logout"
                    ? "bg-secondary bg-opacity-50 transition duration-150"
                    : "transition duration-150"
                }`}
                onTouchStart={() => handleTouchStart("modal-logout")}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchCancel}
              >
                <span>
                  <BiLogOut className="mr-4 size-6" />
                </span>
                <span className="truncate">Logout @{authUser?.username}</span>
              </li>
            </ul>
          </div>
          {!isInstalled && (deferredPrompt || isIOSDevice) && (
            <div className="mt-4 rounded-2xl border border-accent p-4">
              <p className="mb-2 text-xl font-bold">Install the App</p>

              {isIOSDevice ? (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-gray-500">To install on iPhone or iPad:</p>
                  <ol className="flex flex-col gap-1 text-sm text-gray-400">
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-white">1.</span>
                      Tap the "Share" button in Safari's toolbar
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-white">2.</span>
                      Scroll down and tap "Add to Home Screen"
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-white">3.</span>
                      Tap "Add" in the top right
                    </li>
                  </ol>
                  <p className="mt-1 text-xs text-gray-600">
                    Must be opened in Safari, not Chrome or Firefox.
                  </p>
                </div>
              ) : (
                <>
                  <p className="mb-4 text-sm text-gray-500">
                    Install the app to your home screen to enable real-time notifications.
                  </p>
                  <button
                    onClick={installApp}
                    className="w-full rounded-md bg-primary py-2 text-white transition duration-200 hover:bg-primary/85"
                  >
                    Install
                  </button>
                </>
              )}
            </div>
          )}

          {!isCheckingSubscription && !isPushSubscribed && isInstalled && (
            <div className="mt-4 rounded-2xl border border-accent p-4">
              <p className="mb-2 text-xl font-bold">Stay Updated</p>

              {notifPermission === "denied" ? (
                <>
                  <p className="mb-3 text-sm text-gray-500">
                    Notifications are currently blocked for this app.
                  </p>
                  <p className="mb-3 text-sm text-gray-400">
                    To fix this, go to your device{" "}
                    <span className="font-semibold text-white">
                      Settings → Apps → Notifications
                    </span>{" "}
                    and allow notifications for this app, then reopen it.
                  </p>
                  <button
                    onClick={() =>
                      alert("Go to Settings → Apps → [this app] → Notifications → Allow.")
                    }
                    className="w-full rounded-md border border-accent py-2 text-sm text-gray-400 transition duration-200 hover:bg-gray-700/30"
                  >
                    How to enable
                  </button>
                </>
              ) : (
                <>
                  <p className="mb-4 text-sm text-gray-500">
                    Enable push notifications to get real-time updates.
                  </p>
                  <button
                    onClick={handleNotificationClick}
                    className="w-full rounded-md bg-primary py-2 text-white transition duration-200 hover:bg-primary/85"
                  >
                    Enable Notifications
                  </button>
                </>
              )}
            </div>
          )}

          {/* {isInstalled && !isCheckingSubscription && isPushSubscribed && (
            <div className="mt-4 rounded-2xl border border-green-500 p-4">
              <p className="mb-2 text-xl font-bold text-green-600">✓ Notifications Enabled</p>
              <p className="text-sm text-gray-500">You're all set to receive push notifications!</p>
            </div>
          )} */}
        </div>
      )}
    </div>
  )
}

export default MobileSideModal
