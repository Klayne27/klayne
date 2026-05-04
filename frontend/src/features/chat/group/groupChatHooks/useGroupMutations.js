import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import {
  adminDeleteMessageApi,
  createGroupApi,
  deleteGroupApi,
  handleJoinRequestApi,
  joinViaInviteCodeApi,
  kickMemberApi,
  leaveGroupApi,
  updateGroupApi,
  updateMemberRoleApi,
} from "../../../../api/groupApi"
import { groupKeys } from "./groupKeys"
import { conversationKeys } from "../../common/hooks/conversationKeys"
import { showAppToast } from "../../../../utils/showAppToast"
import { messageKeys } from "../../common/hooks/messageKeys"

export const useCreateGroup = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { mutate: createGroup, isPending: isCreatingGroup } = useMutation({
    mutationFn: createGroupApi,
    onSuccess: (group) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.list() })
      queryClient.invalidateQueries({ queryKey: conversationKeys.list() })
      showAppToast("Group created!", "success")
      navigate(`/messages/${group._id}`)
    },
    onError: (error) => {
      showAppToast(error.message || "Failed to create group.", "error")
    },
  })

  return { createGroup, isCreatingGroup }
}

export const useDeleteGroup = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { mutate: deleteGroup, isPending: isDeletingGroup } = useMutation({
    mutationFn: deleteGroupApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKeys.list() })
      queryClient.invalidateQueries({ queryKey: conversationKeys.list() })
      showAppToast("Group deleted.", "success")
      navigate("/messages")
    },
    onError: (error) => {
      showAppToast(error.message || "Failed to delete group.", "error")
    },
  })

  return { deleteGroup, isDeletingGroup }
}

export const useUpdateGroup = (groupId) => {
  const queryClient = useQueryClient()

  const { mutate: updateGroup, isPending: isUpdatingGroup } = useMutation({
    mutationFn: updateGroupApi,
    onSuccess: (updated) => {
      queryClient.setQueryData(groupKeys.detail(groupId), updated)
      queryClient.invalidateQueries({ queryKey: conversationKeys.list() })
      showAppToast("Group updated.", "success")
    },
    onError: (error) => {
      showAppToast(error.message || "Failed to update group.", "error")
    },
  })

  return { updateGroup, isUpdatingGroup }
}

export const useLeaveGroup = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { mutate: leaveGroup, isPending: isLeavingGroup } = useMutation({
    mutationFn: leaveGroupApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKeys.list() })
      queryClient.invalidateQueries({ queryKey: conversationKeys.list() })
      showAppToast("You left the group.", "success")
      navigate("/messages")
    },
    onError: (error) => {
      showAppToast(error.message || "Failed to leave group.", "error")
    },
  })

  return { leaveGroup, isLeavingGroup }
}

export const useUpdateMemberRole = (groupId) => {
  const queryClient = useQueryClient()

  const { mutate: updateMemberRole, isPending: isUpdatingRole } = useMutation({
    mutationFn: updateMemberRoleApi,
    onSuccess: (updated) => {
      queryClient.setQueryData(groupKeys.detail(groupId), updated)
      queryClient.invalidateQueries({ queryKey: groupKeys.members(groupId) })
      showAppToast("Role updated.", "success")
    },
    onError: (error) => {
      showAppToast(error.message || "Failed to update role.", "error")
    },
  })

  return { updateMemberRole, isUpdatingRole }
}

export const useKickMember = (groupId) => {
  const queryClient = useQueryClient()

  const { mutate: kickMember, isPending: isKicking } = useMutation({
    mutationFn: kickMemberApi,
    onSuccess: (updated) => {
      queryClient.setQueryData(groupKeys.detail(groupId), updated)
      queryClient.invalidateQueries({ queryKey: groupKeys.members(groupId) })
      showAppToast("Member removed.", "success")
    },
    onError: (error) => {
      showAppToast(error.message || "Failed to kick member.", "error")
    },
  })

  return { kickMember, isKicking }
}

export const useJoinViaInviteCode = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { mutate: joinViaInviteCode, isPending: isJoining } = useMutation({
    mutationFn: joinViaInviteCodeApi,
    onSuccess: (data) => {
      // --- PRIVATE GROUP CASE ---
      if (data.message && !data._id) {
        showAppToast(data.message, "success")
        // Navigate away so the user isn't stuck on the loading page
        navigate("/messages")
        return
      }

      // --- PUBLIC GROUP CASE ---
      queryClient.invalidateQueries({ queryKey: groupKeys.list() })
      queryClient.invalidateQueries({ queryKey: conversationKeys.list() })
      showAppToast("Joined group!", "success")
      navigate(`/messages/${data._id}`)
    },
    onError: (error) => {
      showAppToast(error.message || "Failed to join group.", "error")
      // Also navigate away on error so they aren't stuck
      navigate("/messages")
    },
  })

  return { joinViaInviteCode, isJoining }
}

export const useHandleJoinRequest = (groupId) => {
  const queryClient = useQueryClient()

  const { mutate: handleJoinRequest, isPending } = useMutation({
    mutationFn: handleJoinRequestApi,
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.joinRequests(groupId) })
      queryClient.invalidateQueries({ queryKey: groupKeys.detail(groupId) })
      showAppToast(action === "approve" ? "Request approved." : "Request rejected.", "success")
    },
    onError: (error) => {
      showAppToast(error.message || "Failed to handle request.", "error")
    },
  })

  return { handleJoinRequest, isPending }
}

export const useAdminDeleteMessage = (groupId) => {
  const queryClient = useQueryClient()

  const { mutate: adminDeleteMessage, isPending: isDeletingAsAdmin } = useMutation({
    mutationFn: adminDeleteMessageApi,
    onMutate: async ({ messageId }) => {
      await queryClient.cancelQueries({ queryKey: messageKeys.privateMessages(groupId) })
      const previous = queryClient.getQueryData(messageKeys.privateMessages(groupId))

      queryClient.setQueryData(messageKeys.privateMessages(groupId), (old) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page) =>
            page.map((msg) => (msg._id === messageId ? { ...msg, isDeletedByAdmin: true } : msg)),
          ),
        }
      })

      return { previous }
    },
    onError: (error, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(messageKeys.privateMessages(groupId), context.previous)
      }
      showAppToast(error.message || "Failed to delete message.", "error")
    },
    onSuccess: () => {
      showAppToast("Message deleted.", "success")
    },
  })

  return { adminDeleteMessage, isDeletingAsAdmin }
}

import { updateNicknameApi } from "../../../../api/groupApi"

export const useUpdateNickname = (groupId) => {
  const queryClient = useQueryClient()

  const { mutate: updateNickname, isPending: isUpdatingNickname } = useMutation({
    mutationFn: updateNicknameApi,
    onSuccess: (_, { targetUserId, nickname }) => {
      // Update the detail cache so the settings page re-renders immediately
      queryClient.setQueryData(groupKeys.detail(groupId), (old) => {
        if (!old) return old
        return {
          ...old,
          members: old.members.map((m) => {
            const uid = (m.user?._id ?? m.user)?.toString()
            return uid === targetUserId ? { ...m, nickname } : m
          }),
        }
      })
      // Also invalidate the members list panel
      queryClient.invalidateQueries({ queryKey: groupKeys.members(groupId) })
      showAppToast("Nickname updated.", "success")
    },
    onError: (error) => {
      showAppToast(error.message || "Failed to update nickname.", "error")
    },
  })

  return { updateNickname, isUpdatingNickname }
}