import React, { useState, useEffect } from "react";
import LoadingSpinner from "./LoadingSpinner"; // Adjust path as needed
import useFollow from "../../hooks/usersHooks/useFollow";

const FollowButton = ({
  user,
  isFollowing: initialIsFollowing,
  currentUserId,
  openUnfollowModal,
}) => {
  const [isHoveringUnfollow, setIsHoveringUnfollow] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const { follow, isPending } = useFollow();

  // Use a local state for `isFollowing` to allow immediate UI update
  // while `useFollow` hook potentially updates `currentUser` context
  const [isCurrentlyFollowing, setIsCurrentlyFollowing] = useState(initialIsFollowing);

  useEffect(() => {
    setIsCurrentlyFollowing(initialIsFollowing);
  }, [initialIsFollowing]);

  // Effect to detect touch devices (same as before)
  useEffect(() => {
    const checkTouch = () => {
      return (
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0 ||
        navigator.msMaxTouchPoints > 0
      );
    };
    setIsTouchDevice(checkTouch());
  }, []);

  const handleFollowClick = (e) => {
    e.preventDefault(); // Prevent default link behavior
    if (isCurrentlyFollowing) {
      openUnfollowModal(user); // Open the modal if currently following
    } else {
      follow(user._id);
      // Optimistic UI update: Toggle `isCurrentlyFollowing` immediately
      setIsCurrentlyFollowing((prev) => !prev);
    }
  };

  return (
    <button
      className={`
        flex items-center justify-center font-semibold text-sm rounded-full px-3 py-1 transition duration-200
        md:min-w-[90px] md:text-center border border-accent
        ${
          // Initial state for "Follow" button
          !isCurrentlyFollowing
            ? "bg-secondary/40 md:hover:bg-secondary transition duration-200"
            : // Initial state for "Following" button
              "bg-base-100" // Added a subtle border for consistency
        }
        ${
          // Apply red styles ONLY if following, hovering AND NOT a touch device
          isCurrentlyFollowing && isHoveringUnfollow && !isTouchDevice
            ? "bg-red-700/20 border-red-600 text-red-600"
            : ""
        }
      `}
      onClick={handleFollowClick}
      onMouseEnter={!isTouchDevice ? () => setIsHoveringUnfollow(true) : undefined}
      onMouseLeave={!isTouchDevice ? () => setIsHoveringUnfollow(false) : undefined}
      disabled={isPending} // Disable button during pending follow/unfollow action
    >
      {isCurrentlyFollowing
        ? isHoveringUnfollow && !isTouchDevice
          ? "Unfollow"
          : "Following"
        : "Follow"}
    </button>
  );
};

export default FollowButton;
