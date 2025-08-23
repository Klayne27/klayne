import { useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query"

import {
  createTodoListApi,
  deleteTodoListApi,
  getFollowingTodoListsApi,
  getPublicTodoListsApi,
  getUserTodoListsApi,
  likeUnlikeTodoListApi,
  updateTodoListApi,
} from "../../api/todoListApi"
import { showAppToast } from "../../utils/showAppToast"
import { FOLLOWING_TODO_LISTS_QUERY_KEY, PUBLIC_TODO_LISTS_QUERY_KEY, TODO_LISTS_QUERY_KEY } from "../../constants/queryKeys"


export const useGetUserTodoLists = () => {
  const {
    data: myTodoLists,
    isLoading: myListsLoading,
    isError: myListsError,
    hasNextPage: myListsHasNextPage,
    fetchNextPage: myListsFetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["todoLists"],
    queryFn: getUserTodoListsApi,
    getNextPageParam: (lastPage) => {
      if (lastPage.hasNextPage) {
        return lastPage.currentPage + 1
      }
      return undefined
    },
    initialPageParam: 0,
  })

  return { myTodoLists, myListsLoading, myListsError, myListsHasNextPage, myListsFetchNextPage }
}

export const useGetFollowingTodoLists = () => {
  const {
    data: followingLists,
    isLoading: followingLoading,
    isError: followingError,
    hasNextPage: followingHasNextPage,
    fetchNextPage: followingFetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["followingTodoLists"],
    queryFn: getFollowingTodoListsApi,
    getNextPageParam: (lastPage) => {
      if (lastPage.hasNextPage) {
        return lastPage.currentPage + 1
      }
      return undefined
    },
    initialPageParam: 0,
  })

  return {
    followingLists,
    followingLoading,
    followingError,
    followingHasNextPage,
    followingFetchNextPage,
  }
}

export const useGetPublicTodoLists = () => {
  const {
    data: publicLists,
    isLoading: publicLoading,
    isError: publicError,
    hasNextPage: publicHasNextPage,
    fetchNextPage: publicFetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["publicTodoLists"],
    queryFn: getPublicTodoListsApi,
    getNextPageParam: (lastPage) => {
      if (lastPage.hasNextPage) {
        return lastPage.currentPage + 1
      }
      return undefined
    },
    initialPageParam: 0,
  })

  return { publicLists, publicLoading, publicError, publicHasNextPage, publicFetchNextPage }
}

export const useCreateTodoList = () => {
  const queryClient = useQueryClient()

  const { mutate: createTodoList, isPending: creatingTodoList } = useMutation({
    mutationFn: createTodoListApi,
    onMutate: async (newTodoList) => {
      await queryClient.cancelQueries({ queryKey: TODO_LISTS_QUERY_KEY })

      const oldTodoLists = queryClient.getQueryData(TODO_LISTS_QUERY_KEY)

      const tempId = "temp-" + Date.now()
      const optimisticTodo = { ...newTodoList, _id: tempId, todos: [] }

      queryClient.setQueryData(TODO_LISTS_QUERY_KEY, (oldData) => {
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
      queryClient.setQueryData(TODO_LISTS_QUERY_KEY, context.oldTodoLists)
      showAppToast(err.message, "error")
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TODO_LISTS_QUERY_KEY })
    },
  })

  return { createTodoList, creatingTodoList }
}

export const useUpdateTodoList = () => {
  const queryClient = useQueryClient()

  const { mutate: updateTodoList, isPending: isUpdatingTodoList } = useMutation({
    mutationFn: (data) => updateTodoListApi(data.id, data.listData),
    onMutate: async ({ id, listData }) => {
      await queryClient.cancelQueries({ queryKey: TODO_LISTS_QUERY_KEY })
      await queryClient.cancelQueries({ queryKey: PUBLIC_TODO_LISTS_QUERY_KEY })

      const oldTodoLists = queryClient.getQueryData(TODO_LISTS_QUERY_KEY)
      const oldPublicTodoLists = queryClient.getQueryData(PUBLIC_TODO_LISTS_QUERY_KEY)

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

      queryClient.setQueryData(TODO_LISTS_QUERY_KEY, updateCache)
      queryClient.setQueryData(PUBLIC_TODO_LISTS_QUERY_KEY, updateCache)

      return { oldTodoLists, oldPublicTodoLists }
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(TODO_LISTS_QUERY_KEY, context.oldTodoLists)
      queryClient.setQueryData(PUBLIC_TODO_LISTS_QUERY_KEY, context.oldPublicTodoLists)
      showAppToast(err.message, "error")
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TODO_LISTS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: PUBLIC_TODO_LISTS_QUERY_KEY })
    },
  })

  return { updateTodoList, isUpdatingTodoList }
}

export const useDeleteTodoList = () => {
  const queryClient = useQueryClient()

  const { mutate: deleteTodoList, isPending: deletingTodoList } = useMutation({
    mutationFn: deleteTodoListApi,
    onMutate: async (listId) => {
      await queryClient.cancelQueries({ queryKey: TODO_LISTS_QUERY_KEY })
      await queryClient.cancelQueries({ queryKey: PUBLIC_TODO_LISTS_QUERY_KEY })

      const oldTodoLists = queryClient.getQueryData(TODO_LISTS_QUERY_KEY)
      const oldPublicTodoLists = queryClient.getQueryData(PUBLIC_TODO_LISTS_QUERY_KEY)

      const updateCache = (oldData) => {
        const pages = oldData?.pages || []

        const newPages = pages.map((page) => ({
          ...page,
          data: page.data.filter((todoList) => todoList._id !== listId),
        }))

        return { ...oldData, pages: newPages }
      }

      queryClient.setQueryData(TODO_LISTS_QUERY_KEY, updateCache)
      queryClient.setQueryData(PUBLIC_TODO_LISTS_QUERY_KEY, updateCache)

      return { oldTodoLists, oldPublicTodoLists }
    },
    onError: (err, listId, context) => {
      queryClient.setQueryData(TODO_LISTS_QUERY_KEY, context.oldTodoLists)
      queryClient.setQueryData(PUBLIC_TODO_LISTS_QUERY_KEY, context.oldPublicTodoLists)
      showAppToast(err.message, "error")
    },
  })

  return { deleteTodoList, deletingTodoList }
}

export const useLikeUnlikeTodoList = () => {
  const queryClient = useQueryClient()

  const { mutate: likeUnlikeTodoList, isPending: isLiking } = useMutation({
    mutationFn: ({ listId }) => likeUnlikeTodoListApi(listId),

    onMutate: async ({ listId, authUserId }) => {
      await queryClient.cancelQueries({ queryKey: PUBLIC_TODO_LISTS_QUERY_KEY })
      await queryClient.cancelQueries({ queryKey: FOLLOWING_TODO_LISTS_QUERY_KEY })

      const oldPublicTodoLists = queryClient.getQueryData(PUBLIC_TODO_LISTS_QUERY_KEY)
      const oldFollowingTodoLists = queryClient.getQueryData(FOLLOWING_TODO_LISTS_QUERY_KEY)

      queryClient.setQueryData(PUBLIC_TODO_LISTS_QUERY_KEY, (oldData) => {
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

      queryClient.setQueryData(FOLLOWING_TODO_LISTS_QUERY_KEY, (oldData) => {
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
      queryClient.setQueryData(PUBLIC_TODO_LISTS_QUERY_KEY, context.oldPublicTodoLists)
      queryClient.setQueryData(FOLLOWING_TODO_LISTS_QUERY_KEY, context.oldFollowingTodoLists)
    },
  })

  return { likeUnlikeTodoList, isLiking }
}
