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

const TODO_LISTS_QUERY_KEY = ["todoLists"]

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
      const previousTodoLists = queryClient.getQueryData(TODO_LISTS_QUERY_KEY)

      queryClient.setQueryData(TODO_LISTS_QUERY_KEY, (oldData) => {
        if (!oldData || !oldData.pages) {
          return oldData
        }

        const newPages = oldData.pages.map((page, index) => {
          if (index === 0) {
            return {
              ...page,
              data: [{ ...newTodoList, _id: `temp-${Date.now()}`, todos: [] }, ...page.data],
            }
          }
          return page
        })

        return { ...oldData, pages: newPages }
      })

      return { previousTodoLists }
    },
    onError: (err, newTodoList, context) => {
      queryClient.setQueryData(TODO_LISTS_QUERY_KEY, context.previousTodoLists)
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
      const previousTodoLists = queryClient.getQueryData(TODO_LISTS_QUERY_KEY)

      queryClient.setQueryData(TODO_LISTS_QUERY_KEY, (oldData) => {
        if (!oldData) return oldData

        const newPages = oldData.pages.map((page) => ({
          ...page,
          data: page.data.map((list) => (list._id === id ? { ...list, ...listData } : list)),
        }))

        return { ...oldData, pages: newPages }
      })

      return { previousTodoLists }
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(TODO_LISTS_QUERY_KEY, context.previousTodoLists)
      showAppToast(err.message, "error")
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TODO_LISTS_QUERY_KEY })
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
      const previousTodoLists = queryClient.getQueryData(TODO_LISTS_QUERY_KEY)

      queryClient.setQueryData(TODO_LISTS_QUERY_KEY, (oldData) => {
        if (!oldData) return oldData

        const newPages = oldData.pages.map((page) => ({
          ...page,
          data: page.data.filter((list) => list._id !== listId),
        }))

        return { ...oldData, pages: newPages }
      })

      return { previousTodoLists }
    },
    onError: (err, listId, context) => {
      queryClient.setQueryData(TODO_LISTS_QUERY_KEY, context.previousTodoLists)
      showAppToast(err.message, "error")
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TODO_LISTS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ["publicTodoLists"] })
    },
  })

  return { deleteTodoList, deletingTodoList }
}

export const useLikeUnlikeTodoList = () => {
  const queryClient = useQueryClient()

  const { mutate: likeUnlikeTodoList, isPending: isLiking } = useMutation({
    mutationFn: ({ listId }) => likeUnlikeTodoListApi(listId),

    onMutate: async ({ listId, authUserId }) => {
      await queryClient.cancelQueries({ queryKey: ["publicTodoLists"] })

      const previousTodoLists = queryClient.getQueryData(["publicTodoLists"])

      queryClient.setQueryData(["publicTodoLists"], (old) => {
        if (!old || !old.pages) {
          return old
        }

        const updatedPages = old.pages.map((page) => {
          if (!page || !page.data) {
            return page
          }

          const updatedLists = page.data.map((list) => {
            if (list._id === listId) {
              const isLiked = list.likes.includes(authUserId)
              return {
                ...list,
                likes: isLiked
                  ? list.likes.filter((id) => id !== authUserId)
                  : [...list.likes, authUserId],
              }
            }
            return list
          })

          return {
            ...page,
            data: updatedLists,
          }
        })

        return {
          ...old,
          pages: updatedPages,
        }
      })

      return { previousTodoLists }
    },

    onError: (err, variables, context) => {
      if (context.previousTodoLists) {
        queryClient.setQueryData(["publicTodoLists"], context.previousTodoLists)
      }
    },
  })

  return { likeUnlikeTodoList, isLiking }
}
