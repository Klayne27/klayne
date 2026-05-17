import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  acceptFollowRequestApi,
  blockUnblockUserApi,
  declineFollowRequestApi,
  deleteNoteApi,
  deleteUserAccountAdminApi,
  deleteUserAccountApi,
  followApi,
  getVacationModeStatusApi,
  muteUserApi,
  removePomodoroBackgroundApi,
  removeUserPhotoApi,
  searchUsersApi,
  setPomodoroBackgroundApi,
  toggleLikedFeedPrivacyApi,
  toggleVacationModeApi,
  unmuteUserApi,
  updateNameColorApi,
  updateNoteApi,
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
import { INBOX_NOTES_KEY } from "./useUserQueries"
import { usePomodoroBackgroundStore } from "../../../store/usePomodoroBackgroundStore"

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
      queryClient.setQueryData(userKeys.auth(), (old) => (old ? { ...old, ...newSettings } : old))
      return { previousAuth }
    },

    onError: (error, _, context) => {
      if (context?.previousAuth) {
        queryClient.setQueryData(userKeys.auth(), context.previousAuth)
      }
      showAppToast(error.message || "Failed to update privacy settings", "error")
    },

    onSuccess: (data) => {
      // FIX: the server returns the full updated user document.
      // Merge only the privacy-relevant fields we know are present and boolean,
      // rather than spreading the entire response (which can contain populated
      // nested objects that conflict with the existing cache shape).
      // This is also safe if the API wrapper accidentally double-nests the response.
      const serverUser = data?.user ?? data // unwrap { user: {...} } or plain object

      if (serverUser && typeof serverUser === "object") {
        queryClient.setQueryData(userKeys.auth(), (old) => {
          if (!old) return old
          return {
            ...old,
            // Only overwrite fields the privacy endpoint actually touches
            isPrivate: serverUser.isPrivate ?? old.isPrivate,
            isLikedFeedPrivate: serverUser.isLikedFeedPrivate ?? old.isLikedFeedPrivate,
            isPomodoroPrivate: serverUser.isPomodoroPrivate ?? old.isPomodoroPrivate,
          }
        })
      }

      showAppToast("Privacy settings saved", "success")
    },

    onSettled: () => {
      // Always re-fetch auth after settle so the cache is authoritative
      queryClient.invalidateQueries({ queryKey: userKeys.auth() })
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
      queryClient.invalidateQueries({ queryKey: INBOX_NOTES_KEY })
      // queryClient.invalidateQueries({ queryKey: conversationKeys.list() })

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
    onMutate: async (requesterId) => {
      // 1. Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: userKeys.followRequests() })

      // 2. Snapshot the previous value
      const previousRequests = queryClient.getQueryData(userKeys.followRequests())

      // 3. Optimistically update to the new value
      queryClient.setQueryData(userKeys.followRequests(), (prev = []) =>
        prev.filter((u) => u._id !== requesterId),
      )

      // 4. Return context object with the snapshotted value for rollback
      return { previousRequests }
    },
    onSuccess: () => {
      // Re-fetch auth to update follower counts/status
      queryClient.invalidateQueries({ queryKey: userKeys.auth() })
      showAppToast("Follow request accepted.", "success")
    },
    onError: (err, requesterId, context) => {
      // 5. Rollback on error
      if (context?.previousRequests) {
        queryClient.setQueryData(userKeys.followRequests(), context.previousRequests)
      }
      showAppToast(err.message, "error")
    },
    onSettled: () => {
      // Always refetch after error or success to keep server in sync
      queryClient.invalidateQueries({ queryKey: userKeys.followRequests() })
    },
  })

  return { acceptRequest, isAccepting }
}

export const useDeclineFollowRequest = () => {
  const queryClient = useQueryClient()

  const { mutate: declineRequest, isPending: isDeclining } = useMutation({
    mutationFn: declineFollowRequestApi,
    onMutate: async (requesterId) => {
      await queryClient.cancelQueries({ queryKey: userKeys.followRequests() })
      const previousRequests = queryClient.getQueryData(userKeys.followRequests())

      queryClient.setQueryData(userKeys.followRequests(), (prev = []) =>
        prev.filter((u) => u._id !== requesterId),
      )

      return { previousRequests }
    },
    onError: (err, requesterId, context) => {
      if (context?.previousRequests) {
        queryClient.setQueryData(userKeys.followRequests(), context.previousRequests)
      }
      showAppToast(err.message, "error")
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.followRequests() })
    },
  })

  return { declineRequest, isDeclining }
}

export const useUpdateNote = () => {
  const queryClient = useQueryClient()

  const { mutate: updateNote, isPending: isUpdatingNote } = useMutation({
    mutationFn: updateNoteApi,
    onMutate: async (newNote) => {
      await queryClient.cancelQueries({ queryKey: userKeys.auth() })
      const previousAuth = queryClient.getQueryData(userKeys.auth())

      queryClient.setQueryData(userKeys.auth(), (old) =>
        old
          ? {
              ...old,
              note: {
                // ── Only pick valid note fields — don't leak expiresInHours ──
                text: newNote.text ?? null,
                emoji: newNote.emoji ?? null,
                expiresAt: null, // server will fill the real value
              },
            }
          : old,
      )

      return { previousAuth }
    },
    onSuccess: (data, _vars, context) => {
      // Sync with what the server actually stored (correct expiresAt)
      queryClient.setQueryData(userKeys.auth(), (old) => (old ? { ...old, note: data.note } : old))
      const auth = queryClient.getQueryData(userKeys.auth())
      if (auth?.username) {
        queryClient.invalidateQueries({ queryKey: userKeys.profile(auth.username) })
      }
      showAppToast("Note updated!", "success")
    },
    onError: (_err, _vars, context) => {
      if (context?.previousAuth) queryClient.setQueryData(userKeys.auth(), context.previousAuth)
      showAppToast("Failed to update note", "error")
    },
  })

  return { updateNote, isUpdatingNote }
}

export const useDeleteNote = () => {
  const queryClient = useQueryClient()

  const { mutate: deleteNote, isPending: isDeletingNote } = useMutation({
    mutationFn: deleteNoteApi,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: userKeys.auth() })
      const previousAuth = queryClient.getQueryData(userKeys.auth())
      queryClient.setQueryData(userKeys.auth(), (old) => (old ? { ...old, note: null } : old))
      return { previousAuth }
    },
    onSuccess: () => {
      const auth = queryClient.getQueryData(userKeys.auth())
      if (auth?.username) {
        queryClient.invalidateQueries({ queryKey: userKeys.profile(auth.username) })
      }
      showAppToast("Note removed", "success")
    },
    onError: (_err, _vars, context) => {
      if (context?.previousAuth) queryClient.setQueryData(userKeys.auth(), context.previousAuth)
    },
  })

  return { deleteNote, isDeletingNote }
}

export const useRemoveUserPhoto = () => {
  const queryClient = useQueryClient()

  const { mutate: removePhoto, isPending: isRemovingPhoto } = useMutation({
    mutationFn: (photoType) => removeUserPhotoApi(photoType),

    onMutate: async (photoType) => {
      await queryClient.cancelQueries({ queryKey: userKeys.auth() })
      const previousAuth = queryClient.getQueryData(userKeys.auth())

      // Optimistically clear the image in the auth cache
      queryClient.setQueryData(userKeys.auth(), (old) => {
        if (!old) return old
        return { ...old, [photoType]: null }
      })

      return { previousAuth }
    },

    onSuccess: (data) => {
      showAppToast("Photo removed", "success")
      // Sync with the server's authoritative response
      queryClient.setQueryData(userKeys.auth(), (old) => (old ? { ...old, ...data } : data))
      queryClient.invalidateQueries({ queryKey: userKeys.auth() })
      queryClient.invalidateQueries({ queryKey: postKeys.all })
      if (data?.username) {
        queryClient.invalidateQueries({ queryKey: userKeys.profile(data.username) })
      }
    },

    onError: (error, _, context) => {
      // Roll back optimistic update
      if (context?.previousAuth) {
        queryClient.setQueryData(userKeys.auth(), context.previousAuth)
      }
      showAppToast(error.message || "Failed to remove photo", "error")
    },
  })

  return { removePhoto, isRemovingPhoto }
}

export const useSetPomodoroBackground = () => {
  const setPreset = usePomodoroBackgroundStore((s) => s.setPreset)
  const setCustom = usePomodoroBackgroundStore((s) => s.setCustom)

  const { mutate: uploadCustom, isPending: isSettingBackground } = useMutation({
    mutationFn: setPomodoroBackgroundApi,
    onSuccess: (data) => {
      // Persist the Cloudinary result to the store (also clears any preset)
      setCustom({ url: data.pomodoroBackgroundUrl, publicId: data.pomodoroBackgroundPublicId })
    },
    onError: () => {
      showAppToast("Failed to upload background", "error")
    },
  })

  // Unified entry point — preset path is synchronous and never touches the server
  const setBackground = ({ presetKey, customImage } = {}, mutationOptions = {}) => {
    if (presetKey) {
      setPreset(presetKey) // instant, localStorage only
    } else if (customImage) {
      uploadCustom({ customImage }, mutationOptions)
    }
  }

  return { setBackground, isSettingBackground }
}

export const useRemovePomodoroBackground = () => {
  const clearBackground = usePomodoroBackgroundStore((s) => s.clearBackground)
  const customPublicId = usePomodoroBackgroundStore((s) => s.customPublicId)

  const { mutate: deleteFromServer, isPending: isRemovingBackground } = useMutation({
    mutationFn: removePomodoroBackgroundApi,
    onSuccess: () => clearBackground(),
    onError: () => showAppToast("Failed to remove background", "error"),
  })

  const removeBackground = () => {
    if (customPublicId) {
      // Custom upload — must delete from Cloudinary, then clear store
      deleteFromServer()
    } else {
      // Preset — just wipe the store, no server call needed
      clearBackground()
    }
  }

  return { removeBackground, isRemovingBackground }
}