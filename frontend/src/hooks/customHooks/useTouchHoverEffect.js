import { useState, useCallback, useEffect, useRef } from "react";
export const useTouchHoverEffect = (activeStateDelay = 200) => {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [activeButtonId, setActiveButtonId] = useState(null);
  const touchTimerRef = useRef(null);

  useEffect(() => {
    setIsTouchDevice(
      "ontouchstart" in window ||
        navigator.maxTouchPoints > 0 ||
        navigator.msMaxTouchPoints > 0
    );
  }, []);

  const clearActiveButtonTimer = useCallback(() => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  }, []);

  const handleTouchStart = useCallback(
    (id) => {
      if (isTouchDevice) {
        clearActiveButtonTimer();
        setActiveButtonId(id);
      }
    },
    [isTouchDevice, clearActiveButtonTimer]
  );

  const handleTouchEnd = useCallback(() => {
    if (isTouchDevice) {
      clearActiveButtonTimer();
      touchTimerRef.current = setTimeout(() => {
        setActiveButtonId(null);
      }, activeStateDelay);
    }
  }, [isTouchDevice, activeStateDelay, clearActiveButtonTimer]);

  const handleTouchCancel = useCallback(() => {
    if (isTouchDevice) {
      clearActiveButtonTimer();
      touchTimerRef.current = setTimeout(() => {
        setActiveButtonId(null);
      }, activeStateDelay);
    }
  }, [isTouchDevice, activeStateDelay, clearActiveButtonTimer]);

  useEffect(() => {
    return () => {
      clearActiveButtonTimer();
    };
  }, [clearActiveButtonTimer]);

  return {
    isTouchDevice,
    activeButtonId,
    handleTouchStart,
    handleTouchEnd,
    handleTouchCancel,
  };
};
