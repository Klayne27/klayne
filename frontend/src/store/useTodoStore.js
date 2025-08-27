import { create } from "zustand"

export const useTodoStore = create((set) => ({
  activeTab: "myLists",
  selectedTodoListIds: [],
  showCreateTodoListModal: false,
  showEditTodoListModal: false,
  showCreateTodoModal: false,
  showEditTodoModal: false,
  selectedTodo: null,
  todoListToEdit: null,
  currentListIdForTodoCreation: null,
  isAddTodoMenuOpen: false,
  isEditTodoMenuOpen: null,

  setActiveTab: (tab) => set({ activeTab: tab, selectedTodoListIds: [] }),
  toggleTodoList: (id) =>
    set((state) => {
      const isOpened = state.selectedTodoListIds.includes(id)
      return {
        selectedTodoListIds: isOpened
          ? state.selectedTodoListIds.filter((listId) => listId !== id)
          : [...state.selectedTodoListIds, id],
      }
    }),
  setShowCreateTodoListModal: (show) => set({ showCreateTodoListModal: show }),
  setShowEditTodoListModal: (show) => set({ showEditTodoListModal: show }),
  setShowCreateTodoModal: (show) => set({ showCreateTodoModal: show }),
  setShowEditTodoModal: (show) => set({ showEditTodoModal: show }),
  setSelectedTodo: (todo) => set({ selectedTodo: todo }),
  setTodoListToEdit: (list) => set({ todoListToEdit: list }),
  setCurrentListIdForTodoCreation: (id) => set({ currentListIdForTodoCreation: id }),
  setIsAddTodoMenuOpen: (isOpen) => set({ isAddTodoMenuOpen: isOpen }),
  setIsEditTodoMenuOpen: (id) => set({ isEditTodoMenuOpen: id }), // <-- Accepts the ID
}))