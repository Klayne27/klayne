import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { equipItemApi, getInventoryApi } from "../../api/wardrobeApi"
import { showAppToast } from "../../utils/showAppToast"
import { userKeys } from "../users/usersHooks/userKeys"

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
    onSuccess: () => {
      // Invalidate both inventory (equipped state) and authUser (site-wide styling)
      queryClient.invalidateQueries({ queryKey: wardrobeKeys.inventory() })
      queryClient.invalidateQueries({ queryKey: userKeys.auth() })
      queryClient.invalidateQueries({ queryKey: userKeys.profiles() })
    //   showAppToast("Item equipped!", "success")
    },
    onError: (error) => {
      showAppToast(error.message || "Failed to equip item.", "error")
    },
  })

  return { equipItem, isEquipping }
}
