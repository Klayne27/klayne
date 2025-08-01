import { useCallback, useEffect, useState } from "react"
import { useAuthUser } from "../../hooks/authHooks/useAuthUser"
import { FaHeart, FaRegHeart, FaReply } from "react-icons/fa6"
import { FaChevronDown, FaChevronUp } from "react-icons/fa6"
import { useTouchHoverEffect } from "../../hooks/useTouchHoverEffect"

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
    const { authUser } = useAuthUser()
    // const [isTouchDevice, setIsTouchDevice] = useState(false);
    // const [activeButton, setActiveButton] = useState(null);

    const isCommentLiked = authUser && comment.likes?.includes(authUser._id)

    const {
        isTouchDevice,
        activeButtonId,
        handleTouchCancel,
        handleTouchEnd,
        handleTouchStart,
    } = useTouchHoverEffect()

    // useEffect(() => {
    //   setIsTouchDevice(
    //     "ontouchstart" in window ||
    //       navigator.maxTouchPoints > 0 ||
    //       navigator.msMaxTouchPoints > 0
    //   );
    // }, []);

    // const handleTouchStart = useCallback(
    //   (id) => {
    //     if (isTouchDevice) {
    //       setActiveButton(id);
    //     }
    //   },
    //   [isTouchDevice]
    // );

    // const handleTouchEnd = useCallback(() => {
    //   if (isTouchDevice) {
    //     setTimeout(() => {
    //       setActiveButton(null);
    //     }, 150);
    //   }
    // }, [isTouchDevice]);

    // const handleTouchCancel = useCallback(() => {
    //   if (isTouchDevice) {
    //     setTimeout(() => {
    //       setActiveButton(null);
    //     }, 150);
    //   }
    // }, [isTouchDevice]);

    return (
        <>
            <button
                onClick={onLikeCommentClick}
                onTouchStart={() => handleTouchStart("like")}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchCancel}
                disabled={isLikingComment}
                className="group flex cursor-pointer items-center"
            >
                <div
                    className={`relative rounded-full p-2 transition duration-200 ${
                        !isTouchDevice
                            ? "group-hover:bg-pink-600 group-hover:bg-opacity-15"
                            : ""
                    } ${
                        isTouchDevice && activeButtonId === "like"
                            ? "bg-pink-600 bg-opacity-15"
                            : ""
                    } cursor-pointer`}
                >
                    {!isCommentLiked && (
                        <FaRegHeart
                            className={`h-4 w-4 text-slate-500 transition duration-200 group-hover:text-pink-600 ${
                                isAnimating && !isCommentLiked
                                    ? "animate-like-bounce"
                                    : ""
                            } `}
                        />
                    )}
                    {isCommentLiked && (
                        <FaHeart
                            className={`h-4 w-4 text-pink-600 transition duration-200 ${
                                isAnimating && isCommentLiked
                                    ? "animate-like-bounce"
                                    : ""
                            } `}
                        />
                    )}
                </div>
                <span
                    className={`text-sm transition duration-200 group-hover:text-pink-600 ${
                        isCommentLiked ? "text-pink-600" : "text-slate-500"
                    }`}
                >
                    {comment.likes?.length || 0}
                </span>
            </button>

            {authUser && (
                // --- REPLY BUTTON ---
                <button
                    onClick={onToggleReplyInput}
                    className="group flex cursor-pointer items-center"
                    onTouchStart={() => handleTouchStart("reply")} // Add touch start
                    onTouchEnd={handleTouchEnd} // Add touch end
                    onTouchCancel={handleTouchCancel} // Add touch cancel
                >
                    <div
                        className={`rounded-full p-2 transition duration-200 ${
                            !isTouchDevice
                                ? "group-hover:bg-sky-400 group-hover:bg-opacity-15"
                                : ""
                        } ${
                            isTouchDevice && activeButtonId === "reply"
                                ? "bg-sky-400 bg-opacity-15"
                                : ""
                        } `}
                    >
                        {showReplyInput ? (
                            <FaReply
                                className="h-4 w-4 rotate-180 text-sky-400 transition duration-200"
                                strokeWidth={10}
                            />
                        ) : (
                            <FaReply
                                className={`h-4 w-4 transition duration-200 ${
                                    !isTouchDevice
                                        ? "text-slate-500 group-hover:text-sky-400"
                                        : ""
                                } ${
                                    isTouchDevice && activeButtonId !== "reply"
                                        ? "text-slate-500"
                                        : activeButtonId === "reply"
                                          ? "text-sky-400"
                                          : "text-slate-500"
                                } `}
                                strokeWidth={10}
                            />
                        )}
                    </div>
                    <span
                        className={`text-sm transition duration-200 ${
                            !isTouchDevice
                                ? showReplyInput
                                    ? "text-sky-400"
                                    : "text-slate-500 group-hover:text-sky-400"
                                : ""
                        } ${
                            isTouchDevice
                                ? showReplyInput
                                    ? "text-sky-400"
                                    : activeButtonId === "reply"
                                      ? "text-sky-400"
                                      : "text-slate-500"
                                : ""
                        } `}
                    >
                        Reply
                    </span>
                </button>
            )}

            {comment.repliesCount > 0 && (
                <button
                    onClick={onToggleRepliesVisibility}
                    className="group flex cursor-pointer items-center"
                    onTouchStart={() => handleTouchStart("viewReplies")} // Add touch start
                    onTouchEnd={handleTouchEnd} // Add touch end
                    onTouchCancel={handleTouchCancel} // Add touch cancel
                >
                    <div
                        className={`rounded-full p-2 transition duration-200 ${
                            !isTouchDevice
                                ? "group-hover:bg-blue-500 group-hover:bg-opacity-15"
                                : ""
                        } ${
                            isTouchDevice && activeButtonId === "viewReplies"
                                ? "bg-blue-500 bg-opacity-15"
                                : ""
                        } `}
                    >
                        {showRepliesSection ? (
                            <FaChevronUp
                                className="h-4 w-4 text-blue-500 transition duration-200"
                                strokeWidth={10}
                            />
                        ) : (
                            <FaChevronDown
                                className={`h-4 w-4 transition duration-200 ${
                                    !isTouchDevice
                                        ? "text-slate-500 group-hover:text-blue-500"
                                        : ""
                                } ${
                                    isTouchDevice &&
                                    activeButtonId !== "viewReplies"
                                        ? "text-slate-500"
                                        : activeButtonId === "viewReplies"
                                          ? "text-blue-500"
                                          : "text-slate-500"
                                } `}
                                strokeWidth={10}
                            />
                        )}
                    </div>
                    <span
                        className={`text-sm transition duration-200 ${
                            !isTouchDevice
                                ? showRepliesSection
                                    ? "text-blue-500"
                                    : "text-slate-500 group-hover:text-blue-500"
                                : ""
                        } ${
                            isTouchDevice
                                ? showRepliesSection
                                    ? "text-blue-500"
                                    : activeButtonId === "viewReplies"
                                      ? "text-blue-500"
                                      : "text-slate-500"
                                : ""
                        } `}
                    >
                        {comment.repliesCount || 0}{" "}
                        {showRepliesSection ? "Hide Replies" : "View Replies"}
                    </span>
                </button>
            )}
        </>
    )
}

export default CommentItemButtons
