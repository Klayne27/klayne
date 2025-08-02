// src/components/publicChat/PublicChatMessageInput.jsx
import React, { useRef, useEffect, useCallback } from "react"
import { IoClose, IoImageOutline } from "react-icons/io5"
import { MdCheck, MdEdit, MdSend } from "react-icons/md"
import LoadingSpinner from "../../ui/LoadingSpinner"
import { truncateText } from "../../../utils/truncateText"
import { useState } from "react"
import { FaReply } from "react-icons/fa6"
import { FaCircle } from "react-icons/fa"
import { useAuthUser } from "../../../hooks/authHooks/useAuthUser"
import { showAppToast } from "../../../utils/showAppToast"
import { useEditPublicMessage } from "../../../hooks/publicChatHooks/useEditPublicMessage"
import { usePublicChatStore } from "../../../store/usePublicChatStore"
import { getTypingMessage } from "../../../utils/getTypingMessage"
import { useIsMobile } from "../../../hooks/customHooks/useIsMobile"
import { usePasteHandler } from "../../../hooks/customHooks/usePasteHandler"
import { useSendPublicMessage } from "../../../hooks/publicChatHooks/useSendPublicMessage"
import { PiSmiley } from "react-icons/pi"
import { useEmojiPickerPopover } from "../../../hooks/customHooks/useEmojiPickerPopover"
import EmojiPickerPopover from "../EmojiPickerPopover"

const PublicChatMessageInput = ({
  isCurrentUserBanned,
  publicChatInputRef,
  onSenderMessageSent,
  sendTypingEvent, // This function needs to be updated to emit the new event
  typingUsers, // This is the array of users currently typing from the server
}) => {
  const { replyingToMessage, setReplyingToMessage, setEditingMessage, editingMessage } =
    usePublicChatStore()

  const typingTimeoutRef = useRef(null)
  const hasSentTypingEvent = useRef(false)

  const emojiButtonRef = useRef(null)

  const { authUser } = useAuthUser()
  const canSendImages = authUser?.isVerified || authUser?.isGoldVerified

  const [publicChatInput, setPublicChatInput] = useState("")
  const [publicChatSelectedFile, setPublicChatSelectedFile] = useState(null)
  const [publicChatPreviewImage, setPublicChatPreviewImage] = useState(null)
  const publicChatFileInputRef = useRef(null)

  const isMessageDeleted = replyingToMessage?.isDeletedByAdmin || replyingToMessage?.isDeletedByUser

  const { editPublicMessage, isEditingMessage } = useEditPublicMessage()

  const { sendPublicMessage, isSendingPublicMessage } = useSendPublicMessage(onSenderMessageSent)

  const isMobile = useIsMobile()

  const {
    showEmojiPickerPopover,
    popoverPosition,
    handleOpenEmojiPickerPopover,
    handleCloseEmojiPickerPopover,
  } = useEmojiPickerPopover()

  const openEmojiPickerWithModalClose = (e) => {
    handleOpenEmojiPickerPopover(e)
  }

  const onEmojiClick = useCallback(
    (emojiObject) => {
      setPublicChatInput((prevText) => prevText + emojiObject.emoji)
      publicChatInputRef.current.focus()
    },
    [publicChatInputRef],
  )

  useEffect(() => {
    if (publicChatInputRef.current) {
      publicChatInputRef.current.style.height = "auto" // Reset height first
      publicChatInputRef.current.style.height = publicChatInputRef.current.scrollHeight + "px"
    }
    // eslint-disable-next-line
  }, [publicChatInput])

  // Handle entering/exiting edit mode
  useEffect(() => {
    if (editingMessage) {
      setPublicChatInput(editingMessage.text)
      publicChatInputRef.current?.focus()
    }
    // eslint-disable-next-line
  }, [editingMessage])

  // Cleanup effect for unmounting
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      // Ensure we send a stop typing event if the component unmounts
      // sendTypingEvent(false); // This call is still fine
    }
  }, []) // sendTypingEvent is not a dependency if it doesn't change on re-renders,

  const handleMessageContentChange = (e) => {
    const newValue = e.target.value
    setPublicChatInput(newValue)

    if (publicChatInputRef.current) {
      publicChatInputRef.current.style.height = "auto"
      publicChatInputRef.current.style.height = publicChatInputRef.current.scrollHeight + "px"
    }

    clearTimeout(typingTimeoutRef.current) // Always clear any pending "stop" timer

    if (newValue.trim().length > 0) {
      if (!hasSentTypingEvent.current) {
        const isCurrentlyEditing = !!editingMessage
        sendTypingEvent(true, isCurrentlyEditing)
        hasSentTypingEvent.current = true // Mark that we've notified the server
      }

      // Set a new timer to signal "stop typing" after a pause.
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingEvent(false)
        hasSentTypingEvent.current = false // Reset the flag
      }, 1500) // 1.5-second pause
    } else {
      // If the input is empty, immediately send a "stop typing" event.
      if (hasSentTypingEvent.current) {
        sendTypingEvent(false)
        hasSentTypingEvent.current = false
      }
    }
  }

  const handlePaste = usePasteHandler({
    inputRef: publicChatInputRef,
    input: publicChatInput,
    setInput: setPublicChatInput,
    setSelectedFile: setPublicChatSelectedFile,
    setPreviewImage: setPublicChatPreviewImage,
    fileInputRef: publicChatFileInputRef,
    editingMessage,
  })

  const clearInputState = useCallback(() => {
    setPublicChatInput("")
    setPublicChatSelectedFile(null)
    setPublicChatPreviewImage(null)
    setReplyingToMessage(null)
    setEditingMessage(null)
    if (publicChatFileInputRef.current) publicChatFileInputRef.current.value = ""
    if (publicChatInputRef.current) {
      publicChatInputRef.current.style.height = "auto"
      publicChatInputRef.current.focus()
    }
  }, [setEditingMessage, setReplyingToMessage, publicChatInputRef])

  const handleSendPublicMessage = useCallback(async () => {
    // Clear typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }
    sendTypingEvent(false)
    hasSentTypingEvent.current = false

    const contentToSend = publicChatInput.trim()

    // Guard for empty message (should also be in handleSubmit)
    if (!contentToSend && !publicChatSelectedFile) {
      return
    }

    const payload = {
      text: contentToSend,
      repliedTo: replyingToMessage ? replyingToMessage._id : null,
      imgBase64: null, // Initialize imgBase64
    }

    try {
      if (publicChatSelectedFile) {
        const reader = new FileReader()
        const imageDataUrl = await new Promise((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result)
          reader.onerror = (error) => {
            console.error("FileReader error:", error)
            reject(new Error("Failed to read image file."))
          }
          reader.readAsDataURL(publicChatSelectedFile)
        })
        payload.imgBase64 = imageDataUrl
      }

      // Call the actual send function
      sendPublicMessage(payload) // Assuming sendPublicMessage is async or returns a promise

      // Clear input and reset textarea height after successful send
      clearInputState()
    } catch (error) {
      console.error("Error during public message send process:", error)
      showAppToast(error.message || "Failed to send message.", "error")
    }
  }, [
    publicChatInput,
    publicChatSelectedFile,
    replyingToMessage,
    sendTypingEvent, // Add if sendTypingEvent is not stable
    sendPublicMessage, // Add if sendPublicMessage is not stable
    clearInputState, // Add if clearInputState is not stable
  ])

  const handleSubmitPublicChat = useCallback(
     (e) => {
      // Make it async because handleSendPublicMessage is async
      e.preventDefault()

      // Guards (from your original function)
      if (isSendingPublicMessage || isEditingMessage || isCurrentUserBanned) {
        if (isCurrentUserBanned) {
          showAppToast("You are banned from chatting.", "error")
        }
        return
      }

      const contentToSend = publicChatInput.trim()

      // Check for empty message (text or file)
      if (!contentToSend && !publicChatSelectedFile) {
        // Optionally, keep input focused if on mobile and no content
        // if (isMobile && publicChatInputRef.current) {
        //   publicChatInputRef.current.focus();
        // }
        return
      }

      if (editingMessage) {
        // Handle message editing
        try {
          editPublicMessage({
            // Assuming editPublicMessage is async or returns a Promise
            messageId: editingMessage._id,
            newContent: contentToSend,
          })
          // Clear input and state after successful edit
          clearInputState()
        } catch (error) {
          console.error("Error during public message edit process:", error)
          showAppToast("Failed to edit message.", "error")
        }
      } else {
       handleSendPublicMessage()
      }
    },
    [
      publicChatInput,
      publicChatSelectedFile,
      editingMessage,
      isSendingPublicMessage,
      isEditingMessage,
      isCurrentUserBanned,
      editPublicMessage,
      handleSendPublicMessage,
      clearInputState,
    ],
  )

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    setPublicChatSelectedFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setPublicChatPreviewImage(reader.result)
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setPublicChatSelectedFile(null)
    setPublicChatPreviewImage(null)
    if (publicChatFileInputRef.current) publicChatFileInputRef.current.value = ""
    publicChatInputRef.current?.focus()
  }

  const handleImageButtonClick = (e) => {
    e.preventDefault()
    publicChatFileInputRef.current.click()
    publicChatInputRef.current?.focus()
  }

  const handleTouchMove = (e) => {
    const target = e.target
    if (target.scrollHeight > target.clientHeight) {
      e.stopPropagation()
    }
  }

  const handleKeyDown = (e) => {
    if (isMobile) {
      return
    }
    if (e.key === "Enter") {
      if (!e.shiftKey) {
        e.preventDefault()
        handleSubmitPublicChat(e)
      }
    }
  }

  const handleCancelEdit = () => {
    setEditingMessage(null)
    setPublicChatInput("")
    sendTypingEvent(false)
  }

  const isSendButtonDisabled =
    isSendingPublicMessage ||
    isEditingMessage ||
    isCurrentUserBanned ||
    (!publicChatInput.trim() && !publicChatSelectedFile)

  const isEditingMode = !!editingMessage

  const showTypingIndicator = typingUsers && typingUsers.length > 0

  const messageDeleted = <span className="mt-1 italic text-gray-500">[Message Deleted]</span>

  return (
    <>
      {publicChatPreviewImage && (
        <div className="sticky bottom-0 z-10 mt-4 flex border-t border-accent bg-base-100 p-5">
          <div className="relative">
            <img
              src={publicChatPreviewImage}
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
      {/* --- Conditional Rendering for Input Section (Edit Mode vs. Normal Mode) --- */}
      {isEditingMode ? (
        // EDIT MODE CONTAINER
        <div className="sticky bottom-0 z-50 flex w-full flex-col border-t border-accent bg-base-100">
          {/* Edit Message Indicator Bar */}
          <div className="flex items-center justify-between p-2 px-1 pt-0 text-sm">
            <span className="flex flex-col items-start p-3">
              <div className="flex items-center gap-2">
                <MdEdit className="h-4 w-4 text-yellow-400" />
                <span className="font-bold text-primary">Editing message</span>
              </div>
              <span className="font-semibold text-gray-400">
                "{truncateText(editingMessage.text)}"
              </span>
            </span>

            <button
              onClick={() => {
                handleCancelEdit()
                publicChatInputRef.current.focus()
              }}
              className="ml-2 mr-1 rounded-full p-1 text-gray-500 hover:bg-gray-700 hover:text-white"
              title="Cancel Edit"
            >
              <IoClose size={20} />
            </button>
          </div>

          {/* The form for editing */}
          <form
            onSubmit={handleSubmitPublicChat}
            className="relative z-10 flex items-center bg-black/0 px-2"
          >
            <input
              type="file"
              ref={publicChatFileInputRef}
              onChange={handleImageChange}
              className="hidden"
              accept="image/*"
              id="image-upload-public-chat"
            />
            <div
              className={`focus-within:border-accent/99 relative mb-4 flex flex-1 items-center rounded-xl border border-transparent bg-secondary ${isCurrentUserBanned ? "cursor-not-allowed opacity-50" : ""} `}
            >
              <div className="flex pl-1">
                <button
                  type="button"
                  onClick={handleImageButtonClick}
                  className="rounded-full p-2 text-primary transition-colors duration-200 hover:bg-gray-700"
                  disabled={!canSendImages}
                >
                  <IoImageOutline className="h-5 w-5" />
                </button>
              </div>

              <textarea
                ref={publicChatInputRef}
                value={publicChatInput}
                onChange={handleMessageContentChange}
                onKeyDown={handleKeyDown}
                onTouchMove={handleTouchMove}
                onPaste={handlePaste}
                placeholder={
                  isCurrentUserBanned
                    ? "You are banned from sending messages."
                    : "Editing message..."
                }
                className="flex max-h-[140px] w-full resize-none overflow-y-auto rounded-r-xl bg-secondary py-2 pl-3 pr-14 placeholder-gray-400 focus:outline-none"
                rows={1}
                disabled={isCurrentUserBanned}
              />

              <button
                type="submit"
                disabled={isSendButtonDisabled}
                className={`absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1.5 ${
                  publicChatInput.trim() || publicChatSelectedFile
                    ? "bg-primary text-white"
                    : "cursor-not-allowed bg-primary text-white opacity-50"
                } transition-colors duration-200`}
              >
                {isEditingMessage ? <LoadingSpinner size="sm" /> : <MdCheck className="h-5 w-5" />}
              </button>
            </div>
          </form>
          {showTypingIndicator && (
            <div className="absolute -top-[29px] left-0 flex w-full items-center justify-start border-accent bg-base-100 p-1 px-4 text-sm text-gray-400">
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
        </div>
      ) : (
        // NORMAL MODE (not editing)
        <form
          onSubmit={handleSubmitPublicChat}
          className="sticky bottom-0 flex flex-col bg-base-100"
        >
          {replyingToMessage && (
            <div className="flex items-center justify-between border-t border-accent bg-black/0 p-2 pt-0">
              <div className="flex flex-1 flex-col rounded-md p-3">
                <div className="flex items-center gap-2">
                  <FaReply className="size-3 text-blue-400" />

                  <div className="text-sm font-bold text-primary">Replying to</div>
                </div>
                <div className="mt-1 text-xs italic text-gray-400">
                  {replyingToMessage.sender?.username && (
                    <span className="mr-1 font-semibold">
                      @{replyingToMessage.sender.username}:
                    </span>
                  )}
                  {isMessageDeleted ? messageDeleted : truncateText(replyingToMessage.text)}
                </div>
                {replyingToMessage.img && !replyingToMessage.text && (
                  <span className="mt-1 text-xs text-gray-400">(Image)</span>
                )}
              </div>
              <button
                onClick={() => {
                  setReplyingToMessage(null)
                  publicChatInputRef.current.focus()
                }}
                className="ml-2 rounded-full p-1 text-gray-500 hover:bg-gray-700 hover:text-white"
                aria-label="Cancel reply"
              >
                <IoClose size={20} />
              </button>
            </div>
          )}
          {/* Main message input for normal mode */}
          <input
            type="file"
            ref={publicChatFileInputRef}
            onChange={handleImageChange}
            className="hidden"
            accept="image/*"
            id="image-upload-public-chat"
          />

          <div
            className={`focus-within:border-accent/99 relative mx-2 mb-4 flex flex-1 items-center rounded-xl border border-transparent bg-secondary ${isCurrentUserBanned ? "cursor-not-allowed opacity-50" : ""} `}
          >
            <div className="flex pl-1">
              <button
                type="button"
                onClick={handleImageButtonClick}
                className="cursor-pointer rounded-full p-2 text-primary transition-colors duration-200 hover:bg-gray-700 disabled:cursor-not-allowed"
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
                        onEmojiClick={onEmojiClick}
                        triggerRef={emojiButtonRef}
                      />
                    </div>
                  </>
                )}
              </button>
            </div>

            <textarea
              ref={publicChatInputRef}
              value={publicChatInput}
              onChange={handleMessageContentChange}
              onKeyDown={handleKeyDown}
              onTouchMove={handleTouchMove}
              onPaste={handlePaste}
              placeholder={
                isCurrentUserBanned
                  ? "You are banned from sending messages."
                  : replyingToMessage
                    ? "Send your reply..."
                    : "Type your message..."
              }
              className="flex max-h-[140px] w-full resize-none overflow-y-auto rounded-r-xl bg-secondary py-2 pl-3 pr-14 placeholder-gray-400 focus:outline-none"
              rows={1}
              disabled={isCurrentUserBanned}
            />

            <button
              type="submit"
              disabled={isSendButtonDisabled}
              className={`absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1.5 ${
                publicChatInput.trim() || publicChatSelectedFile
                  ? "bg-primary text-white"
                  : "cursor-not-allowed bg-primary text-white opacity-50"
              } transition-colors duration-200`}
            >
              <MdSend className="h-5 w-5" />
            </button>
          </div>
          {showTypingIndicator && (
            <div className="absolute -top-7 left-0 z-20 flex w-full items-center justify-start bg-base-100 p-1 px-4 text-sm text-gray-400">
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
        </form>
      )}
    </>
  )
}

export default PublicChatMessageInput
