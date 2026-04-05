import { useState } from "react";
import { FaArrowLeft } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";
import { HiOutlineInformationCircle } from "react-icons/hi"; // Import a new icon for info/rules
import { IoChatbubblesOutline } from "react-icons/io5";

const PublicChatHeader = () => {
  const navigate = useNavigate();
  const [showRulesModal, setShowRulesModal] = useState(false);

  const toggleRulesModal = () => {
    setShowRulesModal(!showRulesModal);
  };

  return (
    <div className="fixed top-0 z-[40] flex w-full items-center justify-between bg-black bg-opacity-20 px-4 py-2 backdrop-blur-md md:w-[977px]">
      <div className="flex items-center gap-3">
        <div className="avatar">
          <button
            onClick={() => navigate(-1)}
            className="mr-2 block flex-shrink-0 rounded-full p-2.5 transition duration-200 hover:bg-gray-800 hover:text-white md:hidden"
          >
            <FaArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center">
            <IoChatbubblesOutline size={30} />
          </div>
        </div>
        <div>
          <h2 className="flex-1 truncate text-xl font-bold">Public Chat</h2>
        </div>
      </div>

      {/* Rules Button */}
      <div className="relative">
        <button
          onClick={toggleRulesModal}
          className="btn btn-circle btn-ghost"
          aria-expanded={showRulesModal}
          aria-controls="public-chat-rules-modal"
        >
          <HiOutlineInformationCircle size={24} />
        </button>

        {/* Rules Modal/Dropdown */}
        {showRulesModal && (
          <>
            <div
              className="fixed inset-0 h-screen bg-transparent"
              onClick={() => setShowRulesModal(false)}
            />
            <div
              id="public-chat-rules-modal"
              className="animate-fade-in-down absolute right-0 z-50 mt-2 w-72 rounded-lg bg-base-200 p-4 shadow-xl md:w-96"
              // Optional: Add a click handler to close when clicking outside
            >
              <h3 className="mb-2 text-center text-lg font-bold">Welcome to the Public Chat!</h3>
              <p className="mb-4 text-center text-sm text-gray-400">
                This is a shared space for all users. Please keep it friendly and respectful.
              </p>
              <div className="max-h-60 overflow-y-auto text-sm">
                <h4 className="mb-2 text-base font-semibold">Community Guidelines:</h4>
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    **Be Respectful:** Treat everyone with kindness. No hate speech, harassment, or
                    personal attacks.
                  </li>
                  <li>
                    **Keep it PG-13:** Avoid explicit, offensive, or otherwise inappropriate
                    content.
                  </li>
                  <li>
                    **No Spamming:** Don't flood the chat with repetitive messages, excessive
                    emojis, or unapproved links.
                  </li>
                  {/* <li>
                  **Stay on Topic (Generally):** While casual conversation is fine, try to
                  keep discussions relevant to the community's purpose.
                </li> */}
                  <li>
                    **Protect Your Privacy:** Do not share personal information (yours or others').
                  </li>
                  <li>**No Impersonation:** Do not pretend to be another user.</li>
                  <li>
                    **Report Issues:** If you see something that violates these rules, message
                    Wayne. (report button soon maybe)
                  </li>
                  <li>**Listen to Admins:** Instructions from admins are final.</li>
                </ul>
              </div>
              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowRulesModal(false)}
                  className="btn btn-outline btn-primary btn-sm"
                >
                  Got it!
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
};

export default PublicChatHeader;
