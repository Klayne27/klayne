import { useState, useRef, useEffect, useCallback } from "react"
import { FaArrowUp } from "react-icons/fa6"
import Posts from "../features/posts/components/Posts"
import { useSocket } from "../context/SocketContext"
import { useAppStore } from "../store/useAppStore"
import { useQueryClient } from "@tanstack/react-query"
import { useTouchHoverEffect } from "../hooks/customHooks/useTouchHoverEffect"
import { useIsMobile } from "../hooks/customHooks/useIsMobile"
import { postKeys } from "../features/posts/postsHooks/postKeys"
import CreatePost from "../features/posts/components/CreatePost"
import { useMarkICPostsAsRead, useMarkPostsAsRead, useMarkVentPostsAsRead } from "../features/posts/postsHooks/usePostsMutations"

const HomePage = () => {
  const {
    showNewFeedPostsButton,
    setShowNewFeedPostsButton,
    newPostCount,
    showNewVentPostsButton,
    setShowNewVentPostsButton,
    newVentPostCount,
    newICPostCount,
    showNewICPostsButton,
    setShowNewICPostsButton,
    hasNewICPosts,
    hasNewVentPosts,
  } = useSocket()
  const showUnfollowModal = useAppStore((state) => state.showUnfollowModal)
  const feedType = useAppStore((state) => state.feedType)
  const setFeedType = useAppStore((state) => state.setFeedType)

  // const [feedType, setFeedType] = useState("forYou")
  const mainFeedRef = useRef(null)
  const scrollableContentRef = useRef(null)
  const [showScrollButton, setShowScrollButton] = useState(false)

  const queryClient = useQueryClient()
  const { markFeedAsRead } = useMarkPostsAsRead()
  const { markVentFeedAsRead } = useMarkVentPostsAsRead()
  const { markICPostsAsRead } = useMarkICPostsAsRead()

  const { isTouchDevice, activeButtonId, handleTouchEnd, handleTouchStart, handleTouchCancel } =
    useTouchHoverEffect()

  const isMobile = useIsMobile()
  const [showHeader, setShowHeader] = useState(true)
  const lastScrollY = useRef(0)

  const handleNewPostsButtonClick = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })

    if (feedType === "venting") {
      queryClient.invalidateQueries({ queryKey: postKeys.list("/api/posts/vent") })
      markVentFeedAsRead()
      setShowNewVentPostsButton(false)
    } else if (feedType === "forYou") {
      queryClient.invalidateQueries({ queryKey: postKeys.list("/api/posts/all") })
      markFeedAsRead()
      setShowNewFeedPostsButton(false)
    } else {
      queryClient.invalidateQueries({ queryKey: postKeys.list("/api/posts/ic") })
      markICPostsAsRead()
      setShowNewICPostsButton(false)
    }
  }, [
    queryClient,
    setShowNewFeedPostsButton,
    markFeedAsRead,
    markVentFeedAsRead,
    markICPostsAsRead,
    feedType,
    setShowNewVentPostsButton,
    setShowNewICPostsButton,
  ])

  useEffect(() => {
    const handleScrollButtonVisibility = () => {
      if (window.scrollY > 1000) {
        setShowScrollButton(true)
      } else {
        setShowScrollButton(false)
      }
    }

    window.addEventListener("scroll", handleScrollButtonVisibility)

    return () => {
      window.removeEventListener("scroll", handleScrollButtonVisibility)
    }
  }, [])

  useEffect(() => {
    if (!isMobile) {
      setShowHeader(true)
      return
    }

    const handleHeaderScroll = () => {
      const currentScrollY = window.scrollY

      if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        setShowHeader(false)
      } else if (currentScrollY < lastScrollY.current) {
        setShowHeader(true)
      }
      lastScrollY.current = currentScrollY
    }

    window.addEventListener("scroll", handleHeaderScroll)
    return () => {
      window.removeEventListener("scroll", handleHeaderScroll)
    }
  }, [isMobile])

  const handleTabClick = (type) => {
    setFeedType(type)
    sessionStorage.setItem("lastFeedType", type)
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    })
    setShowNewFeedPostsButton(false)
    setShowNewVentPostsButton(false)
    setShowNewICPostsButton(false)
    setShowHeader(true)
  }

  useEffect(() => {
    const storedFeedType = sessionStorage.getItem("lastFeedType")
    if (storedFeedType) {
      setFeedType(storedFeedType)
    }
  }, [setFeedType])

  return (
    <>
      <div ref={mainFeedRef} className="template mr-auto min-h-screen flex-[4_4_0] border-accent border-x">
        <div
          className={`sticky top-0 w-full ${
            showUnfollowModal ? "z-0" : "z-10"
          } border-b border-accent bg-opacity-20 backdrop-blur-md transition-transform duration-300 ease-in-out ${isMobile && !showHeader ? "-translate-y-full" : "translate-y-0"}`}
        >
          <div className="flex">
            <div
              className={`flex flex-1 cursor-pointer justify-center p-3 py-3.5 ${
                !isTouchDevice
                  ? "transition duration-300 hover:bg-secondary hover:bg-opacity-50"
                  : ""
              } ${
                activeButtonId === "forYou"
                  ? "bg-secondary bg-opacity-50 transition duration-300"
                  : ""
              } ${
                isTouchDevice && activeButtonId !== "forYou" ? "transition duration-300" : ""
              } ${feedType === "forYou" ? "font-bold" : "text-base-content/50"} `}
              onClick={() => handleTabClick("forYou")}
              onTouchStart={() => handleTouchStart("forYou")}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchCancel}
            >
              <span className="relative text-sm">
                For You
                {newPostCount > 0 && (
                  <div className="absolute -right-3 top-0 h-3 w-3 rounded-full border-2 border-black bg-primary"></div>
                )}
              </span>
              {feedType === "forYou" && (
                <div className="absolute bottom-0 h-1 w-10 rounded-full bg-primary"></div>
              )}
            </div>
            <div
              className={`flex flex-1 cursor-pointer justify-center p-3 text-sm ${
                !isTouchDevice
                  ? "transition duration-300 hover:bg-secondary hover:bg-opacity-50"
                  : ""
              } ${
                activeButtonId === "following"
                  ? "bg-secondary bg-opacity-50 transition duration-300"
                  : ""
              } ${
                isTouchDevice && activeButtonId !== "following" ? "transition duration-300" : ""
              } ${feedType === "following" ? "font-bold" : "text-base-content/50"} `}
              onClick={() => handleTabClick("following")}
              onTouchStart={() => handleTouchStart("following")}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchCancel}
            >
              Following
              {feedType === "following" && (
                <div className="absolute bottom-0 h-1 w-10 rounded-full bg-primary"></div>
              )}
            </div>
            <div
              className={`flex flex-1 cursor-pointer justify-center p-3 ${
                !isTouchDevice
                  ? "transition duration-300 hover:bg-secondary hover:bg-opacity-50"
                  : ""
              } ${
                activeButtonId === "ic" ? "bg-secondary bg-opacity-50" : ""
              } ${feedType === "ic" ? "font-bold" : "text-base-content/50"}`}
              onClick={() => handleTabClick("ic")}
              onTouchStart={() => handleTouchStart("ic")}
              onTouchEnd={handleTouchEnd}
            >
              <span className="relative text-sm">
                Study
                {hasNewICPosts && (
                  <div className="absolute -right-3 top-0 h-3 w-3 rounded-full border-2 border-black bg-primary"></div>
                )}
              </span>
              {feedType === "ic" && (
                <div className="absolute bottom-0 h-1 w-10 rounded-full bg-primary"></div>
              )}
            </div>

            <div
              className={`flex flex-1 cursor-pointer justify-center p-3 ${
                !isTouchDevice
                  ? "transition duration-300 hover:bg-secondary hover:bg-opacity-50"
                  : ""
              } ${
                activeButtonId === "venting"
                  ? "bg-secondary bg-opacity-50 transition duration-300"
                  : ""
              } ${
                isTouchDevice && activeButtonId !== "venting" ? "transition duration-300" : ""
              } ${feedType === "venting" ? "font-bold" : "text-base-content/50"} `}
              onClick={() => handleTabClick("venting")}
              onTouchStart={() => handleTouchStart("venting")}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchCancel}
            >
              <span className="relative text-sm">
                Rants
                {hasNewVentPosts && (
                  <div className="absolute -right-3 top-0 h-3 w-3 rounded-full border-2 border-black bg-primary"></div>
                )}
              </span>
              {feedType === "venting" && (
                <div className="absolute bottom-0 h-1 w-10 rounded-full bg-primary"></div>
              )}
            </div>
          </div>
        </div>

        {/* Conditional rendering for the button based on feed type */}
        {feedType === "venting" &&
          showNewVentPostsButton &&
          showScrollButton &&
          newVentPostCount && (
            <button
              onClick={handleNewPostsButtonClick}
              className="white-shadow fixed left-1/2 top-[60px] z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-white transition-all duration-200 hover:bg-primary/90 md:top-[53px] md:-translate-x-[110%] md:text-sm"
            >
              <FaArrowUp className="size-4" />
              <span>{newVentPostCount} new rant(s)</span>
            </button>
          )}

        {feedType === "forYou" && showNewFeedPostsButton && showScrollButton && newPostCount && (
          <button
            onClick={handleNewPostsButtonClick}
            className="white-shadow fixed left-1/2 top-[60px] z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-white transition-all duration-200 hover:bg-primary/90 md:top-[53px] md:-translate-x-[110%] md:text-sm"
          >
            <FaArrowUp className="size-4" />
            <span>{newPostCount} new post(s)</span>
          </button>
        )}
        {feedType === "ic" && showNewICPostsButton && showScrollButton && newICPostCount && (
          <button
            onClick={handleNewPostsButtonClick}
            className="white-shadow fixed left-1/2 top-[60px] z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-white transition-all duration-200 hover:bg-primary/90 md:top-[53px] md:-translate-x-[110%] md:text-sm"
          >
            <FaArrowUp className="size-4" />
            <span>{newICPostCount} new post(s)</span>
          </button>
        )}
        <div ref={scrollableContentRef}>
          <CreatePost feedType={feedType} />
          <Posts feedType={feedType} />
        </div>
      </div>
    </>
  )
}

export default HomePage
