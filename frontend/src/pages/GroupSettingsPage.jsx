import { useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { IoArrowBack, IoCopy } from "react-icons/io5"
import { FaTrashCan, FaDoorOpen, FaPencil, FaCheck, FaX } from "react-icons/fa6"
import { useAuthUser } from "../features/auth/authHooks/useAuthUser"
import { regenerateInviteCodeApi } from "../api/groupApi"
import { showAppToast } from "../utils/showAppToast"
import { getOptimizedImageUrl } from "../utils/cloudinaryUtils"
import LoadingSpinner from "../components/common/LoadingSpinner"
import ConfirmationModal from "../components/common/ConfirmationModal"
import {
  useGetGroup,
  useGetJoinRequests,
  useGetMembers,
} from "../features/chat/group/groupChatHooks/useGroupQueries"
import {
  useDeleteGroup,
  useHandleJoinRequest,
  useKickMember,
  useLeaveGroup,
  useUpdateGroup,
  useUpdateMemberRole,
  useUpdateNickname,
} from "../features/chat/group/groupChatHooks/useGroupMutations"

// ── Inline nickname editor ───────────────────────────────────────────────────
const NicknameEditor = ({ currentNickname, onSave, onCancel }) => {
  const [value, setValue] = useState(currentNickname || "")

  return (
    <div className="mt-1.5 flex items-center gap-1.5">
      <input
        autoFocus
        maxLength={50}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add a nickname…"
        className="min-w-0 flex-1 rounded-xl border border-accent bg-transparent px-2 py-1 text-xs focus:outline-none"
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave(value)
          if (e.key === "Escape") onCancel()
        }}
      />
      <button
        onClick={() => onSave(value)}
        className="shrink-0 rounded-full p-1 text-primary hover:bg-primary/10"
      >
        <FaCheck size={11} />
      </button>
      <button
        onClick={onCancel}
        className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-secondary"
      >
        <FaX size={11} />
      </button>
    </div>
  )
}

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
  const { updateNickname } = useUpdateNickname(conversationId)

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
  const [editIsPrivate, setEditIsPrivate] = useState(false)
  const [inviteCode, setInviteCode] = useState(null)

  // Track which member's nickname editor is open: memberId → true
  const [editingNicknameFor, setEditingNicknameFor] = useState(null)

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onloadend = () => updateGroup({ groupId: conversationId, avatar: reader.result })
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
  const isAdminOrOwnerRole = myMember?.role === "admin" || isOwner

  const handleSaveEdit = () => {
    updateGroup({
      groupId: conversationId,
      name: editName || group.name,
      description: editDescription !== undefined ? editDescription : group.description,
      isPrivate: editIsPrivate,
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
    navigator.clipboard.writeText(`${window.location.origin}/join/${code}`)
    showAppToast("Invite link copied!", "success")
  }

  const handleSaveNickname = (targetUserId, nickname) => {
    updateNickname({ groupId: conversationId, targetUserId, nickname })
    setEditingNicknameFor(null)
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

      {/* Group info — unchanged from your original */}
      <div className="mb-4 flex flex-col items-center gap-3 rounded-2xl border border-accent p-4">
        <label className={`relative ${isAdminOrOwnerRole ? "cursor-pointer" : ""}`}>
          <img
            src={getOptimizedImageUrl(
              group.avatar?.imageUrl || "/avatar-placeholder.png",
              "avatar",
            )}
            className="h-16 w-16 rounded-full object-cover"
            alt={group.name}
          />
          {isAdminOrOwnerRole && (
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
                <span className="text-sm font-semibold">
                  {editIsPrivate ? "Private Group" : "Public Group"}
                </span>
                <span className="text-xs text-gray-500">
                  {editIsPrivate
                    ? "Members must be approved to join"
                    : "Anyone with the link can join immediately"}
                </span>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-primary"
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
            {isAdminOrOwnerRole && (
              <button
                className="rounded-full border border-accent px-4 py-1 text-sm"
                onClick={() => {
                  setEditName(group.name)
                  setEditDescription(group.description)
                  setEditIsPrivate(group.isPrivate)
                  setIsEditMode(true)
                }}
              >
                Edit info
              </button>
            )}
          </>
        )}
      </div>

      {/* Invite link — unchanged */}
      {isAdminOrOwnerRole && (
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

      {/* Join requests — unchanged */}
      {isAdminOrOwnerRole && group.isPrivate && joinRequests.length > 0 && (
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

      {/* ── Member directory with nickname editing ── */}
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
          <div className="flex max-h-[400px] flex-col gap-3 overflow-y-auto pr-1">
            {members.map((member) => {
              const user = member.user
              const memberId = (user?._id || user)?.toString()
              const isMe = memberId === currentUser._id.toString()
              const canEditNickname = isMe || isAdminOrOwnerRole
              const isEditingNickname = editingNicknameFor === memberId

              return (
                <div key={memberId} className="flex flex-col">
                  {/* Top row: avatar + name + role badge + action buttons */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Link to={`/profile/${user.username}`} className="shrink-0">
                        <img
                          src={getOptimizedImageUrl(
                            user?.profileImg?.imageUrl || "/avatar-placeholder.png",
                            "avatar",
                          )}
                          className="h-8 w-8 rounded-full object-cover"
                          alt={user?.username}
                        />
                      </Link>

                      <div className="flex min-w-0 flex-col">
                        <div className="flex items-center gap-1.5">
                          {/* Show nickname if set, otherwise fullName */}
                          <span
                            className="truncate text-sm font-semibold"
                            style={user?.nameColor ? { color: user.nameColor } : undefined}
                          >
                            {member.nickname || user?.fullName}
                          </span>
                          {/* Show original name below if nickname is active */}
                          {member.nickname && (
                            <span className="shrink-0 text-xs text-slate-500">
                              ({user?.fullName})
                            </span>
                          )}
                        </div>
                        <span className="truncate text-xs text-gray-400">@{user?.username}</span>
                      </div>

                      <span
                        className={`ml-1 shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
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

                    {/* Right: nickname pencil + kick/promote buttons */}
                    <div className="flex shrink-0 items-center gap-1">
                      {canEditNickname && !isEditingNickname && (
                        <button
                          onClick={() => setEditingNicknameFor(memberId)}
                          title={member.nickname ? "Edit nickname" : "Set nickname"}
                          className="rounded-full p-1.5 text-slate-400 transition hover:bg-secondary hover:text-base-content"
                        >
                          <FaPencil size={11} />
                        </button>
                      )}

                      {!isMe && isOwner && member.role !== "owner" && (
                        <>
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
                        </>
                      )}
                      {!isMe && !isOwner && isAdminOrOwnerRole && member.role === "member" && (
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
                  </div>

                  {/* Inline nickname editor — expands below the row */}
                  {isEditingNickname && (
                    <NicknameEditor
                      currentNickname={member.nickname}
                      onSave={(value) => handleSaveNickname(memberId, value)}
                      onCancel={() => setEditingNicknameFor(null)}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Danger zone — unchanged */}
      <div className="mb-14 rounded-2xl border border-red-500/30 p-4">
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
