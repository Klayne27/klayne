// hooks/useEmojiPickerPopover.js
import { useState, useCallback } from "react";

export const useEmojiPickerPopover = (initialState = false) => {
  const [showEmojiPickerPopover, setShowEmojiPickerPopover] = useState(initialState);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });

  const handleOpenEmojiPickerPopover = useCallback(
    (e, setShowMoreActionsModal = null) => {
      // Make setShowMoreActionsModal optional
      e.stopPropagation();

      // Only call if setShowMoreActionsModal is provided (it might not be needed in all contexts)
      if (setShowMoreActionsModal) {
        setShowMoreActionsModal(false); // Close more actions modal if open
      }

      if (showEmojiPickerPopover) {
        setShowEmojiPickerPopover(false);
        return;
      }

      const buttonRect = e.currentTarget.getBoundingClientRect();
      // These could potentially be made configurable options in the future
      const estimatedPickerWidth = window.innerWidth < 768 ? 280 : 350;
      const estimatedPickerHeight = window.innerWidth < 768 ? 400 : 400;

      let newTop = buttonRect.top - estimatedPickerHeight - 10;
      let newLeft = buttonRect.left + buttonRect.width / 2;

      const padding = 10;

      // Adjust left position
      if (newLeft - estimatedPickerWidth / 2 < padding) {
        newLeft = estimatedPickerWidth / 2 + padding;
      }
      if (newLeft + estimatedPickerWidth / 2 > window.innerWidth - padding) {
        newLeft = window.innerWidth - estimatedPickerWidth / 2 - padding;
      }
      // Adjust top position
      if (newTop < padding) {
        newTop = buttonRect.bottom + 10;
      }

      setPopoverPosition({ top: newTop, left: newLeft });
      setShowEmojiPickerPopover(true);
    },
    [showEmojiPickerPopover] // Dependency array for useCallback
  );

  // Function to close the popover explicitly (useful for clicks outside)
  const handleCloseEmojiPickerPopover = useCallback(() => {
    setShowEmojiPickerPopover(false);
  }, []);

  return {
    showEmojiPickerPopover,
    setShowEmojiPickerPopover, // Expose setter if you need to control it externally
    popoverPosition,
    handleOpenEmojiPickerPopover,
    handleCloseEmojiPickerPopover,
  };
};
