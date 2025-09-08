import { useRef, useCallback, useMemo, useState } from "react"
import { truncateText } from "../../../utils/truncateText"
import { IoClose, IoImageOutline, IoMicOutline, IoStopCircleOutline } from "react-icons/io5"
import { PiSmiley } from "react-icons/pi"
import { MdCheck, MdEdit, MdSend } from "react-icons/md"
import { useEditMessage } from "./privateChatHooks/useEditMessage"
import { FaReply } from "react-icons/fa6"
import React from "react"
import { usePrivateChatStore } from "../../../store/usePrivateChatStore"
import { useSendMessage } from "./privateChatHooks/useSendMessage"
import { usePasteHandler } from "../../../hooks/customHooks/usePasteHandler"
import { useEmojiPickerPopover } from "../../../hooks/customHooks/useEmojiPickerPopover"
import EmojiPickerPopover from "../../../components/common/EmojiPickerPopover"
import { useChatInput } from "../../../hooks/customHooks/useChatInput"
import { showAppToast } from "../../../utils/showAppToast"

function PrivateChatInput({
  actualConversationId,
  privateChatInputRef,
  socket,
  onSenderMessageSent,
}) {
  const { setReplyingToMessage, replyingToMessage, editingMessage } = usePrivateChatStore()
  const privateChatFileInputRef = useRef(null)
  const emojiButtonRef = useRef(null)

  const { editPrivateMessage } = useEditMessage(actualConversationId)
  const { sendPrivateMessage } = useSendMessage(onSenderMessageSent)

  const { isRecording, audioBlob } = usePrivateChatStore()

  const typingConfig = useMemo(
    () => ({
      startEvent: "typing",
      stopEvent: "stopTyping",
      payload: {
        conversationId: actualConversationId,
      },
    }),
    [actualConversationId],
  )

  const handleSendMessage = useCallback(
    async ({ text, file, repliedToId }) => {
      let base64Data = null // Use a single variable for base64 data

      if (file) {
        base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
      }

      sendPrivateMessage({
        message: text,
        repliedTo: repliedToId,
        conversationId: actualConversationId,
        img: file && file.type.startsWith("image/") ? base64Data : null, // Check file type for images
        voiceMessage: file && file.type.startsWith("audio/") ? base64Data : null, // Check file type for audio
      })
    },
    [sendPrivateMessage, actualConversationId], // `audioBlob` is no longer needed in the dependency array
  )

  const handleEditMessage = useCallback(
    async ({ messageId, newText }) => {
      editPrivateMessage({ messageId, newText })
    },
    [editPrivateMessage],
  )

  const {
    textInput,
    setTextInput,
    previewImage,
    setPreviewImage,
    selectedFile,
    setSelectedFile,
    handleTextInputChange,
    handleFileChange,
    handleSubmit,
    handleKeyDown,
    handleEmojiClick,
    handleRemoveImage,
    handleCancelEdit,
    handleImageButtonClick,
    isSendButtonDisabled,
    handleStartRecording, // <-- Add this
    handleStopRecording, // <-- Add this
    handleClearRecording, // <-- Add this
  } = useChatInput({
    inputRef: privateChatInputRef,
    fileInputRef: privateChatFileInputRef,
    socket,
    chatStore: usePrivateChatStore(),
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

  const handlePaste = usePasteHandler({
    inputRef: privateChatInputRef,
    input: textInput,
    setInput: setTextInput,
    setSelectedFile: setSelectedFile,
    setPreviewImage: setPreviewImage,
    fileInputRef: privateChatFileInputRef,
    editingMessage,
  })

  const renderFormContent = (isEditingMode = false) => (
    <>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        ref={privateChatFileInputRef}
        className="hidden"
      />

      <div className="focus-within:border-accent/99 relative mb-4 flex flex-1 items-center rounded-xl border border-transparent bg-secondary">
        <div className="flex pl-1">
          <button
            type="button"
            onClick={handleImageButtonClick} // Use the new handler
            className="rounded-full p-2 text-primary transition-colors duration-200 hover:bg-gray-700"
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
              onClick={(e) => handleOpenEmojiPickerPopover(e)}
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
                    onEmojiClick={handleEmojiClick}
                    triggerRef={emojiButtonRef}
                  />
                </div>
              </>
            )}
          </button>
          {!isRecording ? (
            <button
              type="button"
              onClick={handleStartRecording}
              className="rounded-full p-2 text-primary transition-colors duration-200 hover:bg-gray-700"
            >
              <IoMicOutline className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStopRecording}
              className="rounded-full p-2 text-primary transition-colors duration-200 hover:bg-red-700"
            >
              <IoStopCircleOutline className="h-5 w-5" />
            </button>
          )}
        </div>

        <textarea
          value={textInput}
          onChange={handleTextInputChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onFocus={(e) => e.stopPropagation()}
          placeholder={
            isEditingMode
              ? "Editing message..."
              : replyingToMessage
                ? `Replying to @${replyingToMessage.sender.username}...`
                : "Type your message..."
          }
          className="flex max-h-[140px] w-full resize-none overflow-y-auto rounded-r-xl bg-secondary py-2 pl-3 pr-14 placeholder-gray-400 focus:outline-none"
          ref={privateChatInputRef}
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
    </>
  )

  return (
    <>
      {previewImage && (
        <div className="flex border-t border-accent p-5">
          <div className="relative">
            <img
              src={previewImage}
              alt="Preview"
              className="max-h-[200px] max-w-[200px] rounded-md object-contain"
            />
            <button
              onClick={handleRemoveImage}
              className="absolute -right-2 -top-2 rounded-full bg-gray-500 p-1 text-white transition duration-200 hover:bg-gray-600"
            >
              <IoClose size={15} />
            </button>
          </div>
        </div>
      )}
      {audioBlob && !isRecording && (
        <div className="flex border-t border-accent p-5">
          <div className="flex w-full items-center gap-2">
            <audio controls src={URL.createObjectURL(audioBlob)} className="flex-1" />
            <button
              onClick={handleClearRecording}
              className="rounded-full bg-gray-500 p-1 text-white transition duration-200 hover:bg-gray-600"
            >
              <IoClose size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Only show replyingToMessage if NOT in editing mode */}
      {replyingToMessage && !editingMessage && (
        <div className="flex items-center justify-between border-t border-accent bg-black/0 p-2 pt-0">
          <div className="flex flex-1 flex-col rounded-md p-3">
            <div className="flex items-center gap-2">
              <FaReply className="size-3" />
              <div className="text-sm font-bold text-primary">Replying to</div>
            </div>
            <div className="mt-1 text-xs italic text-gray-400">
              {truncateText(replyingToMessage.text, 40)}
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

      {/* Conditional rendering for the entire input section */}
      {editingMessage ? (
        // EDIT MODE CONTAINER
        <div className="flex w-full flex-col border-t border-accent bg-base-100">
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
              onClick={handleCancelEdit}
              className="ml-2 mr-1 rounded-full p-1 text-gray-500 hover:bg-gray-700 hover:text-white"
              title="Cancel Edit"
            >
              <IoClose size={20} />
            </button>
          </div>

          {/* The form, now nested inside the edit mode container */}
          <form
            onSubmit={handleSubmit}
            className="relative flex items-center bg-black/0 px-2" // change back to p-2 if new typing indicator is ugly
          >
            {renderFormContent(true)}{" "}
            {/* Pass true to indicate editing mode for placeholders/icons */}
          </form>
        </div>
      ) : (
        // NORMAL MODE (not editing)
        <form
          onSubmit={handleSubmit}
          className="relative flex items-center bg-black/0 px-2" // change back to p-2
        >
          {renderFormContent(false)} {/* Pass false for normal mode */}
        </form>
      )}
    </>
  )
}

export default React.memo(PrivateChatInput)
