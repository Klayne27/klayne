import React from "react"
import { useGetTodosInList, useGetTodoListById } from "../../hooks/todoListHooks/useTodoListQueries"
import { useTodoStore } from "../../store/useTodoStore"
import { useAuthUser } from "../../hooks/authHooks/useAuthUser" // Assuming you have this hook
import TodoList from "./TodoList"
import { FaPlus } from "react-icons/fa"

const TodosInList = ({ listId }) => {
  const { authUser } = useAuthUser()
  const { data: todos, isLoading: todosLoading, isError: todosError } = useGetTodosInList(listId)
  const { data: todoList, isLoading: listLoading, isError: listError } = useGetTodoListById(listId)
  const { setShowCreateTodoModal, setSelectedTodo } = useTodoStore()

  const handleCreateTodo = () => {
    setSelectedTodo({ todoListId: listId })
    setShowCreateTodoModal(true)
  }

  if (listLoading || todosLoading) return <div>Loading list details...</div>
  if (listError || todosError) return <div>Error loading list or todos.</div>

  // Check if the current user is the owner of the list
  const isOwner = authUser && todoList.owner.toString() === authUser._id.toString()

  return (
    <div>

      <TodoList todos={todos} isLoading={false} isError={false} isOwner={isOwner} />
    </div>
  )
}

export default TodosInList
