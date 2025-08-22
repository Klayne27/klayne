import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query"

import {
  completeTodoApi,
  createTodoApi,
  deleteTodoApi,
  getCompletedTodosApi,
  getFollowingTodosApi,
  getPublicCompletedTodosApi,
  getPublicTodosApi,
  getUserTodosApi,
  updateTodoApi,
} from "../../api/todoApi"
import { showAppToast } from "../../utils/showAppToast"
import { useAuthUser } from "../authHooks/useAuthUser"
import useXpStore from "../../store/useXpStore"


export const useGetCompletedTodos = () => {
  const {
    data: completedTodos,
    isLoading: completedLoading,
    isError: completedError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["completedTodos"],
    queryFn: getCompletedTodosApi,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.hasNextPage) {
        return allPages.length
      }
      return undefined
    },
  })

  return {
    completedTodos,
    completedLoading,
    completedError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  }
}

export const useGetPublicCompletedTodos = () => {
  const {
    data: publicCompletedTodos,
    isLoading: isLoadingPublicCompletedTodos,
    isError: publicCompletedTodosError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["publicCompletedTodos"],
    queryFn: getPublicCompletedTodosApi,
    getNextPageParam: (lastPage, allPages) => {
      const hasNextPage = lastPage.hasNextPage
      if (hasNextPage) {
        return allPages.length
      }
      return undefined
    },
  })
  return {
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    publicCompletedTodos,
    isLoadingPublicCompletedTodos,
    publicCompletedTodosError,
  }
}

export const useCompleteTodo = () => {
  const queryClient = useQueryClient()
  const { authUser: currentUser, setAuthUser } = useAuthUser()
  const { setShowXpGain, setXpGainedAmount } = useXpStore()

  const { mutate: completeTodo, isPending: isCompletingTodo } = useMutation({
    mutationFn: completeTodoApi,
    // onMutate: async (todoId) => {
    //   await queryClient.cancelQueries({ queryKey: ["todoLists"] })
    //   await queryClient.cancelQueries({ queryKey: ["authUser"] })
    //   const previousTodoLists = queryClient.getQueryData(["todoLists"])
    //   const previousUser = currentUser
    //   return { previousTodoLists, previousUser }
    // },
    onSuccess: (data) => {
      showAppToast("Todo completed! ✨", "success")

      if (data?.xpResult) {
        const { xpGained, finalXP, finalLevel, levelsGained } = data.xpResult // Set the XP gain amount for the header animation.
        setXpGainedAmount(xpGained)
        setShowXpGain(true)
        setTimeout(() => setShowXpGain(false), 2000) // Update the authUser state with the final, correct values from the server.

        const updatedUser = {
          ...currentUser,
          pomodoroXP: finalXP,
          pomodoroLevel: finalLevel,
        }
        setAuthUser(updatedUser)

        if (levelsGained?.length > 0) {
          showAppToast(`You leveled up to Level ${finalLevel}! 🎉`, "success")
        }
      } // ⭐ STEP 2: Use a timeout to invalidate the query and visually remove the todo.
      // The duration should match the CSS animation duration.

      // setTimeout(() => {
      //   queryClient.invalidateQueries({ queryKey: ["todoLists"] })
      //   queryClient.invalidateQueries({ queryKey: ["completedTodos"] })
      //   queryClient.invalidateQueries({ queryKey: ["todoActivityLog"] }) // Note: Invalidate the authUser query as a final check, but the
      //   // optimistic update in onSuccess already updated the local state.
      //   queryClient.invalidateQueries({ queryKey: ["authUser"] })
      // }, 500)
    },
    onSettled: () => {
      // Invalidate queries as a fallback to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["todoLists"] })
      // queryClient.invalidateQueries({ queryKey: ["completedTodos"] })
      // queryClient.invalidateQueries({ queryKey: ["todoActivityLog"] })
      // queryClient.invalidateQueries({ queryKey: ["authUser"] })
    },
    onError: (err, variables, context) => {
      // Rollback the UI if the mutation fails.
      // queryClient.setQueryData(["todoLists"], context.previousTodoLists)
      // if (context.previousUser) {
      //   setAuthUser(context.previousUser)
      // }
      showAppToast(err.message || "Failed to complete todo", "error")
    }, // The onSettled callback is no longer needed since onSuccess handles invalidation.
  })

  return { completeTodo, isCompletingTodo }
}

export const useCreateTodo = () => {
  const queryClient = useQueryClient()

  const { mutate: createTodo, isPending: isCreatingTodo } = useMutation({
    mutationFn: createTodoApi,
    onMutate: async (newTodo) => {
      // Cancel any outgoing queries to prevent them from overwriting our optimistic update
      // await queryClient.cancelQueries({ queryKey: ["todos"] })
      await queryClient.cancelQueries({ queryKey: ["todoLists"] })

      // Safely get the previous data and provide a default empty object/array
      // const previousTodos = queryClient.getQueryData(["todos"])
      const previousTodoLists = queryClient.getQueryData(["todoLists"])

      const tempId = "temp-" + Date.now()
      const optimisticTodo = { ...newTodo, _id: tempId, completed: false }

      // Update the 'todos' query data
      // queryClient.setQueryData(["todos"], (oldData) => {
      //   const pages = oldData?.pages || [] // Safely access pages or default to an empty array
      //   return {
      //     ...oldData,
      //     pages: pages.map((page, index) => {
      //       if (index === 0) {
      //         return {
      //           ...page,
      //           data: [optimisticTodo, ...page.data],
      //         }
      //       }
      //       return page
      //     }),
      //   }
      // })

      // Update the 'todoLists' query data
      queryClient.setQueryData(["todoLists"], (oldData) => {
        const pages = oldData?.pages || [] // Safely access pages or default to an empty array
        return {
          ...oldData,
          pages: pages.map((page) => ({
            ...page,
            data: page.data.map((todoList) => {
              if (todoList._id === newTodo.todoListId) {
                return {
                  ...todoList,
                  todos: [...todoList.todos, optimisticTodo],
                }
              }
              return todoList
            }),
          })),
        }
      })

      // Return a context object with the snapshot
      return {  previousTodoLists }
    },
    onError: (error, newTodo, context) => {
      // Rollback the cache to the previous data
      // if (context?.previousTodos) {
      //   queryClient.setQueryData(["todos"], context.previousTodos)
      // }
      if (context?.previousTodoLists) {
        queryClient.setQueryData(["todoLists"], context.previousTodoLists)
      }
      showAppToast(error.message || "Failed to create todo. Please try again.", "error")
    },
    onSettled: () => {
      // Invalidate all relevant queries to refetch fresh data
      // queryClient.invalidateQueries({ queryKey: ["todos"] })
      queryClient.invalidateQueries({ queryKey: ["todoLists"] })
      queryClient.invalidateQueries({ queryKey: ["publicTodoLists"] })
      queryClient.invalidateQueries({ queryKey: ["followingTodos"] })
      queryClient.invalidateQueries({ queryKey: ["publicTodos"] })
    },
    // onSuccess: () => {
    //   showAppToast("Todo created successfully!", "success")
    // },
  })

  return { createTodo, isCreatingTodo }
}

export const useUpdateTodo = () => {
  const queryClient = useQueryClient()
  const { mutate: updateTodo, isPending: isUpdatingTodo } = useMutation({
    mutationFn: (data) => updateTodoApi(data.id, data.todoData),
    onMutate: async (updatedTodo) => {
      // Cancel any outgoing queries to prevent them from overwriting our optimistic update.
      await queryClient.cancelQueries({ queryKey: ["todos"] })
      await queryClient.cancelQueries({ queryKey: ["todoLists"] })

      const previousTodos = queryClient.getQueryData(["todos"])
      const previousTodoLists = queryClient.getQueryData(["todoLists"])
      // Update the main 'todos' query

      queryClient.setQueryData(["todos"], (oldData) => {
        const pages = oldData?.pages || []
        return {
          ...oldData,
          pages: pages.map((page) => ({
            ...page,
            data: page.data.map((todo) =>
              todo._id === updatedTodo.id ? { ...todo, ...updatedTodo.todoData } : todo,
            ),
          })),
        }
      }) // Update the 'todoLists' query

      queryClient.setQueryData(["todoLists"], (oldData) => {
        const pages = oldData?.pages || []
        return {
          ...oldData,
          pages: pages.map((page) => ({
            ...page,
            data: page.data.map((todoList) => ({
              ...todoList,
              todos: todoList.todos.map((todo) =>
                todo._id === updatedTodo.id ? { ...todo, ...updatedTodo.todoData } : todo,
              ),
            })),
          })),
        }
      }) // Update the 'completedTodos' query if it exists

      return { previousTodos, previousTodoLists }
    },
    onError: (error, updatedTodo, context) => {
      // If the mutation fails, roll back the cache to the previous state.
      if (context?.previousTodos) {
        queryClient.setQueryData(["todos"], context.previousTodos)
      }
      if (context?.previousTodoLists) {
        queryClient.setQueryData(["todoLists"], context.previousTodoLists)
      }

      showAppToast(error.message || "Failed to update todo. Please try again.", "error")
    },
    onSettled: () => {
      // After the mutation is complete, invalidate all relevant queries
      // to ensure the cache is synchronized with the server.
      queryClient.invalidateQueries({ queryKey: ["todos"] })
      queryClient.invalidateQueries({ queryKey: ["todoLists"] })
    },
    // onSuccess: () => {
    //   showAppToast("Todo updated successfully!", "success")
    // },
  })

  return { updateTodo, isUpdatingTodo }
}

export const useDeleteTodo = () => {
  const queryClient = useQueryClient()
  const { mutate: deleteTodo, isPending: isDeletingTodo } = useMutation({
    mutationFn: deleteTodoApi,
    onMutate: async (todoIdToDelete) => {
      // Cancel any outgoing queries to prevent them from overwriting our optimistic update.
      await queryClient.cancelQueries({ queryKey: ["todos"] })
      await queryClient.cancelQueries({ queryKey: ["todoLists"] })

      // Snapshot the current cache.
      const previousTodos = queryClient.getQueryData(["todos"])
      const previousTodoLists = queryClient.getQueryData(["todoLists"])

      queryClient.setQueryData(["todos"], (oldData) => {
        const pages = oldData?.pages || []
        return {
          ...oldData,
          pages: pages.map((page) => ({
            ...page,
            data: page.data.filter((todo) => todo._id !== todoIdToDelete),
          })),
        }
      })

      // Update the 'todoLists' query
      queryClient.setQueryData(["todoLists"], (oldData) => {
        const pages = oldData?.pages || []
        return {
          ...oldData,
          pages: pages.map((page) => ({
            ...page,
            data: page.data.map((todoList) => ({
              ...todoList,
              todos: todoList.todos.filter((todo) => todo._id !== todoIdToDelete),
            })),
          })),
        }
      })

      // Update the 'completedTodos' query if it exists

      // Return a context object with the snapshots for potential rollback.
      return { previousTodos, previousTodoLists }
    },
    onError: (error, todoIdToDelete, context) => {
      // If the mutation fails, roll back the cache to the previous state.
      if (context?.previousTodos) {
        queryClient.setQueryData(["todos"], context.previousTodos)
      }
      if (context?.previousTodoLists) {
        queryClient.setQueryData(["todoLists"], context.previousTodoLists)
      }
      showAppToast(error.message || "Failed to delete todo. Please try again.", "error")
    },
    onSettled: () => {
      // After the mutation is complete, invalidate all relevant queries
      // to ensure the cache is synchronized with the server.
      queryClient.invalidateQueries({ queryKey: ["todos"] })
      queryClient.invalidateQueries({ queryKey: ["todoLists"] })
      showAppToast("Todo deleted successfully!", "success")
    },
  })

  return { deleteTodo, isDeletingTodo }
}

export const useGetFollowingTodos = () => {
  return useQuery({
    queryKey: ["followingTodos"],
    queryFn: getFollowingTodosApi,
    retry: false,
  })
}
