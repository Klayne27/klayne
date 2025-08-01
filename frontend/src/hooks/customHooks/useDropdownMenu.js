import { useState, useRef } from "react";

const useDropdownMenu = () => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  const toggleMenu = (e) => {
    e.stopPropagation();
    setShowMenu((prev) => !prev);
  };

  return { showMenu, toggleMenu, menuRef, setShowMenu };
};

export default useDropdownMenu;
