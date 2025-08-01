import { BsThreeDots } from "react-icons/bs";
import useDropdownMenu from "../../hooks/customHooks/useDropdownMenu";

const DropdownMenu = ({ children }) => {
  const { showMenu, toggleMenu, menuRef } = useDropdownMenu();

  return (
    <span
      className="flex ml-auto relative right-0 group rounded-full p-2 mr-0.5 hover:bg-primary/20 transition duration-200"
      onClick={toggleMenu}
    >
      <div
        className={`group duration-200 transition hover:text-primary rounded-full cursor-pointer`}
      >
        <BsThreeDots className="group-hover:text-primary  text-slate-500" />
      </div>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 bg-transparent z-10 cursor-default"
            onClick={toggleMenu}
          ></div>
          <div
            ref={menuRef}
            className="absolute right-0 white-shadow top-0 w-max bg-base-100 rounded-xl text-lg z-10 menu-popover py-2"
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </div>
        </>
      )}
    </span>
  );
};

export default DropdownMenu;
