// import { useLayoutEffect } from "react";
// import { useLocation } from "react-router-dom";

// const ScrollToTop = () => {
//   const { pathname } = useLocation();

//   useLayoutEffect(() => {
//     if (window.history.scrollRestoration) {
//       window.history.scrollRestoration = "manual";
//     }
//   }, []); 

//   useLayoutEffect(() => {
//     window.scrollTo(0, 0);
//   }, [pathname]);

//   return null;
// };

// export default ScrollToTop;

// src/components/common/ScrollToTop.jsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // "document.documentElement.scrollTo" is generally preferred for full page scroll
    // You can use { behavior: "smooth" } for a smooth scroll, or "instant" for immediate jump
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant" // Or "smooth" if you prefer
    });
  }, [pathname]); // Re-run this effect whenever the pathname changes

  return null; // This component doesn't render anything itself
};

export default ScrollToTop;