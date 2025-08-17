import { create } from "zustand"

export const useTodoStore = create((set) => ({
  activeTab: "myLists",
  selectedTodoListIds: [],
  showCreateTodoListModal: false,
  showCreateTodoModal: false,
  showEditTodoModal: false,
  selectedTodo: null,
  currentListIdForTodoCreation: null, // New state for creating todos

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
  setShowCreateTodoModal: (show) => set({ showCreateTodoModal: show }),
  setShowEditTodoModal: (show) => set({ showEditTodoModal: show }),
  setSelectedTodo: (todo) => set({ selectedTodo: todo }),
  // New action to set the list ID for todo creation
  setCurrentListIdForTodoCreation: (id) => set({ currentListIdForTodoCreation: id }),
}))