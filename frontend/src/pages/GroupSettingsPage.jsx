import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"

import { IoArrowBack, IoCopy } from "react-icons/io5"
import { FaTrashCan, FaDoorOpen } from "react-icons/fa6"
import { useAuthUser } from "../features/auth/authHooks/useAuthUser"
import { useGetGroup } from "../features/chat/group/groupChatHooks/useGetGroup"
import { useUpdateGroup } from "../features/chat/group/groupChatHooks/useUpdateGroup"
import { useKickMember } from "../features/chat/group/groupChatHooks/useKickMember"
import { useUpdateMemberRole } from "../features/chat/group/groupChatHooks/useUpdateMemberRole"
import { useGetJoinRequests } from "../features/chat/group/groupChatHooks/useGetJoinRequests"
import { useHandleJoinRequest } from "../features/chat/group/groupChatHooks/useHandleJoinRequest"
import { useLeaveGroup } from "../features/chat/group/groupChatHooks/useLeaveGroup"
import { useDeleteGroup } from "../features/chat/group/groupChatHooks/useDeleteGroup"
import { useGetMembers } from "../features/chat/group/groupChatHooks/useGetMembers"
import { regenerateInviteCodeApi } from "../api/groupApi"
import { showAppToast } from "../utils/showAppToast"
import { getOptimizedImageUrl } from "../utils/cloudinaryUtils"
import LoadingSpinner from "../components/common/LoadingSpinner"
import ConfirmationModal from "../components/common/ConfirmationModal"

export default function GroupSettingsPage() {
  const { conversationId } = useParams()
  const navigate = useNavigate()
  const { authUser: currentUser } = useAuthUser()

  const { group, isLoading } = useGetGroup(conversationId)

  const { updateGroup } = useUpdateGroup(conversationId)
  const { kickMember } = useKickMember(conversationId)
  const { updateMemberRole } = useUpdateMemberRole(conversationId)
  const { joinRequests } = useGetJoinRequests(conversationId)
  const { handleJoinRequest } = useHandleJoinRequest(conversationId)
  const { leaveGroup } = useLeaveGroup()
  const { deleteGroup } = useDeleteGroup()

  const [memberSearch, setMemberSearch] = useState("")
  const { members, isLoading: isLoadingMembers } = useGetMembers({
    groupId: conversationId,
    search: memberSearch,
  })

  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [isEditMode, setIsEditMode] = useState(false)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editIsPrivate, setEditIsPrivate] = useState(false) // Add this
  const [inviteCode, setInviteCode] = useState(null)

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.readAsDataURL(file)

    reader.onloadend = () => {
      updateGroup({
        groupId: conversationId,
        avatar: reader.result, // base64 string
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="md" />
      </div>
    )
  }

  if (!group) return null

  const myMember = group.members?.find(
    (m) => (m.user?._id || m.user)?.toString() === currentUser._id.toString(),
  )
  const isOwner = myMember?.role === "owner"
  const isAdminOrOwner = myMember?.role === "admin" || isOwner

  const handleSaveEdit = () => {
    updateGroup({
      groupId: conversationId,
      name: editName || group.name,
      description: editDescription !== undefined ? editDescription : group.description,
      isPrivate: editIsPrivate, // Add this
    })
    setIsEditMode(false)
  }

  const handleRegenerateInvite = async () => {
    try {
      const data = await regenerateInviteCodeApi(conversationId)
      setInviteCode(data.inviteCode)
      showAppToast("Invite link regenerated!", "success")
    } catch {
      showAppToast("Failed to regenerate invite link.", "error")
    }
  }

  const handleCopyInvite = () => {
    const code = inviteCode || group.inviteCode
    const link = `${window.location.origin}/join/${code}`
    navigator.clipboard.writeText(link)
    showAppToast("Invite link copied!", "success")
  }

  return (
    <div className="mx-auto flex h-full max-w-xl flex-col overflow-y-auto p-4">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)}>
          <IoArrowBack size={22} />
        </button>
        <h1 className="text-lg font-bold">Group Settings</h1>
      </div>

      {/* Group info */}
      <div className="mb-4 flex flex-col items-center gap-3 rounded-2xl border border-accent p-4">
        <label className={`relative ${isAdminOrOwner ? "cursor-pointer" : ""}`}>
          <img
            src={getOptimizedImageUrl(
              group.avatar?.imageUrl || "/avatar-placeholder.png",
              "avatar",
            )}
            className="h-16 w-16 rounded-full object-cover"
            alt={group.name}
          />

          {isAdminOrOwner && (
            <>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-xs opacity-0 hover:opacity-100">
                Change
              </div>
            </>
          )}
        </label>
        {isEditMode ? (
          <>
            <input
              className="w-full rounded-xl border border-accent bg-black/0 p-2 text-sm focus:outline-none"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Group name"
            />
            <textarea
              className="w-full resize-none rounded-xl border border-accent bg-black/0 p-2 text-sm focus:outline-none"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Description"
              rows={2}
            />
            <div className="flex w-full items-center justify-between px-2 py-2">
              <div className="flex flex-col">
                <span className="text-sm font-semibold">{editIsPrivate ? "Private Group": "Public Group"}</span>
                <span className="text-xs text-gray-500">
                  {editIsPrivate
                    ? "Members must be approved to join"
                    : "Anyone with the link can join immediately"}
                </span>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-primary" // Assuming you use DaisyUI based on your class names
                checked={editIsPrivate}
                onChange={(e) => setEditIsPrivate(e.target.checked)}
              />
            </div>
            <div className="flex gap-2">
              <button
                className="rounded-full bg-primary px-4 py-1.5 text-sm font-bold text-white"
                onClick={handleSaveEdit}
              >
                Save
              </button>
              <button
                className="rounded-full border border-accent px-4 py-1.5 text-sm"
                onClick={() => setIsEditMode(false)}
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-lg font-bold">{group.name}</p>
            {group.description && <p className="text-sm text-gray-400">{group.description}</p>}
            {isAdminOrOwner && (
              <button
                className="rounded-full border border-accent px-4 py-1 text-sm"
                onClick={() => {
                  setEditName(group.name)
                  setEditDescription(group.description)
                  setIsEditMode(true)
                  setEditIsPrivate(group.isPrivate) // Sync current privacy status
                }}
              >
                Edit info
              </button>
            )}
          </>
        )}
      </div>

      {/* Invite link */}
      {isAdminOrOwner && (
        <div className="mb-4 rounded-2xl border border-accent p-4">
          <p className="mb-2 font-semibold">Invite Link</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-xl bg-secondary p-2 text-xs">
              {`${window.location.origin}/join/${inviteCode || group.inviteCode}`}
            </code>
            <button onClick={handleCopyInvite} className="rounded-xl border border-accent p-2">
              <IoCopy size={16} />
            </button>
          </div>
          <button
            className="mt-2 text-sm text-primary hover:underline"
            onClick={handleRegenerateInvite}
          >
            Regenerate link
          </button>
        </div>
      )}

      {/* Join requests (admin only, private groups) */}
      {isAdminOrOwner && group.isPrivate && joinRequests.length > 0 && (
        <div className="mb-4 rounded-2xl border border-accent p-4">
          <p className="mb-2 font-semibold">Join Requests ({joinRequests.length})</p>
          <div className="flex flex-col gap-2">
            {joinRequests.map((req) => (
              <div key={req._id} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <img
                    src={getOptimizedImageUrl(
                      req.user?.profileImg?.imageUrl || "/avatar-placeholder.png",
                      "avatar",
                    )}
                    className="h-8 w-8 rounded-full"
                    alt={req.user?.username}
                  />
                  <span className="text-sm font-semibold">@{req.user?.username}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-white"
                    onClick={() =>
                      handleJoinRequest({
                        groupId: conversationId,
                        requestId: req._id,
                        action: "approve",
                      })
                    }
                  >
                    Approve
                  </button>
                  <button
                    className="rounded-full border border-accent px-3 py-1 text-xs"
                    onClick={() =>
                      handleJoinRequest({
                        groupId: conversationId,
                        requestId: req._id,
                        action: "reject",
                      })
                    }
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Member directory */}
      <div className="mb-4 rounded-2xl border border-accent p-4">
        <p className="mb-2 font-semibold">Members ({group.members?.length})</p>
        <input
          type="text"
          placeholder="Search members..."
          className="mb-3 w-full rounded-xl border border-accent bg-black/0 p-2 text-sm focus:outline-none"
          value={memberSearch}
          onChange={(e) => setMemberSearch(e.target.value)}
        />
        {isLoadingMembers ? (
          <LoadingSpinner size="sm" />
        ) : (
          <div className="flex max-h-[400px] flex-col gap-2 overflow-y-auto pr-1">
            {" "}
            {members.map((member) => {
              const user = member.user
              const memberId = (user?._id || user)?.toString()
              const isMe = memberId === currentUser._id.toString()

              return (
                <div key={memberId} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <img
                      src={getOptimizedImageUrl(
                        user?.profileImg?.imageUrl || "/avatar-placeholder.png",
                        "avatar",
                      )}
                      className="h-8 w-8 rounded-full object-cover"
                      alt={user?.username}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">{user?.fullName}</span>
                      <span className="text-xs text-gray-400">@{user?.username}</span>
                    </div>
                    <span
                      className={`ml-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                        member.role === "owner"
                          ? "bg-yellow-500/20 text-yellow-500"
                          : member.role === "admin"
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-secondary text-gray-400"
                      }`}
                    >
                      {member.role}
                    </span>
                  </div>

                  {/* Admin actions */}
                  {!isMe && isOwner && member.role !== "owner" && (
                    <div className="flex items-center gap-1">
                      <button
                        className="rounded-full border border-accent px-2 py-0.5 text-xs"
                        onClick={() =>
                          updateMemberRole({
                            groupId: conversationId,
                            targetUserId: memberId,
                            role: member.role === "admin" ? "member" : "admin",
                          })
                        }
                      >
                        {member.role === "admin" ? "Demote" : "Promote"}
                      </button>
                      <button
                        className="rounded-full border border-red-500/40 px-2 py-0.5 text-xs text-red-500"
                        onClick={() =>
                          kickMember({ groupId: conversationId, targetUserId: memberId })
                        }
                      >
                        Kick
                      </button>
                    </div>
                  )}
                  {!isMe && !isOwner && isAdminOrOwner && member.role === "member" && (
                    <button
                      className="rounded-full border border-red-500/40 px-2 py-0.5 text-xs text-red-500"
                      onClick={() =>
                        kickMember({ groupId: conversationId, targetUserId: memberId })
                      }
                    >
                      Kick
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl border border-red-500/30 p-4 mb-14">
        <p className="mb-3 font-semibold text-red-500">Danger Zone</p>
        {!isOwner && (
          <button
            className="flex w-full items-center gap-2 rounded-xl p-2 text-sm font-semibold text-red-500 transition hover:bg-red-500/10"
            onClick={() => setShowLeaveModal(true)}
          >
            <FaDoorOpen /> Leave group
          </button>
        )}
        {isOwner && (
          <button
            className="flex w-full items-center gap-2 rounded-xl p-2 text-sm font-semibold text-red-500 transition hover:bg-red-500/10"
            onClick={() => setShowDeleteModal(true)}
          >
            <FaTrashCan /> Delete group
          </button>
        )}
      </div>

      {showLeaveModal && (
        <ConfirmationModal
          isOpen={showLeaveModal}
          modalTitle="Leave Group"
          message={`Are you sure you want to leave "${group.name}"?`}
          confirmButtonText="Leave"
          onConfirm={() => {
            leaveGroup(conversationId)
            setShowLeaveModal(false)
          }}
          onClose={() => setShowLeaveModal(false)}
          danger
        />
      )}
      {showDeleteModal && (
        <ConfirmationModal
          isOpen={showDeleteModal}
          modalTitle="Delete Group"
          message={`Permanently delete "${group.name}"? All messages will be lost.`}
          confirmButtonText="Delete"
          onConfirm={() => {
            deleteGroup(conversationId)
            setShowDeleteModal(false)
          }}
          onClose={() => setShowDeleteModal(false)}
          danger
        />
      )}
    </div>
  )
}
