// src/components/publicChat/PublicChatHeader.jsx
import React from "react";
import { FaArrowLeft } from "react-icons/fa6";
import { IoChatbubbleEllipsesOutline } from "react-icons/io5";
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
    <div className="fixed w-full md:w-[1015px] top-0 z-10 bg-black px-4 py-3 flex items-center justify-between bg-opacity-20 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="avatar">
          <button
            onClick={() => navigate(-1)}
            className="hover:bg-gray-800 rounded-full block md:hidden p-2.5 transition duration-200"
          >
            <FaArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center">
            <IoChatbubbleEllipsesOutline size={30} />
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
