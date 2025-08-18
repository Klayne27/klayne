import React, { useState, useRef, useEffect } from "react"

const CustomDropdown = ({
  isOpen,
  onClose,
  children,
  className = "",
  position = "bottom-right", // bottom-right, bottom-left, top-right, top-left
}) => {
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose()
      }
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("keydown", handleEscape)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const positionClasses = {
    "bottom-right": "top-full right-0 mt-1",
    "bottom-left": "top-full left-0 mt-1",
    "top-right": "bottom-full right-0 mb-1",
    "top-left": "bottom-full left-0 mb-1",
  }

  return (
    <div
      ref={dropdownRef}
      className={`absolute z-50 min-w-48 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 ${positionClasses[position]} ${className} `}
    >
      {children}
    </div>
  )
}

export default CustomDropdown
