// src/components/publicChat/PublicChatMessage.jsx

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { MdDeleteForever } from "react-icons/md";
import { FaUserSlash, FaUserCheck } from "react-icons/fa";
import toast from "react-hot-toast";

const PublicChatMessage = ({
  message,
  authUser,
  openImageModal,
  onDelete,
  onBan,
  onUnban,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  console.log(message);

  const fromMe = message.sender._id === authUser._id;
  const chatAlignment = fromMe ? "justify-end" : "justify-start";

  // Using specific colors that resemble common chat UIs
  const myBubbleBgColor = "bg-primary"; // Primary color for my messages
  const othersBubbleBgColor = "bg-gray-700"; // Darker background for others' messages

  const textColor = "text-white"; // Assuming white text for both dark bubbles
  const linkColor = fromMe ? "text-blue-200" : "text-blue-400";

  const isSenderAdmin = message.sender.isAdmin;
  const isAuthUserAdmin = authUser.isAdmin;
  const isSenderBanned = message.sender.isBannedInPublicChat;

  // Bubble rounding based on the provided example
  const bubbleRounding = fromMe
    ? "rounded-3xl rounded-br-[4px]"
    : "rounded-3xl rounded-bl-[4px]";

  const handleDeleteClick = () => {
    if (window.confirm("Are you sure you want to delete this message?")) {
      onDelete(message._id);
      setIsDropdownOpen(false);
    }
  };

  const handleBanClick = () => {
    if (
      window.confirm(
        `Are you sure you want to ban ${message.sender.username} from the public chat?`
      )
    ) {
      onBan(message.sender._id);
      setIsDropdownOpen(false);
    }
  };

  const handleUnbanClick = () => {
    if (
      window.confirm(
        `Are you sure you want to unban ${message.sender.username} from the public chat?`
      )
    ) {
      onUnban(message.sender._id);
      setIsDropdownOpen(false);
    }
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const closeDropdown = () => {
    setIsDropdownOpen(false);
  };

  return (
    <div className={`flex mb-4 ${chatAlignment}`}>
      <div
        className={`flex gap-2 items-end ${
          fromMe ? "flex-row-reverse" : "flex-row"
        } max-w-full`}
      >
        {/* Avatar - Conditionally rendered for both sender and authUser */}
        {!fromMe && (
          <div className="flex-shrink-0">
            <Link to={`/profile/${message.sender.username}`}>
              <img
                alt="User Avatar"
                src={message.sender.profileImg || "/avatar-placeholder.png"}
                className="w-10 h-10 rounded-full object-cover mb-5"
              />
            </Link>
          </div>
        )}
        {/* <div className="flex-shrink-0">
          <Link to={`/profile/${message.sender.username}`}>
            <img
              alt="User Avatar"
              src={message.sender.profileImg || "/avatar-placeholder.png"}
              className="w-10 h-10 rounded-full object-cover mb-5"
            />
          </Link>
        </div> */}

        {/* Message Content Container (holds bubble and timestamp) */}
        <div className={`flex flex-col ${fromMe ? "items-end" : "items-start"} `}>
          {/* Header (Username, Admin/Banned badges) - Only for others' messages */}
          {!fromMe && (
            <div className="flex items-center text-sm mb-1">
              <Link
                to={`/profile/${message.sender.username}`}
                className={`font-semibold ${linkColor} mr-2`}
              >
                {message.sender.username}
                {isSenderAdmin && (
                  <span className="ml-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-400 text-yellow-900">
                    Admin
                  </span>
                )}
              </Link>
              {isSenderBanned && (
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-600 text-white">
                  Banned
                </span>
              )}
            </div>
          )}

          {/* Chat Bubble */}
          <div
            className={`
              relative p-3
              ${fromMe ? myBubbleBgColor : othersBubbleBgColor}
              ${textColor}
              ${bubbleRounding}
              flex flex-col
              max-w-[calc(100vw-100px)] sm:max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl 
            `}
          >
            {message.isDeletedByAdmin ? (
              <span className="italic text-gray-400">[Message Deleted]</span>
            ) : (
              <>
                {message.img && (
                  <div className="mb-2 w-60 h-auto rounded-lg overflow-hidden shadow-md border border-gray-600 cursor-pointer">
                    <img
                      src={message.img}
                      alt="Chat image"
                      className="w-full h-full object-cover"
                      onClick={() => openImageModal(message.img)}
                    />
                  </div>
                )}
                {message.content && (
                  <p className="whitespace-pre-wrap break-words text-sm ">
                    {message.content}
                  </p>
                )}
              </>
            )}

            {/* Admin Actions Dropdown (Only for admins, on other users' messages) */}
            {isAuthUserAdmin && !fromMe && (
              <div className="absolute top-1 -right-7">
                <button
                  onClick={toggleDropdown}
                  onBlur={(e) => {
                    setTimeout(() => {
                      if (!e.currentTarget.contains(document.activeElement)) {
                        closeDropdown();
                      }
                    }, 100);
                  }}
                  className="p-1 rounded-full text-gray-400 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-700 focus:ring-white"
                >
                  <span className="sr-only">Open options</span>
                  ...
                </button>
                {isDropdownOpen && (
                  <ul className="absolute left-1 mt-1 w-40 bg-gray-800 rounded-md shadow-lg py-1 z-10">
                    <li>
                      <button
                        onClick={handleDeleteClick}
                        className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 flex items-center gap-2"
                      >
                        <MdDeleteForever className="w-4 h-4" /> Delete Message
                      </button>
                    </li>
                    <li>
                      {isSenderBanned ? (
                        <button
                          onClick={handleUnbanClick}
                          className="w-full text-left px-4 py-2 text-sm text-green-400 hover:bg-gray-700 flex items-center gap-2"
                        >
                          <FaUserCheck className="w-4 h-4" /> Unban User
                        </button>
                      ) : (
                        <button
                          onClick={handleBanClick}
                          className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 flex items-center gap-2"
                        >
                          <FaUserSlash className="w-4 h-4" /> Ban User
                        </button>
                      )}
                    </li>
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Timestamp below the bubble */}
          <div
            className={`text-xs text-gray-400 mt-1 ${
              fromMe ? "self-end" : "self-start" // Align timestamp with its bubble
            }`}
          >
            <time className="mr-1">
              {new Date(message.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </time>
            <span>
              {new Date(message.createdAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicChatMessage;
