import { useState } from "react"
import { BsThreeDotsVertical } from "react-icons/bs"
import { FaCheckSquare } from "react-icons/fa"
import { FaArrowLeft, FaEllipsisVertical } from "react-icons/fa6"
import { LuSquareActivity } from "react-icons/lu"
import { useNavigate } from "react-router-dom"

function TodoPagesHeader({ pageTitle }) {
  const navigate = useNavigate()
  const [showDropdown, setShowDropdown] = useState(false)

  const handleCompletedPageClick = (e) => {
    e.stopPropagation()
    navigate("/todos/completed")
    setShowDropdown(false)
  }

  const handleActivityLogPageClick = (e) => {
    e.stopPropagation()
    navigate("/todos/activity-log")
    setShowDropdown(false)
  }

  const handleToggleDropdown = (e) => {
    e.stopPropagation()
    setShowDropdown(!showDropdown)
  }

  const handleCloseDropdown = (e) => {
    e.stopPropagation()
    setShowDropdown(false)
  }

  return (
    <div className="flex items-center justify-between gap-4 px-1 py-1 pb-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="rounded-full p-2 transition duration-200 hover:bg-secondary"
        >
          <FaArrowLeft className="size-5" />
        </button>
        <h1 className="text-xl font-bold">{pageTitle}</h1>
      </div>
      <div className="">
        <button
          onClick={handleToggleDropdown}
          className="rounded-full p-[7px] transition duration-200 md:hover:bg-secondary"
        >
          <FaEllipsisVertical />
        </button>
        {showDropdown && (
          <>
            <div
              className="fixed inset-0 z-10 cursor-default bg-transparent"
              onClick={handleCloseDropdown}
            ></div>
            <ul className="white-shadow absolute right-2 top-3 z-20 w-40 rounded-xl bg-base-100 p-2">
              <li>
                <button
                  onClick={handleCompletedPageClick}
                  className="flex w-full items-center gap-2 rounded-md p-2 transition-colors hover:bg-secondary"
                >
                  <FaCheckSquare />
                  <span>Completed</span>
                </button>
              </li>
              <li>
                <button
                  onClick={handleActivityLogPageClick}
                  className="flex w-full items-center gap-2 rounded-md p-2 transition-colors hover:bg-secondary"
                >
                  <LuSquareActivity />
                  <span>Activity Log</span>
                </button>
              </li>
            </ul>
          </>
        )}
      </div>
    </div>
  )
}

export default TodoPagesHeader
