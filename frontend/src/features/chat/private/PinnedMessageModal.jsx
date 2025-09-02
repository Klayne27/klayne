import { BsXLg } from "react-icons/bs"
import { usePrivateChatStore } from "../../../store/usePrivateChatStore"
import PinnedMessageItem from "./PinnedMessageItem"
import { useGetPinnedMessages } from "./privateChatHooks/useGetPinnedMessages"
import { useUnpinMessage } from "./privateChatHooks/useUnpinMessage"
import LoadingSpinner from "../../../components/common/LoadingSpinner"
import { RiPushpinFill } from "react-icons/ri"
import { useChatViewStore } from "../../../store/useChatViewStore"

function PinnedMessagesModal({ isOpen, onClose }) {
  const { selectedConversation } = usePrivateChatStore()
  const { pinnedMessages, loadingPinnedMessages, isError, error } = useGetPinnedMessages(
    selectedConversation?._id,
  )

  const { setMessageIdToJumpTo } = useChatViewStore() // 👈 Get the action from the store

  const { unpinMessage, isUnpinning } = useUnpinMessage()

  const handleUnpinClick = (messageId) => {
    if (!messageId || !selectedConversation?._id) {
      console.error("Missing messageId or conversationId for unpin operation")
      return
    }

    unpinMessage({
      conversationId: selectedConversation._id,
      messageId: messageId,
    })
  }

  const handleJumpToMessage = (messageId) => {
    if (!messageId) return

    // 1. Set the target message ID in the global state
    setMessageIdToJumpTo(messageId)

    // 2. Close the modal
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-700/70 p-4"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-lg flex-col rounded-xl bg-base-100 shadow-xl md:h-[80vh] md:w-[60vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-accent p-4">
          <div className="flex items-center gap-2">
            <RiPushpinFill size={24} />
            <h2 className="text-xl font-bold">Pinned Messages</h2>
            {pinnedMessages?.length > 0 && (
              <span className="rounded-full bg-primary px-[9px] py-1 text-xs">
                {pinnedMessages.length}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white">
            <BsXLg size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {loadingPinnedMessages ? (
            <div className="flex h-full items-center justify-center">
              <LoadingSpinner size="lg" />
            </div>
          ) : isError ? (
            <div className="p-4 text-center text-red-400">
              <p>Error loading pinned messages</p>
              <p className="mt-1 text-sm text-slate-500">
                {error?.message || "Unknown error occurred"}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 text-sm text-blue-400 underline hover:text-blue-300"
              >
                Try refreshing the page
              </button>
            </div>
          ) : pinnedMessages && pinnedMessages.length > 0 ? (
            <div>
              {pinnedMessages.map((pinnedMessage) => {
                // Each pinnedMessage should have this structure:
                // { message: {...}, pinnedBy: {...}, pinnedAt: "..." }

                if (!pinnedMessage || !pinnedMessage.message) {
                  console.warn("Invalid pinned message structure:", pinnedMessage)
                  return null
                }

                return (
                  <PinnedMessageItem
                    key={`pinned-${pinnedMessage.message._id || pinnedMessage.message}`}
                    pinnedMessage={pinnedMessage}
                    onUnpinMessage={handleUnpinClick}
                    onJumpToMessage={handleJumpToMessage} // 👈 Pass the new handler      onJumpToMessage={handleJumpToMessage} // 👈 Pass the new handler
                  />
                )
              })}
              {isUnpinning && (
                <div className="flex items-center justify-center p-4">
                  <LoadingSpinner size="sm" />
                  <span className="ml-2 text-sm text-slate-400">Unpinning message...</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center text-slate-500">
              <RiPushpinFill size={48} className="mb-4 opacity-50" />
              <p className="text-lg font-medium">No pinned messages</p>
              <p className="mt-2 text-sm">
                Pin a message by hovering over it and selecting the pin option.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PinnedMessagesModal
