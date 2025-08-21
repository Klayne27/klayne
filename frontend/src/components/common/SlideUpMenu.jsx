// src/components/todos/SlideUpMenu.jsx
import React, { useState, useRef, useEffect, useCallback } from "react"

const SlideUpMenu = ({ isOpen, onClose, children }) => {
  const [isDragging, setIsDragging] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const initialYRef = useRef(0)
  const menuRef = useRef(null)
  const contentRef = useRef(null)
  const scrollPositionRef = useRef(0) // <-- Ref to store scroll position

  // ✅ MODIFIED: Robust scroll lock useEffect
  useEffect(() => {
    const body = document.body

    if (isOpen) {
      // 1. Store the current scroll position
      scrollPositionRef.current = window.scrollY

      // 2. Apply robust scroll-locking styles to the body
      body.style.overflow = "hidden"
      body.style.position = "fixed"
      // Use the stored scroll position to prevent the page from jumping to the top
      body.style.top = `-${scrollPositionRef.current}px`
      // Ensure the body takes up the full width
      body.style.width = "100%"
      body.style.overscrollBehavior = "none"
    }

    // 3. Cleanup function to run when the menu closes
    return () => {
      // Remove the locking styles
      body.style.overflow = ""
      body.style.position = ""
      body.style.top = ""
      body.style.width = ""
      body.style.overscrollBehavior = ""

      // 4. Restore the original scroll position
      window.scrollTo(0, scrollPositionRef.current)
    }
  }, [isOpen]) // This effect depends only on the isOpen state

  // --- No changes to the rest of your component ---

  useEffect(() => {
    const visualViewport = window.visualViewport
    if (!visualViewport) return

    const handleResize = () => {
      const newKeyboardHeight = window.innerHeight - visualViewport.height
      setKeyboardHeight(Math.max(0, newKeyboardHeight))
    }

    visualViewport.addEventListener("resize", handleResize)
    handleResize()

    return () => {
      visualViewport.removeEventListener("resize", handleResize)
    }
  }, [])

  useEffect(() => {
    if (!isOpen && menuRef.current) {
      menuRef.current.style.transform = ""
    }
  }, [isOpen])

  const handleTouchStart = useCallback((e) => {
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
      // Prevent the background from scrolling on touch devices
      e.preventDefault()
      if (!isDragging) return
      const currentY = e.touches[0].clientY
      const deltaY = currentY - initialYRef.current
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
    const currentTransform = new DOMMatrix(getComputedStyle(menu).transform).m42
    menu.style.transition = "transform 300ms ease-out"
    if (currentTransform > menuHeight * 0.4) {
      menu.style.transform = "translateY(100%)"
      setTimeout(onClose, 300)
    } else {
      menu.style.transform = "translateY(0)"
    }
  }, [isDragging, onClose])

  const handleBackdropClick = (e) => {
    e.stopPropagation()
    if (menuRef.current) {
      menuRef.current.style.transition = "transform 300ms ease-out"
      menuRef.current.style.transform = "translateY(100%)"
    }
    setTimeout(() => {
      onClose()
    }, 0)
  }

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-40 bg-black/50" onClick={handleBackdropClick} />}
      <div
        onClick={(e) => e.stopPropagation()}
        ref={menuRef}
        style={{ bottom: `${keyboardHeight}px` }}
        className={`fixed left-0 right-0 z-[1000] transform transition-transform duration-300 ease-out ${isOpen ? "translate-y-0" : "translate-y-full"}`}
      >
        <div
          className="flex flex-col items-center rounded-t-3xl bg-base-200"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="flex w-full items-center justify-center">
            <div className="my-1.5 h-1 w-10 rounded-full bg-accent" />
          </div>
          {React.cloneElement(React.Children.only(children), { ref: contentRef })}
        </div>
      </div>
    </>
  )
}

export const SlideUpMenuContent = React.forwardRef(
  ({ children, className, disablePullToRefresh }, ref) => {
    return (
      <div
        ref={ref}
        className={className}
        style={disablePullToRefresh ? { overscrollBehaviorY: "contain" } : undefined}
      >
        {children}
      </div>
    )
  },
)
SlideUpMenuContent.displayName = "SlideUpMenuContent"

export default SlideUpMenu
