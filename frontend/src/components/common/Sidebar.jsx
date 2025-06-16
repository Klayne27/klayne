import XSvg from "../svgs/X";

import { PiBellThin } from "react-icons/pi";
import { Link, useLocation } from "react-router-dom";
import { BiLogOut } from "react-icons/bi";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";
import { useLogout } from "../../hooks/authHooks/useLogout";
import { CiMail, CiUser } from "react-icons/ci";
import { PiHouseThin } from "react-icons/pi";

const Sidebar = () => {
  const { authUser } = useAuthUser();
  const { logout } = useLogout();

  const { pathname } = useLocation();

  return (
    <div className="md:flex-[2_2_0] max-w-56 ">
      <div className="sticky top-0 left-0 h-screen flex flex-col border-r border-gray-700 w-20 md:w-full">
        <Link to="/" className="flex justify-start md:justify-start">
          <XSvg className="px-2 w-12 h-12 rounded-full fill-white hover:bg-stone-900" />
        </Link>
        <ul className="flex flex-col gap-3 mt-4">
          <li className="flex justify-start md:justify-start">
            <Link
              to="/"
              className={`${
                pathname === "/" ? "font-bold text-white" : ""
              } flex gap-2.5 items-center hover:bg-stone-900 transition-all rounded-full py-2 pl-2 pr-4 max-w-fit cursor-pointer`}
            >
              <PiHouseThin className="w-7 h-7 fill-white" strokeWidth={12} />
              <span className="text-lg hidden md:block">Home</span>
            </Link>
          </li>
          <li className="flex justify-start md:justify-start">
            <Link
              to="/messages"
              className={`${
                pathname === "/messages" ? "font-bold text-white" : ""
              } flex gap-3 items-center hover:bg-stone-900 transition-all rounded-full py-2 pl-2.5 pr-4 max-w-fit cursor-pointer`}
            >
              <CiMail className="w-6 h-6" strokeWidth={1} />
              <span className="text-lg hidden md:block">Messages</span>
            </Link>
          </li>
          <li className="flex justify-start md:justify-start">
            <Link
              to="/notifications"
              className={`${
                pathname === "/notifications" ? "font-bold text-white" : ""
              } flex gap-3 items-center hover:bg-stone-900 transition-all rounded-full py-2 pl-2.5 pr-4 max-w-fit cursor-pointer`}
            >
              <PiBellThin className="w-6 h-6" strokeWidth={15} />
              <span className="text-lg hidden md:block">Notifications</span>
            </Link>
          </li>

          <li className="flex justify-start md:justify-start">
            <Link
              to={`/profile/${authUser?.username}`}
              className={`${
                pathname === `/profile/${authUser?.username}` ? "font-bold text-white" : ""
              } flex gap-[10px] items-center hover:bg-stone-900 transition-all rounded-full py-2 pl-2 pr-4 max-w-fit cursor-pointer`}
            >
              <CiUser className="w-7 h-7" strokeWidth={1} />
              <span className="text-lg hidden md:block">Profile</span>
            </Link>
          </li>
        </ul>
        {authUser && (
          <Link
            to={`/profile/${authUser?.username}`}
            className="mt-auto mb-3 flex gap-2 items-start transition-all duration-300 hover:bg-[#181818] py-2 px-4 rounded-full"
          >
            <div className="avatar hidden md:inline-flex">
              <div className="w-8 rounded-full">
                <img src={authUser?.profileImg || "/avatar-placeholder.png"} />
              </div>
            </div>
            <div className="flex justify-between flex-1 items-center">
              <div className="hidden md:block">
                <p className="text-white font-bold text-sm w-20 truncate">
                  {authUser?.fullName}
                </p>
                <p className="text-slate-500 text-sm">@{authUser?.username}</p>
              </div>
              <BiLogOut
                className="w-5 h-5 cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  logout();
                }}
              />
            </div>
          </Link>
        )}
      </div>
    </div>
  );
};
export default Sidebar;
