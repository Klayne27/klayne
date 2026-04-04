import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createTodoListApi, deleteTodoListApi, likeUnlikeTodoListApi, updateTodoListApi } from "../../../api/todoListApi"
import { showAppToast } from "../../../utils/showAppToast"
import { todoKeys } from "../todoHooks/todoKeys"

export const useCreateTodoList = () => {
  const queryClient = useQueryClient()

  const { mutate: createTodoList, isPending: creatingTodoList } = useMutation({
    mutationFn: createTodoListApi,
    onMutate: async (newTodoList) => {
      await queryClient.cancelQueries({ queryKey: todoKeys.list("user") })

      const oldTodoLists = queryClient.getQueryData(todoKeys.list("user"))

      const tempId = "temp-" + Date.now()
      const optimisticTodo = { ...newTodoList, _id: tempId, todos: [] }

      queryClient.setQueryData(todoKeys.list("user"), (oldData) => {
        const pages = oldData?.pages || []

        const newPages = pages.map((page, index) => {
          if (index === 0) {
            return {
              ...page,
              data: [optimisticTodo, ...page.data],
            }
          }
          return page
        })

        return { ...oldData, pages: newPages }
      })

      return { oldTodoLists }
    },
    onError: (err, newTodoList, context) => {
      queryClient.setQueryData(todoKeys.list("user"), context.oldTodoLists)
      showAppToast(err.message, "error")
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: todoKeys.list("user") })
    },
  })

  return { createTodoList, creatingTodoList }
}

export const useDeleteTodoList = () => {
  const queryClient = useQueryClient()

  const { mutate: deleteTodoList, isPending: deletingTodoList } = useMutation({
    mutationFn: deleteTodoListApi,
    onMutate: async (listId) => {
      await queryClient.cancelQueries({ queryKey: todoKeys.list("user") })
      await queryClient.cancelQueries({ queryKey: todoKeys.list("public") })

      const oldTodoLists = queryClient.getQueryData(todoKeys.list("user"))
      const oldPublicTodoLists = queryClient.getQueryData(todoKeys.list("public"))

      const updateCache = (oldData) => {
        const pages = oldData?.pages || []

        const newPages = pages.map((page) => ({
          ...page,
          data: page.data.filter((todoList) => todoList._id !== listId),
        }))

        return { ...oldData, pages: newPages }
      }

      queryClient.setQueryData(todoKeys.list("user"), updateCache)
      queryClient.setQueryData(todoKeys.list("public"), updateCache)

      return { oldTodoLists, oldPublicTodoLists }
    },
    onError: (err, listId, context) => {
      queryClient.setQueryData(todoKeys.list("user"), context.oldTodoLists)
      queryClient.setQueryData(todoKeys.list("public"), context.oldPublicTodoLists)
      showAppToast(err.message, "error")
    },
  })

  return { deleteTodoList, deletingTodoList }
}

export const useUpdateTodoList = () => {
  const queryClient = useQueryClient()

  const { mutate: updateTodoList, isPending: isUpdatingTodoList } = useMutation({
    mutationFn: (data) => updateTodoListApi(data.id, data.listData),
    onMutate: async ({ id, listData }) => {
      await queryClient.cancelQueries({ queryKey: todoKeys.list("user") })
      await queryClient.cancelQueries({ queryKey: todoKeys.list("public") })

      const oldTodoLists = queryClient.getQueryData(todoKeys.list("user"))
      const oldPublicTodoLists = queryClient.getQueryData(todoKeys.list("public"))

      const updateCache = (oldData) => {
        const pages = oldData?.pages || []

        const newPages = pages.map((page) => ({
          ...page,
          data: page.data.map((todoList) =>
            todoList._id === id ? { ...todoList, ...listData } : todoList,
          ),
        }))

        return { ...oldData, pages: newPages }
      }

      queryClient.setQueryData(todoKeys.list("user"), updateCache)
      queryClient.setQueryData(todoKeys.list("public"), updateCache)

      return { oldTodoLists, oldPublicTodoLists }
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(todoKeys.list("user"), context.oldTodoLists)
      queryClient.setQueryData(todoKeys.list("public"), context.oldPublicTodoLists)
      showAppToast(err.message, "error")
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: todoKeys.list("user") })
      queryClient.invalidateQueries({ queryKey: todoKeys.list("public") })
    },
  })

  return { updateTodoList, isUpdatingTodoList }
}

export const useLikeUnlikeTodoList = () => {
  const queryClient = useQueryClient()

  const { mutate: likeUnlikeTodoList, isPending: isLiking } = useMutation({
    mutationFn: ({ listId }) => likeUnlikeTodoListApi(listId),

    onMutate: async ({ listId, authUserId }) => {
      await queryClient.cancelQueries({ queryKey: todoKeys.list("public") })
      await queryClient.cancelQueries({ queryKey: todoKeys.list("following") })

      const oldPublicTodoLists = queryClient.getQueryData(todoKeys.list("public"))
      const oldFollowingTodoLists = queryClient.getQueryData(todoKeys.list("following"))

      queryClient.setQueryData(todoKeys.list("public"), (oldData) => {
        return {
          ...oldData,
          pages: oldData?.pages?.map((page) => ({
            ...page,
            data: page.data?.map((todoList) => {
              if (todoList._id === listId) {
                const isLiked = todoList.likes?.includes(authUserId) ?? false
                return {
                  ...todoList,
                  likes: isLiked
                    ? todoList.likes.filter((id) => id !== authUserId)
                    : [...(todoList.likes || []), authUserId],
                }
              }
              return todoList
            }),
          })),
        }
      })

      queryClient.setQueryData(todoKeys.list("following"), (oldData) => {
        return {
          ...oldData,
          pages: oldData?.pages?.map((page) => ({
            ...page,
            data: page.data?.map((todoList) => {
              if (todoList._id === listId) {
                const isLiked = todoList.likes?.includes(authUserId) ?? false
                return {
                  ...todoList,
                  likes: isLiked
                    ? todoList.likes.filter((id) => id !== authUserId)
                    : [...(todoList.likes || []), authUserId],
                }
              }
              return todoList
            }),
          })),
        }
      })

      return { oldPublicTodoLists, oldFollowingTodoLists }
    },

    onError: (err, variables, context) => {
      queryClient.setQueryData(todoKeys.list("public"), context.oldPublicTodoLists)
      queryClient.setQueryData(todoKeys.list("following"), context.oldFollowingTodoLists)
    },
  })

  return { likeUnlikeTodoList, isLiking }
}


