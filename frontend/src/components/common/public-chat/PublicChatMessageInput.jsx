import { useRef, useCallback, useMemo } from "react"
import { IoClose, IoImageOutline } from "react-icons/io5"
import { MdCheck, MdEdit, MdSend } from "react-icons/md"
import { truncateText } from "../../../utils/truncateText"
import { FaReply } from "react-icons/fa6"
import { FaCircle } from "react-icons/fa"
import { useEditPublicMessage } from "../../../hooks/publicChatHooks/useEditPublicMessage"
import { usePublicChatStore } from "../../../store/usePublicChatStore"
import { getTypingMessage } from "../../../utils/getTypingMessage"
import { usePasteHandler } from "../../../hooks/customHooks/usePasteHandler"
import { useSendPublicMessage } from "../../../hooks/publicChatHooks/useSendPublicMessage"
import { PiSmiley } from "react-icons/pi"
import { useEmojiPickerPopover } from "../../../hooks/customHooks/useEmojiPickerPopover"
import EmojiPickerPopover from "../EmojiPickerPopover"
import { useChatInput } from "../../../hooks/customHooks/useChatInput"

const PublicChatMessageInput = ({
  isCurrentUserBanned,
  publicChatInputRef,
  socket,
  onSenderMessageSent,
  typingUsers,
}) => {
  const { replyingToMessage, setReplyingToMessage, editingMessage } = usePublicChatStore()

  const emojiButtonRef = useRef(null)

  const isMessageDeleted = replyingToMessage?.isDeletedByAdmin || replyingToMessage?.isDeletedByUser

  const publicChatFileInputRef = useRef(null)

  const { sendPublicMessage } = useSendPublicMessage({ onSenderMessageSent })
  const { editPublicMessage } = useEditPublicMessage()

  const handleSendMessage = useCallback(
    async ({ text, file, repliedToId }) => {
      let imgBase64 = null
      if (file) {
        imgBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
      }
      sendPublicMessage({ text, repliedTo: repliedToId, imgBase64 })
    },
    [sendPublicMessage],
  )

  const handleEditMessage = useCallback(
    async ({ messageId, newText }) => {
      editPublicMessage({ messageId, newText })
    },
    [editPublicMessage],
  )

  const typingConfig = useMemo(
    () => ({
      startEvent: "public_typing",
      stopEvent: "public_stop_typing",
      payload: {},
    }),
    [],
  )

  const {
    currentUser,
    textInput,
    previewImage,
    setPreviewImage,
    setSelectedFile,
    setTextInput,
    selectedFile,
    isSendButtonDisabled,
    handlers,
  } = useChatInput({
    inputRef: publicChatInputRef,
    fileInputRef: publicChatFileInputRef,
    socket,
    chatStore: usePublicChatStore(),
    onSendMessage: handleSendMessage,
    onEditMessage: handleEditMessage,
    typingConfig: typingConfig,
  })

  const {
    showEmojiPickerPopover,
    popoverPosition,
    handleOpenEmojiPickerPopover,
    handleCloseEmojiPickerPopover,
  } = useEmojiPickerPopover()

  const canSendImages = currentUser?.isVerified || currentUser?.isGoldVerified

  const handlePaste = usePasteHandler({
    inputRef: publicChatInputRef,
    input: textInput,
    setInput: setTextInput,
    setSelectedFile: setSelectedFile,
    setPreviewImage: setPreviewImage,
    fileInputRef: publicChatFileInputRef,
    editingMessage,
  })

  const openEmojiPickerWithModalClose = (e) => {
    handleOpenEmojiPickerPopover(e)
  }

  const isEditingMode = !!editingMessage
  const showTypingIndicator = typingUsers && typingUsers.length > 0
  const messageDeleted = <span className="mt-1 italic text-gray-500">[Message Deleted]</span>

  const renderInputForm = (isEditingMode, typingIndicator) => (
    <form onSubmit={handlers.handleSubmit} className="relative flex items-center bg-black/0 px-2">
      <input
        type="file"
        accept="image/*"
        onChange={handlers.handleFileChange}
        ref={publicChatFileInputRef}
        className="hidden"
        disabled={!canSendImages}
      />

      <div className="focus-within:border-accent/99 relative mb-4 flex flex-1 items-center rounded-xl border border-transparent bg-secondary">
        <div className="flex pl-1">
          <button
            type="button"
            onClick={handlers.handleImageButtonClick}
            className={`${canSendImages ? "cursor-pointer" : "cursor-not-allowed"} rounded-full p-2 text-primary transition-colors duration-200 hover:bg-gray-700`}
            disabled={!canSendImages}
          >
            <IoImageOutline className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="relative hidden rounded-full p-2 text-primary transition-colors duration-200 hover:bg-gray-700 md:block"
          >
            <PiSmiley
              className="h-5 w-5"
              ref={emojiButtonRef}
              onClick={(e) => openEmojiPickerWithModalClose(e, emojiButtonRef)}
            />
            {showEmojiPickerPopover && (
              <>
                <div
                  className="fixed inset-0 z-10 cursor-default bg-transparent"
                  onClick={handleCloseEmojiPickerPopover}
                ></div>
                <div className="absolute -left-40 bottom-full z-10">
                  <EmojiPickerPopover
                    position={popoverPosition}
                    onClose={handleCloseEmojiPickerPopover}
                    onEmojiClick={handlers.handleEmojiClick}
                    triggerRef={emojiButtonRef}
                  />
                </div>
              </>
            )}
          </button>
        </div>

        <textarea
          value={textInput}
          onChange={handlers.handleTextInputChange}
          onKeyDown={handlers.handleKeyDown}
          onPaste={handlePaste}
          placeholder={
            isEditingMode
              ? "Editing message..."
              : replyingToMessage
                ? `Replying to @${replyingToMessage.sender.username}...`
                : "Type your message..."
          }
          className="flex max-h-[140px] w-full resize-none overflow-y-auto rounded-r-xl bg-secondary py-2 pl-3 pr-14 placeholder-gray-400 focus:outline-none"
          ref={publicChatInputRef}
          rows={1}
        />

        <button
          type="submit"
          disabled={isSendButtonDisabled}
          className={`absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1.5 ${
            textInput.trim() || selectedFile
              ? "bg-primary text-white"
              : "cursor-not-allowed bg-primary text-white opacity-50"
          } transition-colors duration-200`}
        >
          {isEditingMode ? <MdCheck className="h-5 w-5" /> : <MdSend className="h-5 w-5" />}
        </button>
      </div>
      {/* Typing Indicator */}
      {typingIndicator}
    </form>
  )

  // The new main component render function
  return (
    <>
      {/* Preview image (rendered conditionally) */}
      {previewImage && (
        <div className="mt-4 flex border-t border-accent p-5">
          <div className="relative">
            <img
              src={previewImage}
              alt="Preview"
              className="max-h-[200px] max-w-[200px] rounded-md object-contain"
            />
            <button
              onClick={handlers.handleRemoveImage}
              className="absolute -right-2 -top-2 rounded-full bg-gray-500 p-1 text-white transition duration-200 hover:bg-gray-600"
            >
              <IoClose size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Replying message indicator */}
      {replyingToMessage && !editingMessage && (
        <div className="flex items-center justify-between border-t border-accent bg-black/0 p-2 pt-0">
          <div className="flex flex-1 flex-col rounded-md p-3">
            <div className="flex items-center gap-2">
              <FaReply className="size-3" />
              <div className="text-sm font-bold text-primary">Replying to</div>
            </div>
            <div className="mt-1 text-xs italic text-gray-400">
              {isMessageDeleted ? messageDeleted : truncateText(replyingToMessage.text)}
              {replyingToMessage.img && !replyingToMessage.text && " (Image)"}
            </div>
          </div>
          <button
            onClick={() => setReplyingToMessage(null)}
            className="ml-2 rounded-full p-1 text-gray-500 hover:bg-gray-700 hover:text-white"
          >
            <IoClose size={20} />
          </button>
        </div>
      )}

      {/* Input section wrapper */}
      <div className="relative w-full flex-col bg-base-100">
        {editingMessage && (
          <div className="flex items-center justify-between px-1 py-2 pt-0 text-sm">
            <div className="flex flex-col items-start p-3">
              <div className="flex items-center gap-2">
                <MdEdit className="h-4 w-4" />
                <div className="font-bold text-primary">Editing message</div>
              </div>
              <span className="font-semibold text-gray-400">
                "{truncateText(editingMessage.text, 30)}"
              </span>
            </div>
            <button
              onClick={handlers.handleCancelEdit}
              className="ml-2 mr-1 rounded-full p-1 text-gray-500 hover:bg-gray-700 hover:text-white"
              title="Cancel Edit"
            >
              <IoClose size={20} />
            </button>
          </div>
        )}

        {/* Conditionally render the typing indicator */}
        {showTypingIndicator && (
          <div className="absolute -top-7 left-0 flex w-full items-center justify-start bg-base-100 p-1 px-4 text-sm text-gray-400">
            <span className="animate-pulse font-semibold">{getTypingMessage(typingUsers)}</span>
            <span className="ml-1 mt-2.5 flex gap-0.5">
              <span className="pulsing-dot pulsing-dot-1 inline-block">
                <FaCircle size={6} />
              </span>
              <span className="pulsing-dot pulsing-dot-2 inline-block">
                <FaCircle size={6} />
              </span>
              <span className="pulsing-dot pulsing-dot-3 inline-block">
                <FaCircle size={6} />
              </span>
            </span>
          </div>
        )}

        {/* The single input form that handles both modes */}
        {renderInputForm(!!editingMessage, null)}
      </div>
    </>
  )
}

export default PublicChatMessageInput
