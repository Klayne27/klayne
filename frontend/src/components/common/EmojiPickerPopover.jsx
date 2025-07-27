import React, { useEffect, useRef } from "react";
import ReactDOM from "react-dom"; // Import ReactDOM for portals
import EmojiPicker from "emoji-picker-react"; // Import the EmojiPicker library
import { useState } from "react";

const EmojiPickerPopover = ({ position, onClose, onEmojiClick, triggerRef }) => {
  const popoverRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if the click occurred outside the popover AND outside the trigger button
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose, triggerRef]); // Add triggerRef to dependencies

  // Define the style for the popover container
  const popoverStyle = {
    position: "absolute",
    top: position.top,
    left: position.left,
    transform: "translateX(-50%)", // Centering relative to `left`
    zIndex: 1000, // Ensure it's above other content
  };

  // Get the portal root element (defined in public/index.html)
  const portalRoot = document.getElementById("emoji-popover-root");
  if (!portalRoot) {
    console.error("Portal root 'emoji-popover-root' not found in document.");
    return null; // Or handle this error appropriately
  }

  return ReactDOM.createPortal(
    <div
      ref={popoverRef}
      style={popoverStyle}
      className="emoji-picker-popover-container" // Add a class for specific styling if needed
    >
      <EmojiPicker
        onEmojiClick={onEmojiClick} // Pass the handler from parent
        width={280} // Adjust width as needed
        height={400} // Adjust height as needed
        theme="dark" // Or 'light', or use your app's theme
        skinTonesDisabled={false} // Enable/disable skin tones if desired
        autoFocusSearch={false}
      />
    </div>,
    portalRoot // This is where the popover will be rendered in the DOM
  );
};

export default EmojiPickerPopover;
