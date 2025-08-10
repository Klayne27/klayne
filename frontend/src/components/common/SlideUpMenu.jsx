import React, { useState, useRef, useEffect, useCallback } from "react"

const SlideUpMenu = ({ isOpen, onClose, children }) => {
  const [isDragging, setIsDragging] = useState(false)
  const initialYRef = useRef(0)
  const menuRef = useRef(null)
  const contentRef = useRef(null) // Ref for the scrollable content area

  // Effect to control body scroll and overscroll behavior
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden" // Prevent background from scrolling
      document.body.style.overscrollBehaviorY = "contain" // The KEY FIX for pull-to-refresh
    } else {
      document.body.style.overflow = ""
      document.body.style.overscrollBehaviorY = ""
    }

    // Cleanup on component unmount
    return () => {
      document.body.style.overflow = ""
      document.body.style.overscrollBehaviorY = ""
    }
  }, [isOpen])

  // Reset styles when closing
  useEffect(() => {
    if (!isOpen && menuRef.current) {
      menuRef.current.style.transform = ""
    }
  }, [isOpen])

  const handleTouchStart = useCallback((e) => {
    // Only start dragging if the content is scrolled to the top
    if (contentRef.current && contentRef.current.scrollTop !== 0) {
      return
    }
    setIsDragging(true)
    initialYRef.current = e.touches[0].clientY
    if (menuRef.current) {
      menuRef.current.style.transition = "none"
    }
  }, [])

  const handleTouchMove = useCallback(
    (e) => {
      if (!isDragging) return

      // Prevent default browser actions (like scrolling) ONLY when dragging
      e.preventDefault()

      const currentY = e.touches[0].clientY
      const deltaY = currentY - initialYRef.current

      // Only allow dragging down
      if (deltaY < 0) return

      if (menuRef.current) {
        menuRef.current.style.transform = `translateY(${deltaY}px)`
      }
    },
    [isDragging],
  )

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return
    setIsDragging(false)

    const menu = menuRef.current
    if (!menu) return

    const menuHeight = menu.clientHeight
    // Get the final transform value after dragging
    const currentTransform = new DOMMatrix(getComputedStyle(menu).transform).m42

    menu.style.transition = "transform 300ms ease-out"

    // Close if dragged more than 40% of its height
    if (currentTransform > menuHeight * 0.4) {
      menu.style.transform = "translateY(100%)"
      setTimeout(onClose, 300)
    } else {
      menu.style.transform = "translateY(0)"
    }
  }, [isDragging, onClose])

  const handleBackdropClick = () => {
    if (menuRef.current) {
      menuRef.current.style.transition = "transform 300ms ease-out"
      menuRef.current.style.transform = "translateY(100%)"
    }
    setTimeout(onClose, 300)
  }

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-40 bg-black/50" onClick={handleBackdropClick} />}
      <div
        ref={menuRef}
        className={`fixed bottom-0 left-0 right-0 z-50 transform touch-none rounded-t-3xl bg-base-200 transition-transform duration-300 ease-out ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
        // Apply touch listeners to the entire menu
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex flex-col items-center">
          {/* The visual handle */}
          <div className="my-1.5 h-1 w-10 shrink-0 rounded-full bg-accent" />

          {/* We pass the contentRef to the child wrapper */}
          {React.cloneElement(React.Children.only(children), { ref: contentRef })}
        </div>
      </div>
    </>
  )
}


export const SlideUpMenuContent = React.forwardRef(({ children, className }, ref) => {
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
});
export default SlideUpMenu
