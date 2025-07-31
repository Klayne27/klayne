import { useState } from "react";
import { FaArrowLeft } from "react-icons/fa6";
import { IoChatbubbleEllipsesOutline } from "react-icons/io5";
import { useNavigate } from "react-router-dom";
import { HiOutlineInformationCircle } from "react-icons/hi"; // Import a new icon for info/rules

const PublicChatHeader = () => {
  const navigate = useNavigate();
  const [showRulesModal, setShowRulesModal] = useState(false);

  const toggleRulesModal = () => {
    setShowRulesModal(!showRulesModal);
  };

  return (
    <div className="text-white fixed w-full md:w-[1015px] top-0 z-[1000] bg-black px-4 py-2 flex items-center justify-between bg-opacity-20 backdrop-blur-md">
      <div className="flex items-center gap-3 text-white">
        <div className="avatar">
          <button
            onClick={() => navigate(-1)}
            className="hover:bg-gray-800 block md:hidden rounded-full mr-2 p-2.5 transition duration-200 flex-shrink-0"
          >
            <FaArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center">
            <IoChatbubbleEllipsesOutline size={30} />
          </div>
        </div>
        <div>
          <h2 className="font-bold text-xl flex-1 truncate ">Public Chat</h2>
        </div>
      </div>

      {/* Rules Button */}
      <div className="relative">
        <button
          onClick={toggleRulesModal}
          className="btn btn-ghost btn-circle"
          aria-expanded={showRulesModal}
          aria-controls="public-chat-rules-modal"
        >
          <HiOutlineInformationCircle size={24} />
        </button>

        {/* Rules Modal/Dropdown */}
        {showRulesModal && (
          <div
            id="public-chat-rules-modal"
            className="absolute right-0 mt-2 w-72 md:w-96 bg-base-200 rounded-lg shadow-xl p-4 z-50 animate-fade-in-down"
            // Optional: Add a click handler to close when clicking outside
            // onBlur={() => setShowRulesModal(false)} // This might be tricky with focus
            // tabIndex="-1" // Make it focusable to enable onBlur
          >
            <h3 className="font-bold text-lg mb-2 text-center">
              Welcome to the Public Chat!
            </h3>
            <p className="text-sm text-center mb-4 text-gray-400">
              This is a shared space for all users. Please keep it friendly and
              respectful.
            </p>
            <div className="max-h-60 overflow-y-auto text-sm ">
              <h4 className="font-semibold text-base mb-2">Community Guidelines:</h4>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  **Be Respectful:** Treat everyone with kindness. No hate speech,
                  harassment, or personal attacks.
                </li>
                <li>
                  **Keep it PG-13:** Avoid explicit, offensive, or otherwise inappropriate
                  content.
                </li>
                <li>
                  **No Spamming:** Don't flood the chat with repetitive messages,
                  excessive emojis, or unapproved links.
                </li>
                {/* <li>
                  **Stay on Topic (Generally):** While casual conversation is fine, try to
                  keep discussions relevant to the community's purpose.
                </li> */}
                <li>
                  **Protect Your Privacy:** Do not share personal information (yours or
                  others').
                </li>
                <li>**No Impersonation:** Do not pretend to be another user.</li>
                <li>
                  **Report Issues:** If you see something that violates these rules,
                  message Wayne. (report button soon maybe)
                </li>
                <li>**Listen to Admins:** Instructions from admins are final.</li>
              </ul>
            </div>
            <div className="text-center mt-4">
              <button
                onClick={() => setShowRulesModal(false)}
                className="btn btn-sm btn-outline btn-primary"
              >
                Got it!
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicChatHeader;
