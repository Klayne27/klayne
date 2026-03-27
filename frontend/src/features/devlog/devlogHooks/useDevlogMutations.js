import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createDevlogApi, updateDevlogApi, deleteDevlogApi } from "../../../api/devlogApi"
import { devlogKeys } from "./devlogKeys"
import toast from "react-hot-toast"

export const useCreateDevlog = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createDevlogApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: devlogKeys.list() })
      toast.success("Devlog posted!")
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create devlog")
    },
  })
}

export const useUpdateDevlog = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateDevlogApi,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: devlogKeys.list() })
      queryClient.invalidateQueries({ queryKey: devlogKeys.detail(data._id) })
      toast.success("Devlog updated!")
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update devlog")
    },
  })
}

export const useDeleteDevlog = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteDevlogApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: devlogKeys.list() })
      toast.success("Devlog deleted")
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete devlog")
    },
  })
}
