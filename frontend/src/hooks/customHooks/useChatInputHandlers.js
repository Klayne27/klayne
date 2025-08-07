// import { useCallback } from "react"
// import { showAppToast } from "../../utils/showAppToast"

// export const useChatInputHandlers = ({
//   inputRef,
//   setInputRef,
//   fileInputRef,
//   setFileInputRef,
//   setPreviewImage,
//   handleSubmit,
//   handleOpenEmojiPickerPopover,
// }) => {
//   const openEmojiPickerWithModalClose = (e) => {
//     handleOpenEmojiPickerPopover(e)
//   }

//   const handleEmojiClick = useCallback(
//     (emojiObject) => {
//       setInputRef((prevText) => prevText + emojiObject.emoji)
//       inputRef.current.focus()
//     },
//     [inputRef, setInputRef],
//   )

//   const handleImageChange = (e) => {
//     const file = e.target.files[0]
//     if (!file) return

//     if (!file.type.startsWith("image/")) {
//       showAppToast("Only image files are supported.", "error")
//       return
//     }
//     if (file.size > 5 * 1024 * 1024) {
//       showAppToast("Image size cannot exceed 5MB.", "error")
//       return
//     }

//     setFileInputRef(file)
//     const reader = new FileReader()
//     reader.onloadend = () => setPreviewImage(reader.result)
//     reader.readAsDataURL(file)
//   }

//   const handleImageButtonClick = (e) => {
//     e.preventDefault()
//     fileInputRef.current.click()
//     inputRef.current?.focus()
//   }

//   const handleKeyDown = (e) => {
//     if (isMobile) {
//       return
//     }
//     if (e.key === "Enter") {
//       if (!e.shiftKey) {
//         e.preventDefault()
//         handleSubmitPublicChat(e)
//       }
//     }
//   }

//   const handleCancelEdit = () => {
//     setEditingMessage(null)
//     setInputRef("")
//     sendTypingEvent(false)
//   }

//   const handleRemoveImage = () => {
//     setFileInputRef(null)
//     setPreviewImage(null)
//     if (fileInputRef.current) fileInputRef.current.value = ""
//     inputRef.current?.focus()
//   }

//   return {}
// }
