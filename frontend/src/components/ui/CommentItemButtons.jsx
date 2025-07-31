import { useCallback, useEffect, useState } from "react";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";
import { FaHeart, FaRegHeart, FaReply } from "react-icons/fa6";
import { FaChevronDown, FaChevronUp } from "react-icons/fa6";



function CommentItemButtons({
  onLikeCommentClick,
  isLikingComment,
  comment,
  isAnimating,
  onToggleReplyInput,
  showReplyInput,
  onToggleRepliesVisibility,
  showRepliesSection,
}) {
  const { authUser } = useAuthUser();
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [activeButton, setActiveButton] = useState(null);

  const isCommentLiked = authUser && comment.likes?.includes(authUser._id);

  useEffect(() => {
    setIsTouchDevice(
      "ontouchstart" in window ||
        navigator.maxTouchPoints > 0 ||
        navigator.msMaxTouchPoints > 0
    );
  }, []);

  const handleTouchStart = useCallback(
    (id) => {
      if (isTouchDevice) {
        setActiveButton(id);
      }
    },
    [isTouchDevice]
  );

  const handleTouchEnd = useCallback(() => {
    if (isTouchDevice) {
      setTimeout(() => {
        setActiveButton(null);
      }, 150);
    }
  }, [isTouchDevice]);

  const handleTouchCancel = useCallback(() => {
    if (isTouchDevice) {
      setTimeout(() => {
        setActiveButton(null);
      }, 150);
    }
  }, [isTouchDevice]);

  return (
    <>
      <button
        onClick={onLikeCommentClick}
        onTouchStart={() => handleTouchStart("like")}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        disabled={isLikingComment}
        className="flex items-center cursor-pointer group"
      >
        <div
          className={`
                                            rounded-full p-2 duration-200 transition relative
                                            ${
                                              !isTouchDevice
                                                ? "group-hover:bg-pink-600 group-hover:bg-opacity-15"
                                                : ""
                                            }
                                            ${
                                              isTouchDevice && activeButton === "like"
                                                ? "bg-pink-600 bg-opacity-15"
                                                : ""
                                            }
                                            cursor-pointer
                                        `}
        >
          {!isCommentLiked && (
            <FaRegHeart
              className={`
                                                        w-4 h-4 text-slate-500 group-hover:text-pink-600 duration-200 transition
                                                        ${
                                                          isAnimating && !isCommentLiked
                                                            ? "animate-like-bounce"
                                                            : ""
                                                        }
                                                    `}
            />
          )}
          {isCommentLiked && (
            <FaHeart
              className={`
                                                        w-4 h-4 text-pink-600 duration-200 transition
                                                        ${
                                                          isAnimating && isCommentLiked
                                                            ? "animate-like-bounce"
                                                            : ""
                                                        }
                                                    `}
            />
          )}
        </div>
        <span
          className={`text-sm group-hover:text-pink-600 duration-200 transition ${
            isCommentLiked ? "text-pink-600 " : "text-slate-500"
          }`}
        >
          {comment.likes?.length || 0}
        </span>
      </button>

      {authUser && (
        // --- REPLY BUTTON ---
        <button
          onClick={onToggleReplyInput}
          className="flex items-center cursor-pointer group"
          onTouchStart={() => handleTouchStart("reply")} // Add touch start
          onTouchEnd={handleTouchEnd} // Add touch end
          onTouchCancel={handleTouchCancel} // Add touch cancel
        >
          <div
            className={`p-2 rounded-full duration-200 transition
                              ${
                                !isTouchDevice
                                  ? "group-hover:bg-sky-400 group-hover:bg-opacity-15"
                                  : ""
                              }
                              ${
                                isTouchDevice && activeButton === "reply"
                                  ? "bg-sky-400 bg-opacity-15"
                                  : ""
                              }
                            `}
          >
            {showReplyInput ? (
              <FaReply
                className="w-4 h-4 rotate-180 text-sky-400 duration-200 transition"
                strokeWidth={10}
              />
            ) : (
              <FaReply
                className={`w-4 h-4 duration-200 transition
                                    ${
                                      !isTouchDevice
                                        ? "text-slate-500 group-hover:text-sky-400"
                                        : ""
                                    }
                                    ${
                                      isTouchDevice && activeButton !== "reply"
                                        ? "text-slate-500"
                                        : activeButton === "reply"
                                        ? "text-sky-400"
                                        : "text-slate-500"
                                    }
                                `}
                strokeWidth={10}
              />
            )}
          </div>
          <span
            className={`text-sm duration-200 transition
                                ${
                                  !isTouchDevice
                                    ? showReplyInput
                                      ? "text-sky-400"
                                      : "text-slate-500 group-hover:text-sky-400"
                                    : ""
                                }
                                ${
                                  isTouchDevice
                                    ? showReplyInput
                                      ? "text-sky-400"
                                      : activeButton === "reply"
                                      ? "text-sky-400"
                                      : "text-slate-500"
                                    : ""
                                }
                            `}
          >
            Reply
          </span>
        </button>
      )}

      {comment.repliesCount > 0 && (
        <button
          onClick={onToggleRepliesVisibility}
          className="flex items-center cursor-pointer group"
          onTouchStart={() => handleTouchStart("viewReplies")} // Add touch start
          onTouchEnd={handleTouchEnd} // Add touch end
          onTouchCancel={handleTouchCancel} // Add touch cancel
        >
          <div
            className={`p-2 rounded-full duration-200 transition
                              ${
                                !isTouchDevice
                                  ? "group-hover:bg-blue-500 group-hover:bg-opacity-15"
                                  : ""
                              }
                              ${
                                isTouchDevice && activeButton === "viewReplies"
                                  ? "bg-blue-500 bg-opacity-15"
                                  : ""
                              }
                            `}
          >
            {showRepliesSection ? (
              <FaChevronUp
                className="w-4 h-4 text-blue-500 duration-200 transition"
                strokeWidth={10}
              />
            ) : (
              <FaChevronDown
                className={`w-4 h-4 duration-200 transition
                                    ${
                                      !isTouchDevice
                                        ? "text-slate-500 group-hover:text-blue-500"
                                        : ""
                                    }
                                    ${
                                      isTouchDevice && activeButton !== "viewReplies"
                                        ? "text-slate-500"
                                        : activeButton === "viewReplies"
                                        ? "text-blue-500"
                                        : "text-slate-500"
                                    }
                                `}
                strokeWidth={10}
              />
            )}
          </div>
          <span
            className={`text-sm duration-200 transition
                                ${
                                  !isTouchDevice
                                    ? showRepliesSection
                                      ? "text-blue-500"
                                      : "text-slate-500 group-hover:text-blue-500"
                                    : ""
                                }
                                ${
                                  isTouchDevice
                                    ? showRepliesSection
                                      ? "text-blue-500"
                                      : activeButton === "viewReplies"
                                      ? "text-blue-500"
                                      : "text-slate-500"
                                    : ""
                                }
                            `}
          >
            {comment.repliesCount || 0}{" "}
            {showRepliesSection ? "Hide Replies" : "View Replies"}
          </span>
        </button>
      )}
    </>
  );
}

export default CommentItemButtons;
