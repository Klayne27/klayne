import { useState, useRef } from "react"
import { IoClose } from "react-icons/io5"
import { FiUpload } from "react-icons/fi"
import { useGetFollowedUsersForMessaging } from "../private/privateChatHooks/useGetFollowedUsersForMessaging"
import { useCreateGroup } from "./groupChatHooks/useCreateGroup"
import { getOptimizedImageUrl } from "../../../utils/cloudinaryUtils"

export default function CreateGroupModal({ isOpen, onClose }) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isPrivate, setIsPrivate] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [avatarBase64, setAvatarBase64] = useState(null)

  const fileRef = useRef(null)
  const { createGroup, isCreatingGroup } = useCreateGroup()
  const { searchedFollowedUsers = [] } = useGetFollowedUsersForMessaging(searchQuery)


  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result)
      setAvatarBase64(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handleToggleUser = (user) => {
    setSelectedUsers((prev) =>
      prev.find((u) => u._id === user._id)
        ? prev.filter((u) => u._id !== user._id)
        : [...prev, user],
    )
  }

  const handleSubmit = () => {
    if (!name.trim()) return
    createGroup({
      name,
      description,
      isPrivate,
      memberIds: selectedUsers.map((u) => u._id),
      avatar: avatarBase64,
    })
    onClose()
  }

  const handleClose = () => {
    setName("")
    setDescription("")
    setIsPrivate(false)
    setSelectedUsers([])
    setSearchQuery("")
    setAvatarPreview(null)
    setAvatarBase64(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
      >
        <div className="relative flex w-full max-w-md flex-col gap-4 rounded-2xl border border-accent bg-base-100 p-6 shadow-xl" onClick={e => e.stopPropagation()}>
          <button className="absolute right-4 top-4" onClick={handleClose}>
            <IoClose size={22} />
          </button>
          <h2 className="text-lg font-bold">Create Group</h2>

          {/* Avatar */}
          <div className="flex items-center gap-3">
            <div
              className="relative h-16 w-16 cursor-pointer overflow-hidden rounded-full border border-accent bg-secondary"
              onClick={() => fileRef.current?.click()}
            >
              {avatarPreview ? (
                <img
                  src={getOptimizedImageUrl(avatarPreview, "avatar")}
                  alt="avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-gray-400">
                  <FiUpload size={20} />
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <span className="text-sm text-gray-400">Group avatar (optional)</span>
          </div>

          {/* Name */}
          <input
            type="text"
            placeholder="Group name *"
            className="w-full rounded-xl border border-accent bg-black/0 p-3 text-sm focus:outline-none"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
          />

          {/* Description */}
          <textarea
            placeholder="Description (optional)"
            className="w-full resize-none rounded-xl border border-accent bg-black/0 p-3 text-sm focus:outline-none"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            maxLength={200}
          />

          {/* Private toggle */}
          <label className="flex items-center gap-3 text-sm font-semibold">
            <input
              type="checkbox"
              className="toggle toggle-primary toggle-sm"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
            />
            Private group (require admin approval to join)
          </label>

          {/* Member search */}
          <div>
            <p className="mb-1 text-sm font-semibold text-gray-400">Add members</p>
            <input
              type="text"
              placeholder="Search followed users..."
              className="w-full rounded-xl border border-accent bg-black/0 p-2 text-sm focus:outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchedFollowedUsers.length > 0 && (
              <div className="mt-1 max-h-36 overflow-y-auto rounded-xl border border-accent bg-base-200">
                {searchedFollowedUsers.map((user) => {
                  const selected = selectedUsers.find((u) => u._id === user._id)
                  return (
                    <div
                      key={user._id}
                      className={`flex cursor-pointer items-center gap-2 px-3 py-2 transition hover:bg-secondary ${selected ? "bg-primary/10" : ""}`}
                      onClick={() => handleToggleUser(user)}
                    >
                      <img
                        src={getOptimizedImageUrl(
                          user.profileImg?.imageUrl || "/avatar-placeholder.png",
                          "avatar",
                        )}
                        className="h-7 w-7 rounded-full object-cover"
                        alt={user.username}
                      />
                      <span className="text-sm font-semibold">{user.fullName}</span>
                      <span className="text-xs text-gray-400">@{user.username}</span>
                      {selected && <span className="ml-auto text-primary">✓</span>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Selected members chips */}
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map((user) => (
                <span
                  key={user._id}
                  className="flex items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5 text-xs font-semibold"
                >
                  @{user.username}
                  <button onClick={() => handleToggleUser(user)}>
                    <IoClose size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <button
            className="w-full rounded-full bg-primary py-2 font-bold text-white disabled:opacity-50"
            onClick={handleSubmit}
            disabled={!name.trim() || isCreatingGroup}
          >
            {isCreatingGroup ? "Creating..." : "Create Group"}
          </button>
        </div>
      </div>
    </>
  )
}
