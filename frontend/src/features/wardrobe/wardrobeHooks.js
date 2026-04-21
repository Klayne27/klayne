import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { equipItemApi, getInventoryApi } from "../../api/wardrobeApi"
import { showAppToast } from "../../utils/showAppToast"
import { userKeys } from "../users/usersHooks/userKeys"
import { postKeys } from "../posts/postsHooks/postKeys"

export const wardrobeKeys = {
  all: ["wardrobe"],
  inventory: () => [...wardrobeKeys.all, "inventory"],
}

export const useInventory = () => {
  const { data, isLoading } = useQuery({
    queryKey: wardrobeKeys.inventory(),
    queryFn: getInventoryApi,
    staleTime: 5 * 60 * 1000,
  })

  return {
    inventory: data?.inventory || { fonts: [], rings: [], overlays: [] },
    equipped: data?.equipped || {},
    isLoading,
  }
}

export const useEquipItem = () => {
  const queryClient = useQueryClient()

  const { mutate: equipItem, isPending: isEquipping } = useMutation({
    mutationFn: equipItemApi,

    onMutate: async ({ category, itemKey }) => {
      // 1. Cancel outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: wardrobeKeys.inventory() })
      await queryClient.cancelQueries({ queryKey: userKeys.auth() })

      // 2. Snapshot the previous values
      const previousInventory = queryClient.getQueryData(wardrobeKeys.inventory())
      const previousAuthUser = queryClient.getQueryData(userKeys.auth())

      // 3. Optimistically update Inventory (The Wardrobe UI)
      if (previousInventory) {
        queryClient.setQueryData(wardrobeKeys.inventory(), {
          ...previousInventory,
          equipped: {
            ...previousInventory.equipped,
            [category]: itemKey,
          },
        })
      }

      // 4. Optimistically update AuthUser (The Site-wide Look)
      // This ensures your ring/font changes everywhere immediately
      if (previousAuthUser) {
        queryClient.setQueryData(userKeys.auth(), {
          ...previousAuthUser,
          equipped: {
            ...previousAuthUser.equipped,
            [category]: itemKey,
          },
        })
      }

      return { previousInventory, previousAuthUser }
    },

    onError: (error, variables, context) => {
      // Roll back to the previous state if the server fails
      if (context?.previousInventory) {
        queryClient.setQueryData(wardrobeKeys.inventory(), context.previousInventory)
      }
      if (context?.previousAuthUser) {
        queryClient.setQueryData(userKeys.auth(), context.previousAuthUser)
      }
      showAppToast(error.message || "Failed to equip item.", "error")
    },

    onSettled: () => {
      // Final sync with server to ensure everything is perfect
      queryClient.invalidateQueries({ queryKey: wardrobeKeys.inventory() })
      queryClient.invalidateQueries({ queryKey: userKeys.auth() })
      queryClient.invalidateQueries({ queryKey: userKeys.profiles() })
      queryClient.invalidateQueries({ queryKey: postKeys.all })
    },
  })

  return { equipItem, isEquipping }
}