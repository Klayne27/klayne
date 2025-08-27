import { useState, useEffect } from "react"
import { useTodoStore } from "../../store/useTodoStore"
import TodoSectionItem from "./TodoSectionItem"
import SlideUpMenu from "../../components/common/SlideUpMenu"
import TodoAddForm from "./TodoAddForm"
import LoadingSpinner from "../../components/common/LoadingSpinner"
import EditTodoListModal from "./EditTodoListModal"
import { useInView } from "react-intersection-observer"

const TodoSectionList = ({ todoLists, isLoading, isError, hasNextPage, fetchNextPage }) => {
  const {
    setShowCreateTodoModal,
    showEditTodoListModal,

  } = useTodoStore()
  const { ref, inView } = useInView()

  const [openListDropdownId, setOpenListDropdownId] = useState(null)
  const [openTodoDropdownId, setOpenTodoDropdownId] = useState(null)
  const {isAddTodoMenuOpen, setIsAddTodoMenuOpen} = useTodoStore()

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, fetchNextPage])

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
    setIsAddTodoMenuOpen(false)
  }

  return (
    <>
      <ul className="flex flex-col gap-5">
        {allLists?.map((list, index) => {
          const isLastItem = index === allLists.length - 1

          return (
            <TodoSectionItem
              key={list?._id}
              list={list}
              ref={isLastItem ? ref : null}
              openListDropdownId={openListDropdownId}
              setOpenListDropdownId={setOpenListDropdownId}
              openTodoDropdownId={openTodoDropdownId}
              setOpenTodoDropdownId={setOpenTodoDropdownId}
              setIsMenuOpen={setIsAddTodoMenuOpen}
              setShowCreateTodoModal={setShowCreateTodoModal}
            />
          )
        })}
        {isAddTodoMenuOpen && (
          <li key="slide-up-menu-item">
            <SlideUpMenu isOpen={isAddTodoMenuOpen} onClose={handleCloseMenu}>
              <div className="z-40 flex h-auto w-full flex-col gap-5 overflow-y-auto px-4">
                <TodoAddForm
                  isLoading={isLoading}
                  setIsMenuOpen={setIsAddTodoMenuOpen}
                  isMenuOpen={isAddTodoMenuOpen}
                />
              </div>
            </SlideUpMenu>
          </li>
        )}

        {hasNextPage && (
          <li key="loading-spinner-item">
            <div className="flex justify-center p-4">
              <LoadingSpinner />
            </div>
          </li>
        )}
      </ul>
      {showEditTodoListModal && <EditTodoListModal />}
    </>
  )
}

export default TodoSectionList
