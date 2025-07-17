// src/components/publicChat/PublicChatHeader.jsx
import React from "react";
import { FaArrowLeft } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";
// No need for Link or FaArrowLeft as there's no internal back within the chat component
// import { Link } from "react-router-dom";
// import { FaArrowLeft } from "react-icons/fa";

const PublicChatHeader = () => {
  // Removed onBackToPublicChatList prop
  // No longer checking isMobile here, as the back button logic is now external
  // const isMobile = window.innerWidth < 768;

  const navigate = useNavigate()

  return (
    <div className="sticky top-0 z-10 bg-base-200 p-4 flex items-center justify-between shadow-md">
      {/* Removed mobile back button as it's no longer needed within the component */}
      {/* {isMobile && (
        <button onClick={onBackToPublicChatList} className="btn btn-ghost btn-circle mr-2">
          <FaArrowLeft className="w-5 h-5" />
        </button>
      )} */}
      <div className="flex items-center gap-3">
        <div className="avatar ">
          <button
            onClick={() => navigate(-1)}
            className="hover:bg-gray-800 rounded-full p-2.5 transition duration-200"
          >
            <FaArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-10 rounded-full">
            <img src="/avatar-placeholder.png" alt="Public Chat Avatar" />{" "}
            {/* Or a specific public chat icon */}
          </div>
        </div>
        <div>
          <h2 className="text-lg font-bold">Public Chat</h2>
        </div>
      </div>
    </div>
  );
};

export default PublicChatHeader;
