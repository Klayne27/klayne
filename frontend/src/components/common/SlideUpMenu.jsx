// components/ui/SlideUpMenu.jsx (CSS-based)
import React from "react"
const SlideUpMenu = ({ isOpen, onClose, children }) => {
  return (
    <>
      {isOpen && <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />}
      <div className={`slide-up-menu bg-base-200 rounded-t-3xl ${isOpen ? "is-open" : ""}`}>
        <div className="menu-content">
          <div className="handle" />
          <div className="options">{children}</div>
        </div>
      </div>
    </>
  )
}
export default SlideUpMenu
