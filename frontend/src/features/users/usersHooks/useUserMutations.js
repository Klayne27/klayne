import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { blockUnblockUserApi, deleteUserAccountAdminApi, deleteUserAccountApi, followApi, getVacationModeStatusApi, searchUsersApi, toggleLikedFeedPrivacyApi, toggleVacationModeApi, updatePreferredBadgeApi, updateStatusPreferenceApi, updateUserProfileApi } from "../../../api/usersApi"
import { useState } from "react"
import { userKeys } from "./userKeys"
import { showAppToast } from "../../../utils/showAppToast"
import { postKeys } from "../../posts/postsHooks/postKeys"
import { messageKeys } from "../../chat/hooks/messageKeys"
import { notificationKeys } from "../../notifications/notificationsHooks/notificationKeys"
import { conversationKeys } from "../../chat/hooks/conversationKeys"
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

export const useFollow = () => {
  const queryClient = useQueryClient()
//   const { authUser } = useAuthUser()
  const {
    mutate: follow,
    isPending,
    error: followError,
  } = useMutation({
    mutationFn: (userIdToFollow) => followApi(userIdToFollow),
    onMutate: async (userIdToFollow) => {
      await queryClient.cancelQueries({ queryKey: userKeys.auth() })
      // await queryClient.cancelQueries({ queryKey: ["userProfile", userIdToFollow] })
      const previousAuthUser = queryClient.getQueryData(userKeys.auth())
      // const previousUserProfile = queryClient.getQueryData(["userProfile", userIdToFollow])
      if (previousAuthUser) {
        queryClient.setQueryData(userKeys.auth(), (oldData) => {
          if (!oldData) return oldData
          const isCurrentlyFollowing = oldData.following.includes(userIdToFollow)
          let newFollowing
          if (isCurrentlyFollowing) {
            newFollowing = oldData.following.filter((id) => id !== userIdToFollow)
          } else {
            newFollowing = [...oldData.following, userIdToFollow]
          }
          return { ...oldData, following: newFollowing }
        })
      }
      // if (previousUserProfile) {
      //   queryClient.setQueryData(["userProfile", userIdToFollow], (oldData) => {
      //     if (!oldData) return oldData
      //     const isCurrentlyFollowedByAuthUser = oldData.followers.includes(authUser._id)
      //     let newFollowers
      //     if (isCurrentlyFollowedByAuthUser) {
      //       newFollowers = oldData.followers.filter((id) => id !== authUser._id)
      //     } else {
      //       newFollowers = [...oldData.followers, authUser._id]
      //     }
      //     return { ...oldData, followers: newFollowers }
      //   })
      // }
      return { previousAuthUser }
    },
    onError: (error, userIdToFollow, context) => {
      queryClient.setQueryData(userKeys.auth(), context.previousAuthUser)
      // queryClient.setQueryData(["userProfile", userIdToFollow], context.previousUserProfile)
      showAppToast(error.message || "Failed to perform action", "error")
    },
    onSettled: (data, error, userIdToFollow) => {
      queryClient.invalidateQueries({ queryKey: userKeys.auth() })
      queryClient.invalidateQueries({ queryKey: ["followersList", userIdToFollow] })
      queryClient.invalidateQueries({ queryKey: ["followingList", userIdToFollow] })
      // queryClient.invalidateQueries({ queryKey: conversationKeys.list() })
      // queryClient.invalidateQueries({
      //   queryKey: conversationKeys.betweenUsers(userIdToFollow),
      // })
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
  const queryClient = useQueryClient();

  const { mutateAsync: deleteAccount, isPending: isDeletingAccount } = useMutation({
    mutationFn: ({ userId }) => deleteUserAccountApi(userId),
    onSuccess: () => {
      showAppToast("Account deleted successfully!", "success");
      localStorage.removeItem("authUser");
      queryClient.removeQueries();
      window.location.href = "/login";
    },
  });

  return { deleteAccount, isDeletingAccount };
};


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

