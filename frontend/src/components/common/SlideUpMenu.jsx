import React, { useState, useRef, useEffect, useCallback } from "react"
import useLockBodyScroll from "../../hooks/customHooks/useLockBodyScroll"

const SlideUpMenu = ({ isOpen, onClose, children }) => {
  const [isDragging, setIsDragging] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(false)
  const [isRendered, setIsRendered] = useState(false)
  const [visualState, setVisualState] = useState("closed")

  const initialYRef = useRef(0)
  const menuRef = useRef(null)
  const contentRef = useRef(null)
  const scrollPositionRef = useRef(0) 
  const touchStartTimeRef = useRef(0)

  useLockBodyScroll(isRendered)

  useEffect(() => {
    let mountTimer
    let animationTimer

    if (isOpen) {
      setIsRendered(true)
      mountTimer = setTimeout(() => {
        setVisualState("open")
      }, 10) 
    } else {
      setVisualState("closed")
      animationTimer = setTimeout(() => {
        setIsRendered(false)
      }, 300)
    }

    return () => {
      clearTimeout(mountTimer)
      clearTimeout(animationTimer)
    }
  }, [isOpen])

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

  useEffect(() => {
    if (!isRendered) return

    const preventPullToRefresh = (e) => {
      if (window.scrollY === 0 && e.touches && e.touches[0].clientY > e.touches[0].pageY) {
        e.preventDefault()
      }
    }

    const handleTouchMove = (e) => {
      if (isDragging) {
        e.preventDefault()
      }
    }

    document.addEventListener("touchstart", preventPullToRefresh, { passive: false })
    document.addEventListener("touchmove", handleTouchMove, { passive: false })

    return () => {
      document.removeEventListener("touchstart", preventPullToRefresh)
      document.removeEventListener("touchmove", handleTouchMove)
    }
  }, [isRendered, isDragging])

  const handleTouchStart = useCallback((e) => {
    if (contentRef.current && contentRef.current.scrollTop !== 0) {
      return
    }

    setIsDragging(true)
    initialYRef.current = e.touches[0].clientY
    touchStartTimeRef.current = Date.now()

    if (menuRef.current) {
      menuRef.current.style.transition = "none"
    }

    e.preventDefault()
  }, [])

  const handleTouchMove = useCallback(
    (e) => {
      if (!isDragging) return

      e.preventDefault()
      e.stopPropagation()

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
    const touchDuration = Date.now() - touchStartTimeRef.current

    menu.style.transition = "transform 300ms ease-out"

    const shouldClose =
      currentTransform > menuHeight * 0.4 || (currentTransform > 50 && touchDuration < 300)

    if (shouldClose) {
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

  if (!isRendered) {
    return null
  }

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-40 bg-black/50" onClick={handleBackdropClick} />}
      <div
        onClick={(e) => e.stopPropagation()}
        ref={menuRef}
        style={{
          bottom: `${keyboardHeight}px`,
          touchAction: "none",
        }}
        className={`fixed left-0 right-0 z-50 transform transition-transform duration-300 ease-out ${
          visualState === "open" ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div
          className="flex flex-col items-center rounded-t-3xl bg-base-200"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ touchAction: "none" }}
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
