import { useState, useRef, useEffect, useCallback } from "react"; // Added useCallback
import { FaArrowUp } from "react-icons/fa6";

import Posts from "../../components/common/posts/Posts";
import CreatePost from "./CreatePost";
import { useSocket } from "../../context/SocketContext";
import { useQueryClient } from "@tanstack/react-query";
import { useMarkPostsAsRead } from "../../hooks/postsHooks/useMarkPostsAsRead";

const HomePage = ({ openImageModal, showUnfollowModal }) => {
  const {
    showNewFeedPostsButton,
    setShowNewFeedPostsButton,
    setNewPostCount,
    newPostCount,
  } = useSocket();
  const [feedType, setFeedType] = useState("forYou");
  const mainFeedRef = useRef(null);
  const [headerWidth, setHeaderWidth] = useState("auto");
  const scrollableContentRef = useRef(null); // This ref points to the div containing CreatePost and Posts
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [activeTab, setActiveTab] = useState(null);
  // NEW: State to manage button visibility based on scroll
  const [showScrollButton, setShowScrollButton] = useState(false);

  const queryClient = useQueryClient();

    const { markFeedAsRead } = useMarkPostsAsRead();
  

  // Function to scroll to the top and refetch posts
  const handleNewPostsButtonClick = useCallback(() => {
    // Scroll smoothly to the top of the feed
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    queryClient.invalidateQueries({ queryKey: ["posts", "/api/posts/all"] });

    markFeedAsRead()
    setShowNewFeedPostsButton(false);
    setNewPostCount(0);
  }, [queryClient, setShowNewFeedPostsButton, setNewPostCount, markFeedAsRead]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 1000) {
        setShowScrollButton(true);
      } else {
        setShowScrollButton(false);
      }
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    const updateWidth = () => {
      if (mainFeedRef.current) {
        setHeaderWidth(mainFeedRef.current.clientWidth + "px");
      }
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);

    setIsTouchDevice(
      "ontouchstart" in window ||
        navigator.maxTouchPoints > 0 ||
        navigator.msMaxTouchPoints > 0
    );

    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const handleTabClick = (type) => {
    setFeedType(type);
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
    // When changing tabs, hide the new posts button immediately
    setShowNewFeedPostsButton(false);
  };

  const handleTouchStart = (type) => {
    if (isTouchDevice) {
      setActiveTab(type);
    }
  };

  const handleTouchEnd = () => {
    if (isTouchDevice) {
      setTimeout(() => {
        setActiveTab(null);
      }, 150);
    }
  };

  return (
    <>
      <div ref={mainFeedRef} className="flex-[4_4_0] mr-auto border-accent min-h-screen">
        <div
          className={`fixed top-0 ${showUnfollowModal ? "z-0" : "z-10"}
                       border-b border-accent bg-opacity-20 backdrop-blur-md`}
        >
          <div className="flex w-full" style={{ width: headerWidth }}>
            <div
              className={`
                flex justify-center flex-1 p-3 cursor-pointer
                ${
                  !isTouchDevice
                    ? "hover:bg-secondary hover:bg-opacity-50 transition duration-300"
                    : ""
                }
                ${
                  activeTab === "forYou"
                    ? "bg-secondary bg-opacity-50 transition duration-300"
                    : ""
                }
                ${
                  isTouchDevice && activeTab !== "forYou" ? "transition duration-300" : ""
                }
                  ${feedType === "forYou" ? "font-bold" : "opacity-50"}
              `}
              onClick={() => handleTabClick("forYou")}
              onTouchStart={() => handleTouchStart("forYou")}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
            >
              For you
              {feedType === "forYou" && (
                <div className="absolute bottom-0 w-10 h-1 rounded-full bg-primary"></div>
              )}
            </div>
            <div
              className={`
                flex justify-center flex-1 p-3 cursor-pointer
                ${
                  !isTouchDevice
                    ? "hover:bg-secondary hover:bg-opacity-50 transition duration-300"
                    : ""
                }
                ${
                  activeTab === "following"
                    ? "bg-secondary bg-opacity-50 transition duration-300"
                    : ""
                }
                ${
                  isTouchDevice && activeTab !== "following"
                    ? "transition duration-300"
                    : ""
                }
                ${feedType === "following" ? "font-bold" : "opacity-50"}
              `}
              onClick={() => handleTabClick("following")}
              onTouchStart={() => handleTouchStart("following")}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
            >
              Following
              {feedType === "following" && (
                <div className="absolute bottom-0 w-10 h-1 rounded-full bg-primary"></div>
              )}
            </div>
          </div>
        </div>

        {/* NEW POSTS BUTTON */}
        {!showNewFeedPostsButton && showScrollButton && !newPostCount && feedType === "forYou" && (
          <button
            onClick={handleNewPostsButtonClick}
            className="fixed top-[60px] font-semibold md:top-[53px] left-1/2 -translate-x-1/2 md:-translate-x-[110%] z-50
                       bg-primary text-white px-3 py-2 rounded-full white-shadow
                       hover:bg-primary/90 transition-all duration-200
                       flex items-center gap-2 text-xs md:text-sm"
          >
            <FaArrowUp className="size-4" />
            <span>{newPostCount} new post(s)</span>
          </button>
        )}

        <div ref={scrollableContentRef}>
          {" "}
          {/* Ensure this div is scrollable if mainFeedRef is not */}
          <CreatePost />
          <Posts feedType={feedType} openImageModal={openImageModal} />
        </div>
      </div>
    </>
  );
};

export default HomePage;
