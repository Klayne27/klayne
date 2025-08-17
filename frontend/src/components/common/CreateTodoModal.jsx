import React, { useState } from "react"
import { useTodoStore } from "../../store/useTodoStore"
import { useCreateTodo } from "../../hooks/todoHooks/useTodoQueries"

const CreateTodoModal = () => {
  const {
    showCreateTodoModal,
    setShowCreateTodoModal,
    currentListIdForTodoCreation, // Use the new state
    setCurrentListIdForTodoCreation, // Use the new action
    setSelectedTodo,
  } = useTodoStore()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [isPublic, setIsPublic] = useState(false)
  const createTodoMutation = useCreateTodo()

  const handleSubmit = (e) => {
    e.preventDefault()
    createTodoMutation.mutate(
      { title, description, isPublic, todoListId: currentListIdForTodoCreation }, // Use the new state
      {
        onSuccess: () => {
          setShowCreateTodoModal(false)
          setCurrentListIdForTodoCreation(null) // Clear the state after creation
          setSelectedTodo(null)
          setTitle("")
          setDescription("")
          setIsPublic(false)
        },
      },
    )
  }

  if (!showCreateTodoModal) return null

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="text-lg font-bold">Create a new Todo</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Todo Title"
            className="input input-bordered my-2 w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          {/* <textarea
            placeholder="Description (optional)"
            className="textarea textarea-bordered my-2 w-full"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          ></textarea> */}
          {/* <div className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text">Make Public?</span>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
              />
            </label>
          </div> */}
          <div className="modal-action">
            <button
              type="button"
              className="btn"
              onClick={() => {
                setShowCreateTodoModal(false)
                setCurrentListIdForTodoCreation(null) // Clear on cancel
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={createTodoMutation.isPending}
            >
              {createTodoMutation.isPending ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateTodoModal
