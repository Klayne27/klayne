import React, { useState } from "react"
import { useCreateTodoList } from "../../hooks/todoListHooks/useTodoListQueries"
import { useTodoStore } from "../../store/useTodoStore"
import {
  FaBook,
  FaDumbbell,
  FaLightbulb,
  FaPaintBrush,
  FaCheckCircle,
  FaStar,
  FaPen,
  FaUserFriends,
} from "react-icons/fa"

const CreateTodoListModal = () => {
  const { showCreateTodoListModal, setShowCreateTodoListModal } = useTodoStore()
  const createTodoListMutation = useCreateTodoList()

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isPublic, setIsPublic] = useState(false)
  const [icon, setIcon] = useState("FaPen")
  const [color, setColor] = useState("red")

  const iconOptions = [
    { name: "FaPen", icon: <FaPen /> },
    { name: "FaCheckCircle", icon: <FaCheckCircle /> },
    { name: "FaStar", icon: <FaStar /> },
    { name: "FaBook", icon: <FaBook /> },
    { name: "FaDumbbell", icon: <FaDumbbell /> },
    { name: "FaLightbulb", icon: <FaLightbulb /> },
    { name: "FaPaintBrush", icon: <FaPaintBrush /> },
    { name: "FaUserFriends", icon: <FaUserFriends /> },
  ]
  const colorOptions = [
    "red",
    "orange",
    "yellow",
    "emerald",
    "teal",
    "cyan",
    "blue",
    "violet",
    "fuchsia",
    "pink",
    "slate",
    "stone",
  ]

  // Create a map to hold the full Tailwind CSS class strings
  const colorMap = {
    red: "bg-red-400",
    orange: "bg-orange-400",
    yellow: "bg-yellow-400",
    emerald: "bg-emerald-400",
    teal: "bg-teal-400",
    cyan: "bg-cyan-400",
    blue: "bg-blue-400",
    violet: "bg-violet-400",
    fuchsia: "bg-fuchsia-400",
    pink: "bg-pink-400",
    slate: "bg-slate-400",
    stone: "bg-stone-400",
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    createTodoListMutation.mutate(
      { name, description, isPublic, icon, color },
      {
        onSuccess: () => {
          setShowCreateTodoListModal(false)
          setName("")
          setDescription("")
          setIsPublic(false)
          setIcon("FaPen")
          setColor("red")
        },
      },
    )
  }

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
        <h3 className="text-lg font-bold">Create a new Todo Section</h3>
        <form onSubmit={handleSubmit}>
          {/* Name Input */}
          <div className="mb-4 mt-2">
            <label className="label">
              <span className="label-text">List Name</span>
            </label>

            <input
              type="text"
              placeholder="e.g., Study Tasks"
              className="input input-bordered w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              required
            />
          </div>
          {/* Description Input */}
          {/* <div className="mb-4">
            <label className="label">
              <span className="label-text">Description (optional)</span>
            </label>

            <textarea
              placeholder="What's this list for?"
              className="textarea textarea-bordered w-full"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
            ></textarea>
          </div> */}
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
                  className={`btn btn-sm text-lg ${icon === opt.name ? "btn-active" : ""}`}
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
                  } ${colorMap[opt]} cursor-pointer`}
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

            <button
              type="submit"
              className="btn btn-primary"
              disabled={createTodoListMutation.isPending}
            >
              {createTodoListMutation.isPending ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateTodoListModal
