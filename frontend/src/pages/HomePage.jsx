import { useState, useRef, useEffect, useCallback } from "react"
import { FaArrowUp } from "react-icons/fa6"
import Posts from "../features/posts/Posts"
import { useSocket } from "../context/SocketContext"
import { useAppStore } from "../store/useAppStore"
import { useQueryClient } from "@tanstack/react-query"
import { useMarkPostsAsRead } from "../features/posts/postsHooks/useMarkPostsAsRead"
import { useTouchHoverEffect } from "../hooks/customHooks/useTouchHoverEffect"
import { useIsMobile } from "../hooks/customHooks/useIsMobile"
import { postKeys } from "../features/posts/postsHooks/postKeys"
import CreatePost from "../features/posts/CreatePost"

const HomePage = () => {
  const { showNewFeedPostsButton, setShowNewFeedPostsButton, setNewPostCount, newPostCount } =
    useSocket()
  const showUnfollowModal = useAppStore((state) => state.showUnfollowModal)
  const [feedType, setFeedType] = useState("forYou")
  const mainFeedRef = useRef(null)
  const scrollableContentRef = useRef(null)
  const [showScrollButton, setShowScrollButton] = useState(false)

  const queryClient = useQueryClient()
  const { markFeedAsRead } = useMarkPostsAsRead()

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

    queryClient.invalidateQueries({ queryKey: postKeys.list("/api/posts/all") })

    markFeedAsRead()
    setShowNewFeedPostsButton(false)
  }, [queryClient, setShowNewFeedPostsButton, markFeedAsRead])

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
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    })
    setShowNewFeedPostsButton(false)
    setShowHeader(true) 
  }

  return (
    <>
      <div ref={mainFeedRef} className="mr-auto min-h-screen flex-[4_4_0] border-accent text-base-content-inverse">
        <div
          className={`sticky top-0 w-full ${
            showUnfollowModal ? "z-0" : "z-10"
          } border-b border-accent bg-opacity-20 backdrop-blur-md transition-transform duration-300 ease-in-out ${isMobile && !showHeader ? "-translate-y-full" : "translate-y-0"}`}
        >
          <div className="flex">
            <div
              className={`flex flex-1 cursor-pointer justify-center p-3 ${
                !isTouchDevice
                  ? "transition duration-300 hover:bg-secondary hover:bg-opacity-50"
                  : ""
              } ${
                activeButtonId === "forYou"
                  ? "bg-secondary bg-opacity-50 transition duration-300"
                  : ""
              } ${
                isTouchDevice && activeButtonId !== "forYou" ? "transition duration-300" : ""
              } ${feedType === "forYou" ? "font-bold" : "opacity-50"} `}
              onClick={() => handleTabClick("forYou")}
              onTouchStart={() => handleTouchStart("forYou")}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchCancel}
            >
              For you
              {feedType === "forYou" && (
                <div className="absolute bottom-0 h-1 w-10 rounded-full bg-primary"></div>
              )}
            </div>
            <div
              className={`flex flex-1 cursor-pointer justify-center p-3 ${
                !isTouchDevice
                  ? "transition duration-300 hover:bg-secondary hover:bg-opacity-50"
                  : ""
              } ${
                activeButtonId === "following"
                  ? "bg-secondary bg-opacity-50 transition duration-300"
                  : ""
              } ${
                isTouchDevice && activeButtonId !== "following" ? "transition duration-300" : ""
              } ${feedType === "following" ? "font-bold" : "opacity-50"} `}
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
          </div>
        </div>

        {showNewFeedPostsButton && showScrollButton && newPostCount && feedType === "forYou" && (
          <button
            onClick={handleNewPostsButtonClick}
            className="white-shadow fixed left-1/2 top-[60px] z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-white transition-all duration-200 hover:bg-primary/90 md:top-[53px] md:-translate-x-[110%] md:text-sm"
          >
            <FaArrowUp className="size-4" />
            <span>{newPostCount} new post(s)</span>
          </button>
        )}

        <div ref={scrollableContentRef}>
          <CreatePost />
          <Posts feedType={feedType} />
        </div>
      </div>
    </>
  )
}

export default HomePage
