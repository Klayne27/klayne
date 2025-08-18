import toast from "react-hot-toast";

const SINGLE_TOAST_ID = "app-single-toast";

const commonToastStyle = {
  background: "#1DA1F2",
  color: "#fff",
  borderRadius: "4px",
  padding: "8px 16px",
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
  fontSize: "15px",
  fontWeight: "500",
  marginBottom: "60px",
  zIndex: 9999
};

export const showAppToast = (message, type = "blank") => {

  const options = {
    id: SINGLE_TOAST_ID,
    style: { ...commonToastStyle },
    duration: 3000, 
  };

  switch (type) {
    case "success":
      toast.success(message, {
        ...options,
        duration: 2000,
      });
      break;
    case "error":
      toast.error(message, {
        ...options,
        style: {
          ...options.style,
        },
      });
      break;
    default:
      toast(message, options);
      break;
  }
};

export default toast;
