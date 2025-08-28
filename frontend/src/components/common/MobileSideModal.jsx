import { useLocation, useNavigate } from "react-router-dom"
import { useAuthUser } from "../../features/auth/authHooks/useAuthUser"
import { useTouchHoverEffect } from "../../hooks/customHooks/useTouchHoverEffect"
import { checkSubscriptionStatus, handleEnablePushNotifications } from "../../utils/push"
import { IoBookmark, IoBookmarkOutline, IoClose } from "react-icons/io5"
import { LuListTodo } from "react-icons/lu"
import { IoIosTimer } from "react-icons/io"
import { BiLogOut } from "react-icons/bi"
import { useEffect } from "react"
import { useState } from "react"
import { TbUser, TbUserFilled, TbUserX } from "react-icons/tb"
import { HiPaintBrush, HiOutlinePaintBrush } from "react-icons/hi2"

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
}) {
  const { authUser } = useAuthUser()
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const { isTouchDevice, activeButtonId, handleTouchCancel, handleTouchEnd, handleTouchStart } =
    useTouchHoverEffect()

  const [isPushSubscribed, setIsPushSubscribed] = useState(false)
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(true)

  useEffect(() => {
    const checkPushStatus = async () => {
      if (isInstalled) {
        setIsCheckingSubscription(true)
        const isSubscribed = await checkSubscriptionStatus()
        setIsPushSubscribed(isSubscribed)
        setIsCheckingSubscription(false)
      }
    }

    checkPushStatus()
  }, [isInstalled])

  useEffect(() => {
    if (!isInstalled) return

    const interval = setInterval(async () => {
      const isSubscribed = await checkSubscriptionStatus()
      if (isSubscribed !== isPushSubscribed) {
        setIsPushSubscribed(isSubscribed)
      }
    }, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [isInstalled, isPushSubscribed])

  const handleNotificationClick = async () => {
    const success = await handleEnablePushNotifications()
    if (success) {
      setIsPushSubscribed(true)
    }
  }

  return (
    <div
      ref={sideModalRef}
      className={`fixed left-0 top-0 z-[1000] h-full template w-[80vw] max-w-[300px] transform border-r border-accent bg-base-100 transition-transform duration-300 ease-out ${showSideModal ? "translate-x-0" : "-translate-x-full"} md:hidden`} // Only show on mobile
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
                    src={authUser?.profileImg?.imageUrl || "/avatar-placeholder.png"}
                    alt="User Profile"
                  />
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
              <p className="text-lg font-bold">{authUser?.fullName}</p>
              <p className="text-sm text-slate-500">@{authUser?.username}</p>
            </div>
            <div className="mt-4 flex gap-4 text-sm">
              {/* Follower/Following links in modal */}
              <p
                onClick={() => {
                  openFollowListModal("following")
                  // setShowSideModal(false); // Add this line if you want the sidebar to close
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
                  // setShowSideModal(false); // Add this line if you want the sidebar to close
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

          {/* Scrollable navigation links */}
          <div className="scrollbar-on-hover flex-1 overflow-y-auto py-2">
            <ul className="flex flex-col gap-0">
              {/* Profile Tab in Side Modal */}
              <li
                onClick={() => {
                  navigate(`/profile/${authUser?.username}`)
                  setShowSideModal(false) // Close modal on navigation
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
              {/* Bookmarks Tab in Side Modal (now visible only in modal on mobile) */}
              <li
                onClick={() => {
                  if (pathname === "/bookmarks") return
                  navigate("/bookmarks")
                  setShowSideModal(false) // Close modal on navigation
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
              {/* Themes Tab in Side Modal */}
              <li
                onClick={() => {
                  if (pathname === "/themes") return
                  navigate("/themes")
                  setShowSideModal(false) // Close modal on navigation
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
                  if (pathname === "/pomodoro") return
                  navigate("/pomodoro")
                  setShowSideModal(false) // Close modal on navigation
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

              {/* Separator if needed */}
              <div className="my-2 border-t border-accent"></div>

              {/* Delete Account Button in Side Modal */}
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
              {/* Logout Button in Side Modal */}
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
                Logout @{authUser?.username}
              </li>
            </ul>
          </div>
          {!isInstalled && deferredPrompt && (
            <div className="mt-4 rounded-2xl border border-accent p-4">
              <p className="mb-2 text-xl font-bold">Install the App</p>
              <p className="mb-4 text-sm text-gray-500">Get the full experience on your device.</p>
              <button
                onClick={installApp}
                className="w-full rounded-md bg-primary py-2 text-white transition duration-200 hover:bg-primary/85"
              >
                Install
              </button>
            </div>
          )}

          {isInstalled && !isCheckingSubscription && !isPushSubscribed && (
            <div className="mt-4 rounded-2xl border border-accent p-4">
              <p className="mb-2 text-xl font-bold">Stay Updated</p>
              <p className="mb-4 text-sm text-gray-500">
                Enable push notifications to get real-time updates.
              </p>
              <button
                onClick={handleNotificationClick}
                className="w-full rounded-md bg-primary py-2 text-white transition duration-200 hover:bg-primary/85"
              >
                Enable Notifications
              </button>
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
