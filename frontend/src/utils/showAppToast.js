import toast from "react-hot-toast";

// Define a consistent ID for the single toast
const SINGLE_TOAST_ID = "app-single-toast";

// Define the common styling for your Twitter/X-like toast
const commonToastStyle = {
  background: "#1DA1F2", // Twitter Blue background
  color: "#fff",
  borderRadius: "8px",
  padding: "12px 16px",
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
  fontSize: "15px",
  fontWeight: "500",
  marginBottom: "45px", // Higher from the bottom
};

export const showAppToast = (message, type = "blank") => {
  const options = {
    id: SINGLE_TOAST_ID, // Use the common ID
    style: { ...commonToastStyle }, // Spread common style
    duration: 3000, // Default duration
  };

  switch (type) {
    case "success":
      toast.success(message, {
        ...options,
        duration: 2000, // Shorter duration for success
      });
      break;
    case "error":
      toast.error(message, {
        ...options,
        style: {
          ...options.style, // Merge common styles
          background: "#ef4444", // Tailwind red-500 for error
        },
      });
      break;
    default:
      toast(message, options);
      break;
  }
};

// You can also export the 'toast' instance directly if you need its other methods
export default toast;
