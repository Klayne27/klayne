import { useState, useRef, useEffect } from "react";

import Posts from "../../components/common/posts/Posts";
import CreatePost from "./CreatePost";
// import { useFetchPinnedPosts } from "../../hooks/postsHooks/useFetchPinnedPosts";

const HomePage = ({ openImageModal, showUnfollowModal }) => {
  const [feedType, setFeedType] = useState("forYou");
  const mainFeedRef = useRef(null);
  const [headerWidth, setHeaderWidth] = useState("auto");
  const scrollableContentRef = useRef(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [activeTab, setActiveTab] = useState(null); // To control the active state for touch feedback

  useEffect(() => {
    const updateWidth = () => {
      if (mainFeedRef.current) {
        setHeaderWidth(mainFeedRef.current.clientWidth + "px");
      }
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);

    // Detect if it's a touch device
    // This is a common heuristic, but not foolproof.
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
  };

  const handleTouchStart = (type) => {
    if (isTouchDevice) {
      setActiveTab(type);
    }
  };

  const handleTouchEnd = () => {
    if (isTouchDevice) {
      // Use a timeout to allow the transition to be visible before clearing
      // This timeout should be *at least* as long as your CSS transition duration
      setTimeout(() => {
        setActiveTab(null);
      }, 150); // <-- Adjust this duration if your transition is longer/shorter
    }
  };

  return (
    <>
      <div
        ref={mainFeedRef}
        className="flex-[4_4_0] mr-auto  border-accent min-h-screen "
      >
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
                    ? "bg-secondary bg-opacity-50 transition duration-300" // Added transition here!
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
              onTouchCancel={handleTouchEnd} // Good practice for touches that don't complete
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
                    ? "bg-secondary bg-opacity-50 transition duration-300" // Added transition here!
                    : ""
                }
                // Always include the base transition for the element if it's not handled by hover:
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

        <div
          ref={scrollableContentRef}

        >
          <CreatePost />
          <Posts
            feedType={feedType}
            openImageModal={openImageModal}
            // pinnedPosts={pinnedPosts}
          />
        </div>
      </div>
    </>
  );
};

export default HomePage;
