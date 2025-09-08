import useDropdownMenu from "../../hooks/customHooks/useDropdownMenu"

const DropdownMenu = ({ children, icon }) => {
  const { showMenu, toggleMenu, menuRef, setShowMenu } = useDropdownMenu()

  return (
    <span
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
            className="fixed inset-0 z-10 h-screen w-screen cursor-default bg-transparent"
            onClick={toggleMenu}
          ></div>
          <div
            ref={menuRef}
            className="white-shadow menu-popover absolute right-0 top-0 z-10 w-max rounded-xl bg-base-100 py-2"
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
