import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

const SCROLL_POS_KEY_PREFIX = "scrollPos_";

export const ScrollRestorationManager = ({ children }) => {
  const location = useLocation();
  // If your main scrollable content is a specific div (e.g., with overflow-y: scroll),
  // you would assign this ref to that div. Otherwise, it defaults to window scroll.
  const scrollElementRef = useRef(null);

  // A ref to keep track of the latest pathname to avoid stale closures in event listeners
  const latestPathname = useRef(location.pathname);

  // Update the latest pathname ref whenever location.pathname changes
  useEffect(() => {
    latestPathname.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    // --- Function to Save Scroll Position on Page Hide ---
    const handlePageHide = () => {
      const currentPath = latestPathname.current; // Use the ref for the latest path
      const currentScrollY = scrollElementRef.current
        ? scrollElementRef.current.scrollTop // For a specific scrollable div
        : window.scrollY; // For the main window scrollbar

      sessionStorage.setItem(
        SCROLL_POS_KEY_PREFIX + currentPath,
        currentScrollY.toString()
      );
      console.log(`[ScrollManager] Saved scroll for ${currentPath}: ${currentScrollY}`);
    };

    // --- Function to Restore Scroll Position on Page Show ---
    const handlePageShow = (event) => {
      // **CRITICAL:** ONLY restore scroll if the page is coming from BFcache
      if (event.persisted) {
        const currentPath = latestPathname.current; // Use the ref for the latest path
        const savedScrollY = sessionStorage.getItem(SCROLL_POS_KEY_PREFIX + currentPath);

        if (savedScrollY) {
          const scrollValue = parseInt(savedScrollY, 10);
          // Use requestAnimationFrame for smoother scrolling, ensuring DOM is rendered
          requestAnimationFrame(() => {
            if (scrollElementRef.current) {
              scrollElementRef.current.scrollTop = scrollValue;
            } else {
              window.scrollTo(0, scrollValue);
            }
            console.log(
              `[ScrollManager] Restored scroll from BFcache for ${currentPath}: ${scrollValue}`
            );
          });
        }
      } else {
        // If not coming from BFcache (e.g., fresh load, internal <Link> click),
        // we DO NOT manually restore scroll.
        // Let the browser's default behavior or React Router's <ScrollRestoration /> handle it.
        console.log(
          `[ScrollManager] Pageshow (not persisted) for ${latestPathname.current}. Letting browser/Router handle scroll.`
        );
      }
    };

    // Add event listeners
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("pageshow", handlePageShow);

    // Cleanup function for the useEffect hook
    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []); // Empty dependency array: this effect sets up listeners once on mount
  // The `latestPathname` ref ensures the handlers always use the current path.

  // Render children. If you use a specific scrollable div, wrap your children with it:
  // return <div ref={scrollElementRef} style={{ overflowY: 'auto', height: '100vh' }}>{children}</div>;
  return <>{children}</>;
};
