// src/pages/EditTodoListPage.jsx

import React, { useState, useEffect } from "react"
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
import { useNavigate, useLocation, useParams } from "react-router-dom"
import { useUpdateTodoList } from "../hooks/todoListHooks/useTodoListQueries"
import { ImBlocked } from "react-icons/im"

const EditTodoListPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { list } = location.state || {} // Get list data passed from the previous page

  const { updateTodoList, isUpdatingTodoList } = useUpdateTodoList() // Initialize state

  const [name, setName] = useState("")
  const [isPublic, setIsPublic] = useState(false)
  const [icon, setIcon] = useState("None")
  const [color, setColor] = useState("red") // Populate form with existing data when the component loads

  useEffect(() => {
    if (list) {
      setName(list.name || "")
      setIsPublic(list.isPublic || false)
      setIcon(list.icon || "None")
      setColor(list.color || "red")
    } // In a real-world app, if `list` is undefined (e.g., page refresh),
    // you would fetch the data using the `id` from `useParams`.
  }, [list])

  const iconOptions = [
    { name: "None", icon: <ImBlocked /> },
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
    const listData = { name, isPublic, icon, color }

    updateTodoList(
      { id: list._id, listData },
      {
        onSuccess: () => {
          navigate(-1) // Go back to the previous page on success
        },
      },
    )
  } // Fallback UI for when list data is not available (e.g., direct navigation/refresh)

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
        <h3 className="mb-6 text-2xl font-bold text-white">Edit Todo Section</h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 py-4">
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
                  className={`h-8 w-8 rounded-full border-2 ${color === opt ? "border-current" : "border-transparent"} ${colorMap[opt]} cursor-pointer`}
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
