// components/modals/CreateTodoModal.jsx
import React, { useState } from "react"
import { useTodoStore } from "../../store/useTodoStore"
import { useCreateTodo } from "../../hooks/todoHooks/useTodoQueries"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"

const CreateTodoModal = () => {
  const {
    showCreateTodoModal,
    setShowCreateTodoModal,
    currentListIdForTodoCreation,
    setCurrentListIdForTodoCreation,
  } = useTodoStore()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [isPublic, setIsPublic] = useState(false)
  const [priority, setPriority] = useState("low") // New state for priority
  const [dueDate, setDueDate] = useState(null) // New state for due date
  const createTodoMutation = useCreateTodo()

  const handleSubmit = (e) => {
    e.preventDefault()
    createTodoMutation.mutate(
      {
        title,
        description,
        isPublic,
        todoListId: currentListIdForTodoCreation,
        priority, // Include priority
        dueDate, // Include dueDate
      },
      {
        onSuccess: () => {
          setTitle("")
          setDescription("")
          setIsPublic(false)
          setPriority("medium") // Reset priority
          setDueDate(null) // Reset due date
          setShowCreateTodoModal(false)
          setCurrentListIdForTodoCreation(null)
        },
      },
    )
  }

  if (!showCreateTodoModal) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-700/70"
      onClick={() => {
        setShowCreateTodoModal(false)
        setCurrentListIdForTodoCreation(null)
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative mx-2 w-full max-w-lg rounded-2xl bg-base-100 p-6"
      >
        <h3 className="text-xl font-bold">Create a new Todo</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Todo name"
            className="my-2 w-full rounded-md border border-gray-300 bg-transparent px-4 py-2 transition-colors duration-200 focus:border-primary focus:outline-none"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          {/* Priority Dropdown */}
          <div className="my-2 flex items-center gap-2">
            <label className="text-sm font-medium">Priority:</label>
            <select
              className="rounded-md border border-gray-300 bg-transparent px-2 py-1 text-sm focus:border-primary focus:outline-none"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* Due Date Picker */}
          <div className="my-2 flex items-center gap-2">
            <label className="text-sm font-medium">Due Date:</label>
            <DatePicker
              className="rounded-md border border-gray-300 bg-transparent px-2 py-1 text-sm focus:border-primary focus:outline-none"
              selected={dueDate}
              onChange={(date) => setDueDate(date)}
              dateFormat="MMMM d, yyyy"
              isClearable
              placeholderText="Select a date"
            />
          </div>

          <div className="mt-6 flex justify-end space-x-2">
            <button
              type="button"
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              onClick={(e) => {
                e.stopPropagation()
                setShowCreateTodoModal(false)
                setCurrentListIdForTodoCreation(null)
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-white transition-colors hover:bg-primary/85 disabled:cursor-not-allowed disabled:bg-blue-400"
              disabled={createTodoMutation.isPending}
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateTodoModal
