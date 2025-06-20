import { useState, useRef, useEffect } from "react";

import Posts from "../../components/common/Posts";
import CreatePost from "./CreatePost";

const HomePage = () => {
  const [feedType, setFeedType] = useState("forYou");
  const mainFeedRef = useRef(null);
  const [headerWidth, setHeaderWidth] = useState("auto");
  const scrollableContentRef = useRef(null);

  useEffect(() => {
    const updateWidth = () => {
      if (mainFeedRef.current) {
        setHeaderWidth(mainFeedRef.current.clientWidth + "px");
      }
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);

    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const handleTabClick = (type) => {
    setFeedType(type);

    if (scrollableContentRef.current) {
      setTimeout(() => {
        if (scrollableContentRef.current) {
          scrollableContentRef.current.scrollTop = 0;
        }
      }, 50);
    }
  };

  return (
    <>
      <div
        ref={mainFeedRef}
        className="flex-[4_4_0] mr-auto border-r border-gray-700 min-h-screen"
      >
        <div
          className="fixed top-0 z-10
                     border-b border-gray-700 bg-opacity-20 backdrop-blur-md"
          style={{ width: headerWidth }}
        >
          <div className="flex w-full">
            <div
              className={
                "flex justify-center flex-1 p-3 hover:bg-secondary hover:bg-opacity-50 transition duration-300 cursor-pointer relative"
              }
              onClick={() => handleTabClick("forYou")}
            >
              For you
              {feedType === "forYou" && (
                <div className="absolute bottom-0 w-10 h-1 rounded-full bg-primary"></div>
              )}
            </div>
            <div
              className="flex justify-center flex-1 p-3 hover:bg-secondary hover:bg-opacity-50 transition duration-300 cursor-pointer relative"
              onClick={() => handleTabClick("following")}
            >
              Following
              {feedType === "following" && (
                <div className="absolute bottom-0 w-10 h-1 rounded-full bg-primary"></div>
              )}
            </div>
          </div>
        </div>

        <div ref={scrollableContentRef}>
          <CreatePost />
          {/* onPostsFetched prop on Posts is NOT directly causing the scroll back */}
          <Posts feedType={feedType} />
        </div>
      </div>
    </>
  );
};

export default HomePage;
