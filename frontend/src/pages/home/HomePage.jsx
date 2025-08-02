import { useState, useRef, useEffect, useCallback } from "react"
import { FaArrowUp } from "react-icons/fa6"

import Posts from "../../components/common/posts/Posts"
import CreatePost from "../../components/common/posts/CreatePost"
import { useSocket } from "../../context/SocketContext"
import { useQueryClient } from "@tanstack/react-query"
import { useMarkPostsAsRead } from "../../hooks/postsHooks/useMarkPostsAsRead"
import { useAppStore } from "../../store/useAppStore"
import { useTouchHoverEffect } from "../../hooks/customHooks/useTouchHoverEffect"
import { useIsMobile } from "../../hooks/customHooks/useIsMobile" // Import your useIsMobile hook

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

  // New state and ref for header animation
  const isMobile = useIsMobile() // Use your custom hook
  const [showHeader, setShowHeader] = useState(true) // State to control header visibility
  const lastScrollY = useRef(0) // Ref to store the last scroll position

  // Function to scroll to the top and refetch posts
  const handleNewPostsButtonClick = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })

    queryClient.invalidateQueries({ queryKey: ["posts", "/api/posts/all"] })

    markFeedAsRead()
    setShowNewFeedPostsButton(false)
    // setNewPostCount(0); // Uncomment if you want to reset post count
  }, [queryClient, setShowNewFeedPostsButton, markFeedAsRead])

  // Effect for the "New Posts" scroll button visibility
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

  // Effect for header hide/show animation on mobile
  useEffect(() => {
    // Only apply this logic on mobile devices
    if (!isMobile) {
      setShowHeader(true) // Always show header on desktop
      return
    }

    const handleHeaderScroll = () => {
      const currentScrollY = window.scrollY

      // Only hide if scrolling down AND current scroll position is past a small threshold
      // to prevent hiding immediately after a small scroll
      if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        setShowHeader(false) // Scroll down, hide header
      } else if (currentScrollY < lastScrollY.current) {
        setShowHeader(true) // Scroll up, show header
      }
      lastScrollY.current = currentScrollY
    }

    window.addEventListener("scroll", handleHeaderScroll)
    // You might want to also listen to resize, or rely on `isMobile` changing
    // if `isMobile` changes, the effect will re-run, effectively resetting behavior
    // window.addEventListener("resize", handleHeaderScroll); // Re-evaluate on resize too

    return () => {
      window.removeEventListener("scroll", handleHeaderScroll)
      // window.removeEventListener("resize", handleHeaderScroll);
    }
  }, [isMobile]) // Re-run effect if isMobile changes

  const handleTabClick = (type) => {
    setFeedType(type)
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    })
    // When changing tabs, hide the new posts button immediately
    setShowNewFeedPostsButton(false)
    setShowHeader(true) // Always show header when changing tabs
  }

  return (
    <>
      <div ref={mainFeedRef} className="mr-auto min-h-screen flex-[4_4_0] border-accent">
        <div
          // Added 'transform', 'transition-transform', 'duration-300'
          // Conditional 'translate-y-[-100%]' for hiding
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

        {/* NEW POSTS BUTTON */}
        {showNewFeedPostsButton && showScrollButton && newPostCount && feedType === "forYou" && (
          <button
            onClick={handleNewPostsButtonClick}
            // Adjusted z-index to be higher than header when hidden,
            // also consider if the button should be affected by header's slide out
            // For now, let's keep it separate.
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
