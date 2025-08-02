import { useEffect, useRef, useState, useCallback } from "react"
import { truncateText } from "../../../utils/truncateText"
import { IoClose, IoImageOutline } from "react-icons/io5"
import { PiSmiley } from "react-icons/pi"
import EmojiPicker from "emoji-picker-react"
import { MdCheck, MdEdit, MdSend } from "react-icons/md"
import { useAuthUser } from "../../../hooks/authHooks/useAuthUser"
import { FaCaretDown, FaSpinner } from "react-icons/fa"
import { useEditMessage } from "../../../hooks/messagesHooks/useEditMessage"
import { FaReply } from "react-icons/fa6"
import React from "react"
import { showAppToast } from "../../../utils/showAppToast"
import { usePrivateChatStore } from "../../../store/usePrivateChatStore"
import { useSendMessage } from "../../../hooks/messagesHooks/useSendMessage"
import { useIsMobile } from "../../../hooks/customHooks/useIsMobile"
import { usePasteHandler } from "../../../hooks/customHooks/usePasteHandler"
import { useEmojiPickerPopover } from "../../../hooks/customHooks/useEmojiPickerPopover"
import EmojiPickerPopover from "../EmojiPickerPopover"

function MessageInput({
  otherUser,
  actualConversationId,
  privateChatInputRef,
  socket,
  onSenderMessageSent,
}) {
  const setReplyingToMessage = usePrivateChatStore((state) => state.setReplyingToMessage)
  const setEditingMessage = usePrivateChatStore((state) => state.setEditingMessage)
  const replyingToMessage = usePrivateChatStore((state) => state.replyingToMessage)
  const editingMessage = usePrivateChatStore((state) => state.editingMessage)

  const [privateChatInput, setPrivateChatInput] = useState("")
  const [privateChatPreviewImage, setPrivateChatPreviewImage] = useState(null)
  const [privateChatSelectedFile, setPrivateChatSelectedFile] = useState(null)
  const privateChatFileInputRef = useRef(null)
  const emojiButtonRef = useRef(null)
  // const emojiPickerRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const { authUser: currentUser } = useAuthUser()


  const { editMessage, isEditing } = useEditMessage(actualConversationId)
  const { sendPrivateMessage, isSendingMessage } = useSendMessage({
    onSenderMessageSent,
  })

  const {
    showEmojiPickerPopover,
    popoverPosition,
    handleOpenEmojiPickerPopover,
    handleCloseEmojiPickerPopover,
  } = useEmojiPickerPopover()

  const openEmojiPickerWithModalClose = (e) => {
    handleOpenEmojiPickerPopover(e)
  }

  const isMobile = useIsMobile()

  // --- MODIFIED: emitTyping now accepts isEditing flag ---
  const emitTyping = useCallback(
    (isEditingActive) => {
      if (socket && actualConversationId && currentUser?._id) {
        socket.emit("typing", {
          conversationId: actualConversationId,
          userId: currentUser._id, // This should be the current user's ID
          isEditing: isEditingActive, // Pass the flag
        })
      }
    },
    [socket, actualConversationId, currentUser?._id],
  )

  // --- MODIFIED: emitStopTyping now accepts isEditing flag ---
  const emitStopTyping = useCallback(
    (isEditingActive) => {
      if (socket && actualConversationId && currentUser?._id) {
        socket.emit("stopTyping", {
          conversationId: actualConversationId,
          userId: currentUser._id, // This should be the current user's ID
          isEditing: isEditingActive, // Pass the flag
        })
      }
    },
    [socket, actualConversationId, currentUser?._id],
  )

  const handlePaste = usePasteHandler({
    inputRef: privateChatInputRef,
    input: privateChatInput,
    setInput: setPrivateChatInput,
    setSelectedFile: setPrivateChatSelectedFile,
    setPreviewImage: setPrivateChatPreviewImage,
    fileInputRef: privateChatFileInputRef,
    editingMessage,
  })

  const clearInputState = useCallback(() => {
    setPrivateChatInput("")
    setPrivateChatSelectedFile(null)
    setPrivateChatPreviewImage(null)
    setReplyingToMessage(null)
    setEditingMessage(null)
    if (privateChatFileInputRef.current) privateChatFileInputRef.current.value = ""
    if (privateChatInputRef.current) {
      privateChatInputRef.current.style.height = "auto"
      privateChatInputRef.current.focus()
    }
  }, [setEditingMessage, setReplyingToMessage, privateChatInputRef])

  useEffect(() => {
    if (privateChatInputRef.current) {
      privateChatInputRef.current.style.height = "auto" // Reset height first
      privateChatInputRef.current.style.height = privateChatInputRef.current.scrollHeight + "px"
    }
    // eslint-disable-next-line
  }, [privateChatInput])

  useEffect(() => {
    if (editingMessage) {
      setPrivateChatInput(editingMessage.text)
      privateChatInputRef.current?.focus()
    }
    // eslint-disable-next-line
  }, [editingMessage])

  const handleMessageInputChange = (e) => {
    const text = e.target.value
    setPrivateChatInput(text)

    if (privateChatInputRef.current) {
      privateChatInputRef.current.style.height = "auto"
      privateChatInputRef.current.style.height = privateChatInputRef.current.scrollHeight + "px"
    }

    const isCurrentlyEditing = !!editingMessage // Determine if in edit mode

    if (text.trim() === "") {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = null
      }
      emitStopTyping(isCurrentlyEditing) // Pass the flag
      return
    }

    if (!typingTimeoutRef.current) {
      emitTyping(isCurrentlyEditing) // Pass the flag
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      emitStopTyping(isCurrentlyEditing) // Pass the flag
      typingTimeoutRef.current = null
    }, 1500)
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      showAppToast("Only image files are supported.", "error")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      // 5MB limit
      showAppToast("Image size cannot exceed 5MB.", "error")
      return
    }

    setPrivateChatSelectedFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setPrivateChatPreviewImage(reader.result)
    reader.readAsDataURL(file)
  }

  const handleSendPrivateMessage = useCallback(
    async (e) => {
      e.preventDefault()

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = null
      }
      emitStopTyping()

      if (!privateChatInput.trim() && !privateChatSelectedFile) return

      if (!otherUser) {
        showAppToast("No recipient selected.", "error")
        return
      }

      // const wasInputFocused = privateChatInputRef.current === document.activeElement;

      const repliedToId = replyingToMessage ? replyingToMessage._id : null

      const messagePayload = {
        recipientId: otherUser._id,
        message: privateChatInput,
        img: null,
        conversationId: actualConversationId,
        repliedTo: repliedToId,
      }

      try {
        if (privateChatSelectedFile) {
          const reader = new FileReader()
          const imageDataUrl = await new Promise((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result)
            reader.onerror = reject
            reader.readAsDataURL(privateChatSelectedFile)
          })
          messagePayload.img = imageDataUrl
        }

        sendPrivateMessage(messagePayload)
        clearInputState()
      } catch (error) {
        console.error("Error during message send process:", error)
        showAppToast("Failed to send message.", "error")
      }
    },
    [
      emitStopTyping,
      privateChatInput,
      privateChatSelectedFile,
      otherUser,
      replyingToMessage,
      actualConversationId,
      sendPrivateMessage,
      clearInputState,
    ],
  )

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault()

      const trimmedMessage = privateChatInput.replace(/\s/g, "")

      if (trimmedMessage.length === 0 && !privateChatSelectedFile) {
        // If the input is empty or only whitespace and no image,
        // and it's a mobile device, ensure focus remains to prevent keyboard close.
        if (isMobile && privateChatInputRef.current) {
          privateChatInputRef.current.focus()
        }
        return
      }

      if (editingMessage) {
        // Handle message editing
        editMessage({ messageId: editingMessage._id, newText: privateChatInput })
        clearInputState()
      } else {
        // Handle sending new message
        handleSendPrivateMessage(e) // Your original send logic
        setPrivateChatInput("")
        if (privateChatInputRef.current) {
          privateChatInputRef.current.style.height = "auto" // Crucial
          privateChatInputRef.current.rows = 1
        }
      }
    },
    [
      privateChatInput,
      privateChatSelectedFile,
      isMobile,
      privateChatInputRef,
      editingMessage,
      editMessage,
      handleSendPrivateMessage,
      setPrivateChatInput,
      clearInputState,
    ],
  )

  const handleKeyDown = (e) => {
    if (isMobile) {
      return
    }
    if (e.key === "Enter") {
      if (!e.shiftKey) {
        e.preventDefault()
        handleSubmit(e)
      }
    }
  }

  const onEmojiClick = useCallback(
    (emojiObject) => {
      setPrivateChatInput((prevText) => prevText + emojiObject.emoji)
      privateChatInputRef.current.focus()
    },
    [privateChatInputRef],
  )

  const handleImageButtonClick = (e) => {
    e.preventDefault() // Prevent default button behavior that might blur
    privateChatFileInputRef.current.click()
    // Re-focus the message input after triggering file input click
    if (isMobile && privateChatInputRef.current) {
      setTimeout(() => {
        privateChatInputRef.current.focus()
      }, 0)
    }
  }

  const handleCancelEdit = () => {
    setEditingMessage(null)
    setPrivateChatInput("")
    emitStopTyping(true) // Indicate it was an edit context

    // Keep keyboard open after canceling edit on mobile
    if (isMobile && privateChatInputRef.current) {
      privateChatInputRef.current.focus()
    }
  }

  const handleTouchMove = (e) => {
    // Check if the textarea content itself is overflowing
    // This is crucial: only prevent default if the textarea can actually scroll
    const target = e.target
    if (target.scrollHeight > target.clientHeight) {
      // If the content is larger than the visible area,
      // allow the textarea to scroll by not preventing its default behavior.
      // And importantly, prevent the event from bubbling to parent scroll containers.
      e.stopPropagation()
    }
  }

  const handleRemoveImage = () => {
    setPrivateChatSelectedFile(null)
    setPrivateChatPreviewImage(null)
    if (privateChatFileInputRef.current) privateChatFileInputRef.current.value = ""
    privateChatInputRef.current?.focus()
  }

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = null
      }
      emitStopTyping()
    }
  }, [actualConversationId, emitStopTyping])

  const isSendButtonDisabled =
    isSendingMessage || isEditing || (!privateChatInput.trim() && !privateChatSelectedFile)

  // Helper for rendering the common form content
  const renderFormContent = (isEditingMode = false) => (
    <>
      <input
        type="file"
        accept="image/*"
        onChange={handleImageChange}
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
          value={privateChatInput}
          onChange={handleMessageInputChange}
          onKeyDown={handleKeyDown}
          onTouchMove={handleTouchMove}
          onPaste={handlePaste}
          placeholder={
            isEditingMode
              ? "Editing message..."
              : replyingToMessage
                ? "Send your reply..."
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
            privateChatInput.trim() || privateChatSelectedFile
              ? "bg-primary text-white"
              : "cursor-not-allowed bg-primary text-white opacity-50"
          } transition-colors duration-200`}
        >
          {isEditingMode ? (
            isEditing ? (
              <FaSpinner className="animate-spin" />
            ) : (
              <MdCheck className="h-5 w-5" />
            )
          ) : (
            <MdSend className="h-5 w-5" />
          )}
        </button>
      </div>
    </>
  )

  return (
    <>
      {privateChatPreviewImage && (
        <div className="mt-4 flex border-t border-accent p-5">
          <div className="relative">
            <img
              src={privateChatPreviewImage}
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

export default React.memo(MessageInput)
