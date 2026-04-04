import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useRef } from "react"
import { showAppToast } from "../../utils/showAppToast"
import { bgColorMap, colorOptions, iconOptions } from "../../utils/todoUtils"
import { useUpdateTodoList } from "../../features/todos/todoListHooks/useTodoListMutations"

const EditTodoListPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { list } = location.state || {}

  const { updateTodoList, isUpdatingTodoList } = useUpdateTodoList()

  const [name, setName] = useState("")
  const [isPublic, setIsPublic] = useState(false)
  const [icon, setIcon] = useState("None")
  const [color, setColor] = useState("red")

  const nameInputRef = useRef(null)

  useEffect(() => {
    if (list) {
      setName(list.name || "")
      setIsPublic(list.isPublic || false)
      setIcon(list.icon || "None")
      setColor(list.color || "red")
    }
  }, [list])

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!name) {
      showAppToast("Section name can't be empty")
      return
    }
    const listData = { name, isPublic, icon, color }

    updateTodoList(
      { id: list._id, listData },
      {
        onSuccess: () => {
          navigate(-1)
        },
      },
    )
  }

  useEffect(() => {
    nameInputRef.current.focus()
  }, [])

  if (!list) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base-100 p-4">
        <p>List data not found. Please navigate from the main page.</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-base-100 p-4 sm:p-6">
      <div className="mx-auto w-full max-w-lg">
        <h3 className="mb-6 text-2xl font-bold">Edit Todo Section</h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 py-4">
          {/* Name Input */}
          <div className="mb-4 mt-2">
            <label className="">
              <span className="text-xs text-slate-500">Section Name</span>
            </label>

            <input
              ref={nameInputRef}
              type="text"
              placeholder="e.g., Study Tasks"
              className="w-full border-b border-gray-300 bg-transparent py-2 text-gray-900 transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:text-white"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
            />
          </div>
          {/* Icon Picker */}
          <div className="mb-4">
            <label className="label">
              <span className="label-text">Icon</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {iconOptions.map((opt) => (
                <button
                  type="button"
                  key={opt.name}
                  className={`btn btn-sm text-lg ${opt.name === "None" ? "bg-base-100 px-[13px] border-none" : ""} ${icon === opt.name ? "btn-active" : ""}`}
                  onClick={() => setIcon(opt.name)}
                >
                  {opt.icon}
                </button>
              ))}
            </div>
          </div>
          {/* Color Picker */}
          <div className="mb-4">
            <label className="label">
              <span className="label-text">Color</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map((opt) => (
                <div
                  key={opt}
                  className={`h-8 w-8 rounded-full border-2 ${color === opt ? "border-current" : "border-transparent"} ${bgColorMap[opt]} cursor-pointer`}
                  onClick={() => setColor(opt)}
                ></div>
              ))}
            </div>
          </div>
          {/* Public Toggle */}
          <div className="form-control mb-4">
            <label className="label cursor-pointer">
              <span className="label-text">Make List Public?</span>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
              />
            </label>
          </div>
          {/* Action Buttons */}
          <div className="modal-action">
            <button type="button" className="btn" onClick={() => navigate(-1)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isUpdatingTodoList}>
              {isUpdatingTodoList ? "Updating..." : "Update"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditTodoListPage
