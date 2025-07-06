import { useState, useRef, useEffect } from "react";

import Posts from "../../components/common/posts/Posts";
import CreatePost from "./CreatePost";
// import { useFetchPinnedPosts } from "../../hooks/postsHooks/useFetchPinnedPosts";
import { useParams } from "react-router-dom";

const HomePage = ({ openImageModal }) => {
  const [feedType, setFeedType] = useState("forYou");
  const mainFeedRef = useRef(null);
  const [headerWidth, setHeaderWidth] = useState("auto");
  const scrollableContentRef = useRef(null);
  // const { username } = useParams();

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

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  };

  // const {
  //   pinnedPosts,
  //   isLoading: isLoadingPinnedPosts,
  //   isRefetching: isRefetchingPinnedPosts,
  // } = useFetchPinnedPosts(username);

  return (
    <>
      <div
        ref={mainFeedRef}
        className="flex-[4_4_0] mr-auto  border-accent min-h-screen"
      >
        <div
          className="fixed top-0 z-10
                     border-b border-accent"
        >
          <div
            className="flex w-full bg-opacity-20 backdrop-blur-md"
            style={{ width: headerWidth }}
          >
            <div
              className={
                "flex justify-center flex-1 p-3 hover:bg-secondary hover:bg-opacity-50 transition duration-300 cursor-pointer "
              }
              onClick={() => handleTabClick("forYou")}
            >
              For you
              {feedType === "forYou" && (
                <div className="absolute bottom-0 w-10 h-1 rounded-full bg-primary"></div>
              )}
            </div>
            <div
              className="flex justify-center flex-1 p-3 hover:bg-secondary transition duration-300 cursor-pointer "
              onClick={() => handleTabClick("following")}
            >
              Following
              {feedType === "following" && (
                <div className="absolute bottom-0 w-10 h-1 rounded-full bg-primary"></div>
              )}
            </div>
          </div>
        </div>

        <div ref={scrollableContentRef} className="">
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
