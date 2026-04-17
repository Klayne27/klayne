import { useState, useCallback } from "react"

export const useEmojiPickerPopover = (initialState = false) => {
  const [showEmojiPickerPopover, setShowEmojiPickerPopover] = useState(initialState)
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 })

  const openEmojiPicker = useCallback(
    (e) => {
      e.stopPropagation()

      if (showEmojiPickerPopover) {
        setShowEmojiPickerPopover(false)
        return
      }

      const buttonRect = e.currentTarget.getBoundingClientRect()

      // Get current scroll positions
      const scrollY = window.scrollY || window.pageYOffset
      const scrollX = window.scrollX || window.pageXOffset

      const estimatedPickerWidth = window.innerWidth < 768 ? 280 : 350
      const estimatedPickerHeight = window.innerWidth < 768 ? 400 : 400

      // Calculate position relative to the DOCUMENT (adding scroll)
      let newTop = buttonRect.top + scrollY - estimatedPickerHeight - 10
      let newLeft = buttonRect.left + scrollX + buttonRect.width / 2

      const padding = 10

      // Horizontal constraints
      if (newLeft - estimatedPickerWidth / 2 < padding) {
        newLeft = estimatedPickerWidth / 2 + padding
      }
      if (newLeft + estimatedPickerWidth / 2 > window.innerWidth - padding) {
        newLeft = window.innerWidth - estimatedPickerWidth / 2 - padding
      }

      // Vertical flip logic (if it hits the top of the viewport, show below)
      // Note: we check buttonRect.top (viewport relative) for the flip logic
      if (buttonRect.top - estimatedPickerHeight < padding) {
        newTop = buttonRect.bottom + scrollY + 10
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
