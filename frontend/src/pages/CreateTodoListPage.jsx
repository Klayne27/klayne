import React, { useState } from "react"
import { FaBook, FaDumbbell, FaLightbulb, FaPen, FaStar } from "react-icons/fa6"
import { FaCheckCircle, FaPaintBrush, FaUserFriends } from "react-icons/fa"

import { useNavigate } from "react-router-dom"
import { useTodoStore } from "../store/useTodoStore"
import { useCreateTodoList } from "../hooks/todoListHooks/useCreateTodoList.js"
import { ImBlocked } from "react-icons/im"
import { showAppToast } from "../utils/showAppToast"
import { useRef } from "react"
import { useEffect } from "react"
import { bgColorMap, colorMap, colorOptions, iconOptions } from "../utils/todoUtils.jsx"

const CreateTodoListPage = () => {
  const navigate = useNavigate()
  const { createTodoList, creatingTodoList } = useCreateTodoList()

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isPublic, setIsPublic] = useState(false)
  const [icon, setIcon] = useState("None")
  const [color, setColor] = useState("red")

  const nameInputRef = useRef(null)

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
          // Navigate back to the previous page or a specific page after success
          setName("")
          setDescription("")
          setIsPublic(false)
          setIcon("None")
          setColor("red")
        },
      },
    )
    navigate(-1)
  }

  useEffect(() => {
    nameInputRef.current.focus()
  }, [])

  // To match the modal's UI, the page has a card-like appearance on a light background.
  return (
    <div className="flex min-h-screen items-center justify-center bg-base-100 p-4 sm:p-6">
      <div className="mx-auto w-full max-w-lg">
        <h3 className="mb-6 text-2xl font-bold">Create a Todo Section</h3>
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
              className="w-full border-b border-gray-300 bg-transparent py-2 transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
            />
          </div>

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
            <button type="button" className="btn" onClick={() => navigate(-1)}>
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

export default CreateTodoListPage
