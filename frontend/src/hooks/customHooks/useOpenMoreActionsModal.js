import { useCallback, useState } from "react";

export const useOpenMoreActionsModal = ({ setShowEmojiPickerPopover, isEditable }) => {
  const [showMoreActionsModal, setShowMoreActionsModal] = useState(false);
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
      const modalWidth = 180;
      const itemHeight = 60;
      const numItems = isEditable ? 3 : 2; 
      const estimatedModalHeight = numItems * itemHeight + 10;

      const modalHeight = estimatedModalHeight;

      let newLeft = buttonRect.left - modalWidth;

      const offsetLeft = 5;
      newLeft = buttonRect.left - modalWidth - offsetLeft;

      if (newLeft < 10) {
        newLeft = 10;
      }
      let newTop = buttonRect.top + buttonRect.height / 2 - modalHeight / 2;

      const paddingVertical = 50;
      if (newTop < paddingVertical) {
        newTop = paddingVertical;
      }
      if (newTop + modalHeight > window.innerHeight - paddingVertical) {
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
