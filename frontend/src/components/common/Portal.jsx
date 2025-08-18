// src/components/Portal.jsx
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"

const Portal = ({ children }) => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const portalRoot = document.getElementById("todo-dropdown-root")

  return mounted ? createPortal(children, portalRoot) : null
}

export default Portal
