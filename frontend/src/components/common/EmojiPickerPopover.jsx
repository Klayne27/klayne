import { useEffect, useRef } from "react"
import ReactDOM from "react-dom"
import EmojiPicker from "emoji-picker-react" 

const EmojiPickerPopover = ({ position, onClose, onEmojiClick, triggerRef }) => {
  const popoverRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target)
      ) {
        onClose()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [onClose, triggerRef])

  const popoverStyle = {
    position: "absolute",
    top: position.top,
    left: position.left,
    transform: "translateX(-50%)", 
    zIndex: 1000,
  }

  const portalRoot = document.getElementById("emoji-popover-root")
  if (!portalRoot) {
    console.error("Portal root 'emoji-popover-root' not found in document.")
    return null 
  }

  return ReactDOM.createPortal(
    <div
      ref={popoverRef}
      style={popoverStyle}
      className="emoji-picker-popover-container" 
    >
      <EmojiPicker
        onEmojiClick={onEmojiClick}
        width={280} 
        height={400} 
        theme="dark"
        skinTonesDisabled={false}
        autoFocusSearch={false}
      />
    </div>,
    portalRoot,
  )
}

export default EmojiPickerPopover
