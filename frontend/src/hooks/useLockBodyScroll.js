import { useLayoutEffect } from "react";

const useLockBodyScroll = (isOpen) => {
  useLayoutEffect(() => {
    // Get original body overflow
    const originalStyle = window.getComputedStyle(document.body).overflow;

    if (isOpen) {
      // Prevent scrolling on mount
      document.body.style.overflow = "hidden";
    }

    // Re-enable scrolling when component unmounts or isOpen becomes false
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [isOpen]); // Only re-run if isOpen changes
};

export default useLockBodyScroll;
