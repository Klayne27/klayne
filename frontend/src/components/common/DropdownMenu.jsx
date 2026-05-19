import { useLayoutEffect, useState, useRef } from "react"
import useDropdownMenu from "../../hooks/customHooks/useDropdownMenu"

const DropdownMenu = ({ children, icon }) => {
  const { showMenu, toggleMenu, menuRef } = useDropdownMenu()
  const triggerRef = useRef(null)
  const [openUpwards, setOpenUpwards] = useState(false)

  useLayoutEffect(() => {
    if (showMenu && triggerRef.current && menuRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect()
      const menuHeight = menuRef.current.offsetHeight
      const windowHeight = window.innerHeight

      // Check if there is enough space below the trigger for the menu + offset padding
      const spaceBelow = windowHeight - triggerRect.bottom
      const needsToOpenUpward = spaceBelow < menuHeight + 10

      setOpenUpwards(needsToOpenUpward)
    }
  }, [showMenu, menuRef])

  return (
    <span
      ref={triggerRef}
      className="group relative right-0 ml-auto mr-0.5 flex rounded-full p-2 transition duration-200 hover:bg-primary/20"
      onClick={toggleMenu}
    >
      <div
        className={`group cursor-pointer rounded-full transition duration-200 hover:text-primary`}
      >
        {icon}
      </div>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-[10] h-screen w-screen cursor-default bg-transparent"
            onClick={toggleMenu}
          ></div>
          <div
            style={{
              animation: "fadeInSlideDown 0.2s ease-out forwards",
            }}
            ref={menuRef}
            // Dynamic placement: if openUpwards is true, swap 'top-full mt-1' out for 'bottom-full mb-1'
            className={`white-shadow menu-popover absolute right-0 z-10 w-max rounded-xl bg-base-100 py-2 ${
              openUpwards ? "bottom-full mb-1" : "top-full mt-1"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </div>
        </>
      )}
    </span>
  )
}

export default DropdownMenu
