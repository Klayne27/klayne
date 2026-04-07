import { useEffect, useRef, useState } from "react"
import { useCreateBoardComment } from "../boardHooks/boardMutations"
import { useBoardStore } from "../../../store/useBoardStore"
import { usePasteHandler } from "../../../hooks/customHooks/usePasteHandler"
import { useEmojiPickerPopover } from "../../../hooks/customHooks/useEmojiPickerPopover"
import { useIsMobile } from "../../../hooks/customHooks/useIsMobile"
import { MdSend } from "react-icons/md"
import EmojiPickerPopover from "../../../components/common/EmojiPickerPopover"
import { PiSmiley } from "react-icons/pi"
import { IoClose, IoImageOutline } from "react-icons/io5"
import ImagePreviewCloseButton from "../../../components/common/ImagePreviewCloseButton"

const BoardPostInput = ({ post, floatingInputRef }) => {
  const { createComment, isCreatingComment } = useCreateBoardComment(post._id)

  const replyingToComment = useBoardStore((s) => s.replyingToComment)
  const clearReplyAndEdit = useBoardStore((s) => s.clearReplyAndEdit)
  //   const editingComment = useBoardStore((s) => s.editingComment)
  const replyingToPost = useBoardStore((s) => s.replyingToPost)

  const [selectedFile, setSelectedFile] = useState(null)
  const [commentInput, setCommentInput] = useState("")
  const [previewImage, setPreviewImage] = useState(null)

  const fileInputRef = useRef(null)
  const emojiButtonRef = useRef(null)

  const isMobile = useIsMobile()

  const {
    showEmojiPickerPopover,
    popoverPosition,
    handleOpenEmojiPickerPopover,
    handleCloseEmojiPickerPopover,
    setShowEmojiPickerPopover,
  } = useEmojiPickerPopover()

  useEffect(() => {
    if (replyingToComment) {
      setTimeout(() => floatingInputRef.current?.focus(), 0)
    }
  }, [replyingToComment, floatingInputRef])

  const resetForm = () => {
    setCommentInput("")
    setSelectedFile(null)
    setPreviewImage(null)
    if (fileInputRef.current) fileInputRef.current.value = null
    clearReplyAndEdit()
    if (floatingInputRef.current) {
      floatingInputRef.current.style.height = "auto"
    }
  }

  const handlePaste = usePasteHandler({
    inputRef: floatingInputRef,
    input: commentInput,
    setInput: setCommentInput,
    setSelectedFile: setSelectedFile,
    setPreviewImage: setPreviewImage,
    fileInputRef: fileInputRef, // Use the new ref
  })

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file)
      setPreviewImage(URL.createObjectURL(file))
    }
  }

  const handleEmojiClick = (emojiObject) => {
    const emoji = emojiObject.emoji

    setCommentInput((prev) => prev + emoji)
    floatingInputRef.current.focus()
  }

  const handleSubmitComment = (e) => {
    e.preventDefault()

    const content = commentInput
    if (!content.trim() && !selectedFile) return

    if (selectedFile) {
      const reader = new FileReader()
      reader.onloadend = () => {
        // The result is the Base64 string Cloudinary needs
        const base64Image = reader.result

        createComment(
          {
            content,
            parentCommentId: replyingToComment?._id || null,
            img: base64Image, // Send the string, not the Object
            isReplyToPost: !!replyingToPost, // ADD
          },
          { onSuccess: resetForm },
        )
      }
      reader.readAsDataURL(selectedFile)
    } else {
      // No image, just send text
      createComment(
        {
          content,
          parentCommentId: replyingToComment?._id || null,
          isReplyToPost: !!replyingToPost, // ADD
        },
        { onSuccess: resetForm },
      )
    }
  }

  return (
    <div className="absolute bottom-2 left-0 right-0 px-2 md:bottom-4 md:px-4">
      <form
        onSubmit={handleSubmitComment}
        className="mx-auto max-w-4xl rounded-2xl border border-accent bg-base-100/80 p-3 shadow-2xl backdrop-blur-lg"
      >
        {/* 1. Image Preview Area */}
        {previewImage && (
          <div className="relative mb-3 inline-block">
            <img
              src={previewImage}
              alt="Preview"
              className="max-h-48 w-full rounded-lg border border-accent object-cover shadow-md"
            />
            <ImagePreviewCloseButton
              onClick={() => {
                setSelectedFile(null)
                setPreviewImage(null)
              }}
            />
          </div>
        )}
        {/* Context banner */}
        {(replyingToComment || replyingToPost) && (
          <div className="mb-2 flex items-center justify-between rounded-lg border border-primary/20 px-3 py-1.5 text-xs text-primary">
            <span className="truncate font-medium">
              {replyingToPost
                ? `Replying to post by @${post.user?.username}`
                : `Replying to @${replyingToComment?.user?.username}`}
            </span>
            <button
              type="button"
              onClick={clearReplyAndEdit}
              className="ml-2 rounded-full p-0.5 hover:bg-primary/20"
            >
              <IoClose size={14} />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* 2. Upload Button & Hidden Input */}
          <div className="flex items-center">
            <input
              type="file"
              hidden
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mb-1 rounded-full p-2 text-primary hover:bg-primary/10"
            >
              <IoImageOutline className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={(e) => handleOpenEmojiPickerPopover(e)}
              className="mb-1 rounded-full p-2 text-primary hover:bg-primary/10"
            >
              <PiSmiley className="h-5 w-5" ref={emojiButtonRef} />
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
          </div>

          <div className="flex min-w-0 flex-1 items-center rounded-xl border border-transparent bg-base-200 px-3 transition-all focus-within:border-primary/50">
            <textarea
              ref={floatingInputRef}
              rows={1}
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !isMobile) {
                  e.preventDefault()
                  handleSubmitComment(e)
                }
              }}
              onPaste={handlePaste}
              placeholder={"Write a comment..."}
              className="max-h-32 w-full resize-none bg-transparent py-2.5 text-sm placeholder-gray-500 focus:outline-none"
              disabled={isCreatingComment}
            />
          </div>

          {/* Send Button */}
          {isMobile && (
            <button
              type="submit"
              disabled={isCreatingComment || (commentInput.trim() && !selectedFile)}
              className="mb-0.5 flex-shrink-0 rounded-full bg-primary p-2.5 text-white transition hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <MdSend size={18} />
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

export default BoardPostInput
