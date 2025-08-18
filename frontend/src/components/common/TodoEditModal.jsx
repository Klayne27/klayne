import { useState, useEffect } from "react"

const TodoEditModal = ({ isOpen, onClose, todo, onSave, isLoading }) => {
  const [formData, setFormData] = useState({
    title: "",
    dueDate: "",
    priority: "medium",
  })

  useEffect(() => {
    if (todo) {
      setFormData({
        title: todo.title || "",
        dueDate: todo.dueDate ? new Date(todo.dueDate).toISOString().split("T")[0] : "",
        priority: todo.priority || "medium",
      })
    }
  }, [todo])

  const handleSubmit = (e) => {
    e.preventDefault()
    const updateData = {
      ...formData,
      dueDate: formData.dueDate || null,
    }
    onSave(updateData)
  }

  const handleInputChange = (field) => (e) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-lg bg-white shadow-xl dark:bg-gray-800">
        <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
          <h2 className="text-lg font-semibold">Edit Todo</h2>
          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {/* <X size={20} /> */}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          {/* Title Field */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium">
              {/* <Type size={16} /> */}
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={handleInputChange("title")}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
              required
            />
          </div>

          {/* Due Date Field */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium">
              {/* <Calendar size={16} /> */}
              Due Date
            </label>
            <input
              type="date"
              value={formData.dueDate}
              onChange={handleInputChange("dueDate")}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
            />
          </div>

          {/* Priority Field */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium">
              {/* <Flag size={16} /> */}
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={handleInputChange("priority")}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TodoEditModal
