// src/components/todos/TodoSectionList.jsx
import React, { useState, useRef, useEffect } from "react"
import { useTodoStore } from "../../store/useTodoStore"
import TodoSectionItem from "./TodoSectionItem" // Import the new component
import SlideUpMenu from "./SlideUpMenu"
import TodoAddForm from "./TodoAddForm"
import LoadingSpinner from "../ui/LoadingSpinner"
import EditTodoListModal from "./EditTodoListModal"

const TodoSectionList = ({ todoLists, isLoading, isError, hasNextPage, fetchNextPage }) => {
  const {
    setShowCreateTodoModal,
    showEditTodoListModal,
    setShowEditTodoListModal,
    todoListToEdit,
  } = useTodoStore()
  const [openListDropdownId, setOpenListDropdownId] = useState(null)
  const [openTodoDropdownId, setOpenTodoDropdownId] = useState(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const observerRef = useRef()
  const lastItemRef = useRef()

  useEffect(() => {
    if (isLoading) return
    if (observerRef.current) observerRef.current.disconnect()

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasNextPage) {
        fetchNextPage()
      }
    })

    if (lastItemRef.current) {
      observer.observe(lastItemRef.current)
    }

    observerRef.current = observer
  }, [isLoading, hasNextPage, fetchNextPage])

  const allLists = todoLists?.pages?.flatMap((page) => page.data) || []

  if (isLoading && allLists?.length === 0)
    return (
      <div className="flex h-screen items-center justify-center text-primary">
        <LoadingSpinner />
      </div>
    )

  if (isError) return <div>Error fetching lists.</div>

  if (allLists?.length === 0) {
    return <div className="text-center text-gray-500">List is empty.</div>
  }

  const handleCloseMenu = () => {
    setIsMenuOpen(false)
  }

  return (
    <>
      <ul className="flex flex-col gap-5">
        {allLists?.map((list, index) => (
          <TodoSectionItem
            key={list._id}
            list={list}
            isLastItem={index === allLists.length - 1}
            lastItemRef={lastItemRef}
            openListDropdownId={openListDropdownId}
            setOpenListDropdownId={setOpenListDropdownId}
            openTodoDropdownId={openTodoDropdownId}
            setOpenTodoDropdownId={setOpenTodoDropdownId}
            setIsMenuOpen={setIsMenuOpen}
            setShowCreateTodoModal={setShowCreateTodoModal}
          />
        ))}
        {isMenuOpen && (
          <SlideUpMenu isOpen={isMenuOpen} onClose={handleCloseMenu}>
            <div className="z-50 flex h-[35vh] w-full flex-col gap-5 px-4">
              <TodoAddForm isLoading={isLoading} setIsMenuOpen={setIsMenuOpen} />
            </div>
          </SlideUpMenu>
        )}
        {isLoading && allLists?.length > 0 && <div>Loading more...</div>}
      </ul>
      {showEditTodoListModal && <EditTodoListModal />}
    </>
  )
}

export default TodoSectionList
