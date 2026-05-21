import { useCallback } from "react"
import { showAppToast } from "../../utils/showAppToast"

/**
 * Handles paste events for post/reply inputs.
 *
 * Two modes — determined by which setter props are provided:
 *
 *   Multi-image (CreatePost, PostPage reply)
 *     setSelectedFiles  – React state setter for File[]
 *     setPreviewImages  – React state setter for string[] (object URLs)
 *     currentImageCount – current length of the files array (for cap enforcement)
 *     maxImages         – hard cap, defaults to 4
 *
 *   Single-file legacy (message inputs, other components)
 *     setSelectedFile   – React state setter for File | null
 *     setPreviewImage   – React state setter for string | null
 */
export const usePasteHandler = ({
  inputRef,
  input,
  setInput,

  // ── Multi-image mode ──────────────────────────────────────────────────────
  setSelectedFiles,
  setPreviewImages,
  currentImageCount = 0,
  maxImages = 4,

  // ── Legacy single-file mode (message components etc.) ────────────────────
  setSelectedFile,
  setPreviewImage,

  fileInputRef,
  editingMessage = false,
  maxImageSizeMB = 5,
  onImagePasted,
  onTextPasted,
}) => {
  const isMultiMode = !!(setSelectedFiles && setPreviewImages)

  const handlePaste = useCallback(
    (e) => {
      e.preventDefault()

      if (editingMessage) return

      const items = e.clipboardData.items

      // ── Collect all image items from the clipboard ──────────────────────
      const imageItems = []
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile()
          if (!file) continue

          if (file.size > maxImageSizeMB * 1024 * 1024) {
            showAppToast(`Pasted image exceeds the ${maxImageSizeMB} MB limit.`, "error")
            continue
          }

          imageItems.push(file)
        }
      }

      if (imageItems.length > 0) {
        if (isMultiMode) {
          // ── Multi-image: respect the 4-image cap ──────────────────────────
          const available = maxImages - currentImageCount
          if (available <= 0) {
            showAppToast(`You can attach up to ${maxImages} images.`, "error")
            return
          }

          const toAdd = imageItems.slice(0, available)
          const previewUrls = toAdd.map((f) => URL.createObjectURL(f))

          setSelectedFiles((prev) => [...prev, ...toAdd])
          setPreviewImages((prev) => [...prev, ...previewUrls])

          if (onImagePasted) onImagePasted(toAdd, previewUrls)
        } else {
          // ── Legacy single-file: only the first image ──────────────────────
          const file = imageItems[0]
          const previewUrl = URL.createObjectURL(file)

          setSelectedFile(file)
          setPreviewImage(previewUrl)

          if (onImagePasted) onImagePasted(file, previewUrl)

          if (fileInputRef?.current) fileInputRef.current.value = null
        }

        return
      }

      // ── Plain text paste ────────────────────────────────────────────────
      const pastedText = e.clipboardData.getData("text/plain")
      if (pastedText) {
        const el = inputRef.current
        if (!el) return

        const { selectionStart: s, selectionEnd: end } = el
        const newText = input.substring(0, s) + pastedText + input.substring(end)

        setInput(newText)
        if (onTextPasted) onTextPasted(pastedText, newText)

        setTimeout(() => {
          if (el) {
            const cursor = s + pastedText.length
            el.selectionStart = cursor
            el.selectionEnd = cursor
          }
        }, 0)
      }
    },
    [
      inputRef,
      input,
      setInput,
      isMultiMode,
      setSelectedFiles,
      setPreviewImages,
      currentImageCount,
      maxImages,
      setSelectedFile,
      setPreviewImage,
      fileInputRef,
      maxImageSizeMB,
      onImagePasted,
      onTextPasted,
      editingMessage,
    ],
  )

  return handlePaste
}
