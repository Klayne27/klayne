import { useCallback, useState } from "react";

export const useOpenMoreActionsModal = ({ setShowEmojiPickerPopover, isEditable }) => {
  const [showMoreActionsModal, setShowMoreActionsModal] = useState(false); // New state for more actions modal
  const [moreActionsModalPosition, setMoreActionsModalPosition] = useState({
    top: 0,
    left: 0,
  });

  const handleOpenMoreActionsModal = useCallback(
    (e) => {
      e.stopPropagation();
      setShowEmojiPickerPopover(false);
      if (showMoreActionsModal) {
        setShowMoreActionsModal(false);
        return;
      }

      const buttonRect = e.currentTarget.getBoundingClientRect();
      const modalWidth = 180; // Approximate width of the Discord-like modal
      const itemHeight = 38; // px per action item (approximate, including padding)
      const numItems = isEditable ? 3 : 2; // Reply, Edit, Delete (3) or Reply, Delete (2)
      const estimatedModalHeight = numItems * itemHeight + 10; // Add some vertical padding for the modal itself

      const modalHeight = estimatedModalHeight;

      // Calculate newLeft to position the modal to the left of the button.
      let newLeft = buttonRect.left - modalWidth;

      // Add a small offset (e.g., 5-10px) to the left for better visual spacing.
      const offsetLeft = 5;
      newLeft = buttonRect.left - modalWidth - offsetLeft;

      // Ensure the modal doesn't go off the left edge of the screen
      if (newLeft < 10) {
        // Keep a minimum 10px padding from the left edge
        newLeft = 10;
      }
      let newTop = buttonRect.top + buttonRect.height / 2 - modalHeight / 2;

      // Ensure the modal doesn't go off the top or bottom edge of the screen
      const paddingVertical = 10; // Minimum padding from top/bottom viewport edge
      if (newTop < paddingVertical) {
        // If it goes off the top
        newTop = paddingVertical;
      }
      if (newTop + modalHeight > window.innerHeight - paddingVertical) {
        // If it goes off the bottom
        newTop = window.innerHeight - modalHeight - paddingVertical;
      }

      setMoreActionsModalPosition({ top: newTop, left: newLeft });
      setShowMoreActionsModal(true);
    },
    [showMoreActionsModal, isEditable, setShowEmojiPickerPopover]
  );

  return {
    moreActionsModalPosition,
    handleOpenMoreActionsModal,
    setShowMoreActionsModal,
    showMoreActionsModal,
  };
};
