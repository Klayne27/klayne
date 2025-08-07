import { useState, useCallback } from "react"

export const useEmojiPickerPopover = (initialState = false) => {
  const [showEmojiPickerPopover, setShowEmojiPickerPopover] = useState(initialState)
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 })

  const openEmojiPicker = useCallback(
    (e) => {
      e.stopPropagation()

      // if (setShowMoreActionsModal) {
      //   setShowMoreActionsModal(false)
      // }

      if (showEmojiPickerPopover) {
        setShowEmojiPickerPopover(false)
        return
      }

      const buttonRect = e.currentTarget.getBoundingClientRect()
      const estimatedPickerWidth = window.innerWidth < 768 ? 280 : 350
      const estimatedPickerHeight = window.innerWidth < 768 ? 400 : 400

      let newTop = buttonRect.top - estimatedPickerHeight - 10
      let newLeft = buttonRect.left + buttonRect.width / 2

      const padding = 10

      if (newLeft - estimatedPickerWidth / 2 < padding) {
        newLeft = estimatedPickerWidth / 2 + padding
      }
      if (newLeft + estimatedPickerWidth / 2 > window.innerWidth - padding) {
        newLeft = window.innerWidth - estimatedPickerWidth / 2 - padding
      }
      if (newTop < padding) {
        newTop = buttonRect.bottom + 10
      }

      setPopoverPosition({ top: newTop, left: newLeft })
      setShowEmojiPickerPopover(true)
    },
    [showEmojiPickerPopover],
  )

  const handleCloseEmojiPickerPopover = useCallback(() => {
    setShowEmojiPickerPopover(false)
  }, [])

  const handleOpenEmojiPickerPopover = (e) => {
    openEmojiPicker(e)
  }

  return {
    showEmojiPickerPopover,
    setShowEmojiPickerPopover,
    popoverPosition,
    handleOpenEmojiPickerPopover,
    handleCloseEmojiPickerPopover,
  }
}
