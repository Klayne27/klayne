import { useState, useEffect, useCallback } from "react";

export const useIsMobile = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= breakpoint);

  const checkIsMobile = useCallback(() => {
    setIsMobile(window.innerWidth <= breakpoint);
  }, [breakpoint]);

  useEffect(() => {
    checkIsMobile();

    window.addEventListener("resize", checkIsMobile);

    return () => {
      window.removeEventListener("resize", checkIsMobile);
    };
  }, [checkIsMobile]);

  return isMobile;
};
