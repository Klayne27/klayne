import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  acceptFollowRequestApi,
  blockUnblockUserApi,
  declineFollowRequestApi,
  deleteUserAccountAdminApi,
  deleteUserAccountApi,
  followApi,
  getVacationModeStatusApi,
  muteUserApi,
  searchUsersApi,
  toggleLikedFeedPrivacyApi,
  toggleVacationModeApi,
  unmuteUserApi,
  updateNameColorApi,
  updatePreferredBadgeApi,
  updatePrivacySettingsApi,
  updateStatusPreferenceApi,
  updateUserProfileApi,
} from "../../../api/usersApi"
import { useState } from "react"
import { userKeys } from "./userKeys"
import { showAppToast } from "../../../utils/showAppToast"
import { postKeys } from "../../posts/postsHooks/postKeys"
import { messageKeys } from "../../chat/common/hooks/messageKeys"
import { notificationKeys } from "../../notifications/notificationsHooks/notificationKeys"
import { conversationKeys } from "../../chat/common/hooks/conversationKeys"
import { useNavigate } from "react-router-dom"

export const useUpdateUserProfile = () => {
  const queryClient = useQueryClient()
  const [newUsername, setNewUsername] = useState(null)

  const {
    mutateAsync: updateProfile,
    isPending: isUpdatingProfile,
    isSuccess,
    isError,
    error,
  } = useMutation({
    mutationFn: (formData) => updateUserProfileApi(formData),
    onSuccess: (data) => {
      setNewUsername(data.username)

      showAppToast("Profile updated successfully", "success")
      Promise.all([
        queryClient.invalidateQueries({ queryKey: userKeys.auth() }),
        queryClient.invalidateQueries({ queryKey: postKeys.all }),
        queryClient.invalidateQueries({ queryKey: userKeys.profile(data.username) }),
      ])
    },
    onError: (error) => {
      showAppToast(error.message, "error")
      setNewUsername(null)
    },
  })

  return { updateProfile, isUpdatingProfile, isSuccess, newUsername, error, isError }
}

export const useUpdatePrivacySettings = () => {
  const queryClient = useQueryClient()

  const { mutate: updatePrivacy, isPending: isUpdatingPrivacy } = useMutation({
    mutationFn: updatePrivacySettingsApi,

    // Optimistic update — the toggle flips instantly in the UI
    onMutate: async (newSettings) => {
      await queryClient.cancelQueries({ queryKey: userKeys.auth() })

      const previousAuth = queryClient.getQueryData(userKeys.auth())

      // Merge the new settings into the cached auth user immediately
      queryClient.setQueryData(userKeys.auth(), (old) => (old ? { ...old, ...newSettings } : old))

      // Return snapshot so we can revert on error
      return { previousAuth }
    },

    onError: (error, _, context) => {
      // Roll back to the previous state if the API call failed
      if (context?.previousAuth) {
        queryClient.setQueryData(userKeys.auth(), context.previousAuth)
      }
      showAppToast(error.message || "Failed to update privacy settings", "error")
    },

    onSuccess: (data) => {
      // Sync with the server's response (covers any normalization the server did)
      queryClient.setQueryData(userKeys.auth(), (old) => (old ? { ...old, ...data } : data))
      showAppToast("Privacy settings saved", "success")
    },
  })

  return { updatePrivacy, isUpdatingPrivacy }
}

export const useFollow = () => {
  const queryClient = useQueryClient()

  const {
    mutate: follow,
    isPending,
    error: followError,
  } = useMutation({
    // 1. Accept an object instead of just an ID
    mutationFn: ({ userIdToFollow }) => followApi(userIdToFollow),

    onMutate: async ({ userIdToFollow, isTargetPrivate }) => {
      await queryClient.cancelQueries({ queryKey: userKeys.auth() })
      const previousAuthUser = queryClient.getQueryData(userKeys.auth())

      if (previousAuthUser) {
        queryClient.setQueryData(userKeys.auth(), (oldData) => {
          if (!oldData) return oldData

          const isCurrentlyFollowing = oldData.following.includes(userIdToFollow)

          let newFollowing = [...oldData.following]

          if (isCurrentlyFollowing) {
            // Unfollow is always safe to do optimistically
            newFollowing = newFollowing.filter((id) => id !== userIdToFollow)
          } else {
            // ONLY add to following list if the account is NOT private
            if (!isTargetPrivate) {
              newFollowing.push(userIdToFollow)
            }
            // If private, we don't modify the 'following' array optimistically.
            // The UI should instead rely on a "pendingRequest" check if you have one.
          }

          return { ...oldData, following: newFollowing }
        })
      }
      return { previousAuthUser }
    },

    onError: (error, variables, context) => {
      queryClient.setQueryData(userKeys.auth(), context.previousAuthUser)
      showAppToast(error.message || "Failed to perform action", "error")
    },

    onSettled: (data, error, variables) => {
      const { userIdToFollow } = variables
      queryClient.invalidateQueries({ queryKey: userKeys.auth() })
      queryClient.invalidateQueries({ queryKey: ["userProfile", userIdToFollow] })

      if (data?.action === "requested" || data?.action === "cancelled") {
        queryClient.invalidateQueries({ queryKey: userKeys.followRequests() })
      }
    },
  })

  return { follow, isPending, followError }
}

export const useToggleLikedFeedPrivacy = () => {
  const queryClient = useQueryClient()

  const { mutate: toggleLikedFeedPrivacy, isLoading: isTogglingPrivacy } = useMutation({
    mutationFn: toggleLikedFeedPrivacyApi,
    onMutate: async (newIsPrivateValue) => {
      await queryClient.cancelQueries({ queryKey: userKeys.auth() })

      const previousAuthUser = queryClient.getQueryData(userKeys.auth())

      if (previousAuthUser) {
        queryClient.setQueryData(userKeys.auth(), {
          ...previousAuthUser,
          isLikedFeedPrivate: newIsPrivateValue,
        })
      }

      return { previousAuthUser }
    },

    onError: (err, newIsPrivateValue, context) => {
      console.error("Failed to toggle liked feed privacy, rolling back.", err)
      if (context?.previousAuthUser) {
        queryClient.setQueryData(userKeys.auth(), context.previousAuthUser)
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.auth() })
    },
  })

  return { toggleLikedFeedPrivacy, isTogglingPrivacy }
}

export const useDeleteAccount = () => {
  const queryClient = useQueryClient()

  const { mutateAsync: deleteAccount, isPending: isDeletingAccount } = useMutation({
    mutationFn: ({ userId }) => deleteUserAccountApi(userId),
    onSuccess: () => {
      showAppToast("Account deleted successfully!", "success")
      localStorage.removeItem("authUser")
      queryClient.removeQueries()
      window.location.href = "/login"
    },
  })

  return { deleteAccount, isDeletingAccount }
}

export const useAdminDeleteUser = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const {
    mutate: adminDeleteUser,
    isPending,
    isSuccess,
    isError,
    error,
  } = useMutation({
    mutationFn: deleteUserAccountAdminApi,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: userKeys.profiles() })
      showAppToast(data.message || "User account deleted successfully!", "success")
      navigate("/")
    },
    onError: (error) => {
      showAppToast(error.message || "Failed to delete user account.", "error")
      console.error("Error deleting user account (admin):", error)
    },
  })

  return { adminDeleteUser, isPending, isSuccess, isError, error }
}

export const useBlockUnblockUser = () => {
  const queryClient = useQueryClient()

  const { mutate: blockUnblockUser, isLoading: isBlocking } = useMutation({
    mutationFn: blockUnblockUserApi,
    onSuccess: (data, variables) => {
      showAppToast(data.message || "User block status updated!", "success")

      const targetUserId = variables

      queryClient.setQueryData(userKeys.auth(), (oldAuthUser) => {
        if (!oldAuthUser) return oldAuthUser

        const isCurrentlyBlockedByAuthUser = oldAuthUser.blockedUsers?.includes(targetUserId)

        let newBlockedUsers
        if (isCurrentlyBlockedByAuthUser) {
          newBlockedUsers = oldAuthUser.blockedUsers.filter((id) => id !== targetUserId)
        } else {
          newBlockedUsers = [...(oldAuthUser.blockedUsers || []), targetUserId]
        }

        return {
          ...oldAuthUser,
          blockedUsers: newBlockedUsers,
        }
      })

      if (data.username) {
        queryClient.setQueryData(userKeys.profile(data.username), (oldData) => {
          return {
            ...oldData,
            user: oldData?.user,
            isBlockedByYou: data.isBlockedByYou,
            hasBlockedYou: data.hasBlockedYou,
            message: data.message,
            status: 200,
          }
        })
      }

      if (data.username) {
        queryClient.invalidateQueries({ queryKey: userKeys.profile(data.username) })
      } else {
        console.warn(
          "API response for block/unblock did not contain the affected username for userProfile invalidation.",
        )
      }

      queryClient.invalidateQueries({ queryKey: userKeys.auth() })
      queryClient.invalidateQueries({ queryKey: postKeys.all })
      queryClient.invalidateQueries({ queryKey: ["comments"] })
      queryClient.invalidateQueries({ queryKey: conversationKeys.list() })
      queryClient.invalidateQueries({ queryKey: notificationKeys.list() })
      queryClient.invalidateQueries({ queryKey: userKeys.suggestedList() })
      // queryClient.invalidateQueries({ queryKey: ["followers"] })
      // queryClient.invalidateQueries({ queryKey: ["following"] })
      queryClient.invalidateQueries({ queryKey: messageKeys.private() })
    },
    onError: (error) => {
      showAppToast(error.message || "Failed to update user block status.", "error")
      console.error("Block/Unblock mutation error:", error)
    },
  })

  return { blockUnblockUser, isBlocking }
}

export const useSearchUsers = (query) => {
  const {
    data: suggestedUsers,
    isLoading: isLoadingSuggestedUsers,
    isError,
    error,
    isFetching,
  } = useQuery({
    queryKey: userKeys.search(query),
    queryFn: () => searchUsersApi(query),
    enabled: !!query,
  })

  return { suggestedUsers, isLoadingSuggestedUsers, isError, error, isFetching }
}

export const useUpdatePreferredBadge = () => {
  const queryClient = useQueryClient()

  const { mutate: updateBadge } = useMutation({
    mutationFn: updatePreferredBadgeApi,
    onSuccess: () => {
      showAppToast("Badge preference updated!", "success")
      queryClient.invalidateQueries({ queryKey: userKeys.auth() })
    },
    onError: (error) => {
      showAppToast(error.message, "error")
    },
  })

  return { updateBadge }
}

export const useUpdateStatusPreference = () => {
  const queryClient = useQueryClient()

  const { mutate: updateStatus, isPending: isUpdatingStatus } = useMutation({
    mutationFn: updateStatusPreferenceApi,
    onMutate: async (status) => {
      await queryClient.cancelQueries({ queryKey: userKeys.auth() })
      const previousAuthUser = queryClient.getQueryData(userKeys.auth())

      queryClient.setQueryData(userKeys.auth(), (oldData) => {
        return {
          ...oldData,
          statusPreference: status,
        }
      })

      return { previousAuthUser }
    },
    onSuccess: () => {
      //   showAppToast("Status updated", "success")
      // queryClient.invalidateQueries(userKeys.auth())
    },
    onError: (context) => {
      queryClient.setQueryData(userKeys.auth(), context.previousAuthUser)
    },
  })

  return { updateStatus, isUpdatingStatus }
}

export const useVacationMode = () => {
  const queryClient = useQueryClient()

  const {
    data: vacationModeStatus,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["vacationMode"],
    queryFn: getVacationModeStatusApi,
  })

  const { mutate: toggleVacationMode, isPending: isToggling } = useMutation({
    mutationFn: toggleVacationModeApi,

    // ⭐ OPTIMISTIC UPDATE LOGIC
    onMutate: async (newIsVacationMode) => {
      await queryClient.cancelQueries({ queryKey: ["vacationMode"] })

      const previousVacationMode = queryClient.getQueryData(["vacationMode"])

      queryClient.setQueryData(["vacationMode"], { isVacationMode: newIsVacationMode })

      return { previousVacationMode }
    },

    onError: (err, newIsVacationMode, context) => {
      queryClient.setQueryData(["vacationMode"], context.previousVacationMode)
      showAppToast("Failed to toggle vacation mode. Please try again.", "error")
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["vacationMode"] })
    },
  })

  return {
    vacationModeStatus: vacationModeStatus?.isVacationMode,
    isLoading,
    isError,
    error,
    toggleVacationMode,
    isToggling,
  }
}

export const useUpdateNameColor = () => {
  const queryClient = useQueryClient()

  const { mutate: updateNameColor, isPending: isUpdatingNameColor } = useMutation({
    mutationFn: updateNameColorApi,
    onSuccess: (data) => {
      // Update authUser cache so the new color reflects immediately everywhere
      queryClient.setQueryData(userKeys.auth(), (old) =>
        old ? { ...old, nameColor: data.nameColor } : old,
      )
      showAppToast("Name color updated!", "success")
    },
    onError: (err) => showAppToast(err.message, "error"),
  })

  return { updateNameColor, isUpdatingNameColor }
}

export const useMuteUser = (userId) => {
  const queryClient = useQueryClient()

  const { mutate: muteUser, isPending: isMuting } = useMutation({
    mutationFn: ({ muteType }) => muteUserApi({ userId, muteType }),

    onMutate: async ({ muteType }) => {
      // Cancel outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ["muteStatus", userId] })

      // Snapshot the previous value
      const previousStatus = queryClient.getQueryData(["muteStatus", userId])

      // Optimistically update to the new state
      queryClient.setQueryData(["muteStatus", userId], {
        isMuted: true,
        muteType: muteType,
      })

      return { previousStatus }
    },

    onError: (err, variables, context) => {
      // Rollback to the previous state if mutation fails
      queryClient.setQueryData(["muteStatus", userId], context.previousStatus)
      showAppToast(err.message, "error")
    },

    onSuccess: () => {
      showAppToast("User muted.", "success")
    },

    onSettled: () => {
      // Always refetch after error or success to ensure server sync
      queryClient.invalidateQueries({ queryKey: ["muteStatus", userId] })
      queryClient.invalidateQueries({ queryKey: postKeys.all })
    },
  })

  return { muteUser, isMuting }
}

export const useUnmuteUser = (userId) => {
  const queryClient = useQueryClient()

  const { mutate: unmuteUser, isPending: isUnmuting } = useMutation({
    mutationFn: () => unmuteUserApi(userId),

    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["muteStatus", userId] })

      const previousStatus = queryClient.getQueryData(["muteStatus", userId])

      // Optimistically set muted to false
      queryClient.setQueryData(["muteStatus", userId], {
        isMuted: false,
        muteType: null,
      })

      return { previousStatus }
    },

    onError: (err, variables, context) => {
      queryClient.setQueryData(["muteStatus", userId], context.previousStatus)
      showAppToast(err.message, "error")
    },

    onSuccess: () => {
      showAppToast("User unmuted.", "success")
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["muteStatus", userId] })
      queryClient.invalidateQueries({ queryKey: postKeys.all })
    },
  })

  return { unmuteUser, isUnmuting }
}

export const useAcceptFollowRequest = () => {
  const queryClient = useQueryClient()

  const { mutate: acceptRequest, isPending: isAccepting } = useMutation({
    mutationFn: acceptFollowRequestApi,
    onSuccess: (_, requesterId) => {
      // Remove from list optimistically
      queryClient.setQueryData(userKeys.followRequests(), (prev = []) =>
        prev.filter((u) => u._id !== requesterId),
      )
      queryClient.invalidateQueries({ queryKey: userKeys.auth() })
      
      showAppToast("Follow request accepted.", "success")
    },
    onError: (err) => showAppToast(err.message, "error"),
  })

  return { acceptRequest, isAccepting }
}

export const useDeclineFollowRequest = () => {
  const queryClient = useQueryClient()

  const { mutate: declineRequest, isPending: isDeclining } = useMutation({
    mutationFn: declineFollowRequestApi,
    onSuccess: (_, requesterId) => {
      queryClient.setQueryData(userKeys.followRequests(), (prev = []) =>
        prev.filter((u) => u._id !== requesterId),
      )
    },
    onError: (err) => showAppToast(err.message, "error"),
  })

  return { declineRequest, isDeclining }
}