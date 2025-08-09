import React, { useState, useRef, useEffect, useCallback } from "react"

const SlideUpMenu = ({ isOpen, onClose, children }) => {
  const [isDragging, setIsDragging] = useState(false)
  const initialYRef = useRef(0)
  const menuRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      if (menuRef.current) {
        menuRef.current.style.transform = ""
      }
    } else {
      setIsDragging(false)
      initialYRef.current = 0
    }
  }, [isOpen])

  const handleTouchStart = useCallback(
    (e) => {
      e.preventDefault()

      if (!isOpen) return
      e.stopPropagation()
      setIsDragging(true)
      initialYRef.current = e.touches[0].clientY
      if (menuRef.current) {
        menuRef.current.style.transition = "none"
      }
    },
    [isOpen],
  )

  const handleTouchMove = useCallback(
    (e) => {
      if (!isDragging || !isOpen) return
      const currentY = e.touches[0].clientY
      const deltaY = currentY - initialYRef.current
      if (deltaY < 0) return

      if (menuRef.current) {
        menuRef.current.style.transform = `translateY(${deltaY}px)`
      }
    },
    [isDragging, isOpen],
  )

  const handleTouchEnd = useCallback(() => {
    if (!isDragging || !isOpen) return
    setIsDragging(false)

    const menuHeight = menuRef.current.clientHeight
    const currentY = menuRef.current.getBoundingClientRect().top
    const startY = window.innerHeight - menuHeight
    const draggedDistance = currentY - startY

    if (menuRef.current) {
      menuRef.current.style.transition = "transform 300ms ease-out"
    }

    if (draggedDistance > menuHeight * 0.5) {
      menuRef.current.style.transform = "translateY(100%)"
      setTimeout(() => {
        onClose()
      }, 300)
    } else {
      menuRef.current.style.transform = "translateY(0)"
    }
  }, [isDragging, isOpen, onClose])

  // New onClick handler for the backdrop
  const handleBackdropClick = () => {
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
        ref={menuRef}
        className={`fixed bottom-0 left-0 right-0 z-50 transform transition-transform duration-300 ease-out ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex flex-col items-center rounded-t-3xl bg-base-200">
          <div
            className="my-1.5 h-1 w-10 cursor-grab rounded-full bg-accent"
            // Apply event listeners directly to the handle
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
          <div className="flex w-full flex-col gap-5">{children}</div>
        </div>
      </div>
    </>
  )
}

export default SlideUpMenu
