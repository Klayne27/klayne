import { useState } from "react"

import { useRef } from "react"
import { useEffect } from "react"
import { bgColorMap, colorOptions, iconOptions } from "../../utils/todoUtils"
import { useCreateTodoList } from "../../hooks/todoListHooks/useCreateTodoList"
import { useTodoStore } from "../../store/useTodoStore"
import { showAppToast } from "../../utils/showAppToast"

const CreateTodoListModal = () => {
  const { showCreateTodoListModal, setShowCreateTodoListModal } = useTodoStore()
  const { createTodoList, creatingTodoList } = useCreateTodoList()

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isPublic, setIsPublic] = useState(false)
  const [icon, setIcon] = useState("None")
  const [color, setColor] = useState("red")

  const titleInputRef = useRef(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name) {
      showAppToast("List name can't be empty")
      return
    }
    createTodoList(
      { name, description, isPublic, icon, color },
      {
        onSuccess: () => {
          setName("")
          setDescription("")
          setIsPublic(false)
          setIcon("None")
          setColor("red")
        },
      },
    )
    setShowCreateTodoListModal(false)
  }

  useEffect(() => {
    titleInputRef.current.focus()
  }, [])

  if (!showCreateTodoListModal) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-700/70"
      onClick={() => setShowCreateTodoListModal(false)}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-base-100 p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold">Create a Todo Section</h3>
        <form onSubmit={handleSubmit}>
          {/* Name Input */}
          <div className="mb-4 mt-2">
            <label className="">
              <span className="text-xs text-slate-500">List Name</span>
            </label>

            <input
              ref={titleInputRef}
              type="text"
              placeholder="e.g., Study Tasks"
              className="w-full border-b border-gray-300 bg-transparent py-2 transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
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
                  className={`btn btn-sm text-lg ${opt.name === "None" ? "border-none bg-base-100 px-[13px]" : ""} ${icon === opt.name ? "btn-active" : ""}`}
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
                  className={`h-8 w-8 rounded-full border-2 ${
                    color === opt ? "border-current" : "border-transparent"
                  } ${bgColorMap[opt]} cursor-pointer`}
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
            <button type="button" className="btn" onClick={() => setShowCreateTodoListModal(false)}>
              Cancel
            </button>

            <button type="submit" className="btn btn-primary" disabled={creatingTodoList}>
              {creatingTodoList ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateTodoListModal
