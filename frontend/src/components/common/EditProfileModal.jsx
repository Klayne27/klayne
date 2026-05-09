import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useNavigate } from "react-router-dom"
import { FaEye, FaEyeSlash, FaLock, FaUnlock, FaHeart } from "react-icons/fa"
import { TbCameraPlus } from "react-icons/tb"
import LoadingSpinner from "../common/LoadingSpinner"
import { getOptimizedImageUrl } from "../../utils/cloudinaryUtils"
import {
  useUpdatePrivacySettings,
  useUpdateUserProfile,
} from "../../features/users/usersHooks/useUserMutations"
import useLockBodyScroll from "../../hooks/customHooks/useLockBodyScroll"

const PrivacyToggleRow = ({ label, description, icon: Icon, checked, onChange, disabled }) => (
  <div className="flex items-center justify-between py-3">
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex min-w-0 flex-col">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-slate-500">{description}</span>
      </div>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`relative ml-4 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
        checked ? "bg-primary" : "bg-gray-600"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  </div>
)

const EditProfileModal = ({ authUser, isOpen, onClose, profileImg, setProfileImg, coverImg, setCoverImg }) => {
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    bio: "",
    link: "",
    newPassword: "",
    currentPassword: "",
    confirmNewPassword: "",
    relationshipStatus: "",
    levelOfEducation: "",
    majorOrField: "",
  })

  // const [profileImg, setProfileImg] = useState(null)
  // const [coverImg, setCoverImg] = useState(null)
  const coverImgRef = useRef(null)
  const profileImgRef = useRef(null)
  const navigate = useNavigate()

  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false)
  const [focusedInput, setFocusedInput] = useState(null)

  const { updateProfile, isUpdatingProfile, isSuccess, newUsername } = useUpdateUserProfile()
  const { updatePrivacy, isUpdatingPrivacy } = useUpdatePrivacySettings()

  useLockBodyScroll(isOpen)

  useEffect(() => {
    if (authUser) {
      setFormData({
        fullName: authUser.fullName || "",
        username: authUser.username || "",
        email: authUser.email || "",
        bio: authUser.bio || "",
        link: authUser.link || "",
        relationshipStatus: authUser.relationshipStatus || "",
        levelOfEducation: authUser.levelOfEducation || "",
        majorOrField: authUser.majorOrField || "",
        newPassword: "",
        currentPassword: "",
        confirmNewPassword: "",
      })
    }
  }, [authUser])

  useEffect(() => {
    if (isOpen && authUser) {
      // 1. Initialize/Reset form data when modal opens
      setFormData({
        fullName: authUser.fullName || "",
        username: authUser.username || "",
        email: authUser.email || "",
        bio: authUser.bio || "",
        link: authUser.link || "",
        relationshipStatus: authUser.relationshipStatus || "",
        levelOfEducation: authUser.levelOfEducation || "",
        majorOrField: authUser.majorOrField || "",
        newPassword: "",
        currentPassword: "",
        confirmNewPassword: "",
      })
    }

    // 2. Cleanup function: Runs when the modal closes
    return () => {
      if (!isOpen) {
        setProfileImg(null)
        setCoverImg(null)
      }
    }
  }, [isOpen, authUser, setProfileImg, setCoverImg])

  useEffect(() => {
    if (isSuccess && newUsername) {
      navigate(`/profile/${newUsername}`)
      // onClose()
    }
  }, [isSuccess, newUsername, navigate, onClose])

  if (!isOpen) return null

  const handleInputChange = (e) => {
    const { name, value } = e.target
    let newValue = value
    if (name === "fullName" && newValue.length > 50) newValue = newValue.slice(0, 50)
    if (name === "username") newValue = newValue.replace(/\s/g, "").slice(0, 50)
    if (name === "bio" && newValue.length > 160) newValue = newValue.slice(0, 160)
    if (name === "link" && newValue.length > 100) newValue = newValue.slice(0, 100)
    setFormData({ ...formData, [name]: newValue })
  }

  const handleImgChange = (e, imgType) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (imgType === "profileImg") setProfileImg(reader.result)
      else if (imgType === "coverImg") setCoverImg(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handlePrivacyToggle = () => {
    updatePrivacy({ isPrivate: !authUser?.isPrivate })
  }

  const handleLikedFeedToggle = () => {
    updatePrivacy({ isLikedFeedPrivate: !authUser?.isLikedFeedPrivate })
  }

  const handleUpdate = (e) => {
    e.preventDefault()
    updateProfile({ ...formData, profileImg, coverImg })
  }

  const charLimits = { fullName: 50, username: 50, bio: 160, link: 100 }

  return createPortal(
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-gray-700/70"
      onClick={onClose}
    >
      <div
        className="relative my-8 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-base-100 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Fixed */}
        <div className="flex items-center justify-between p-6 pb-0">
          <h3 className="text-lg font-bold">Update Profile</h3>
          <button onClick={onClose} className="text-slate-500 transition-colors hover:text-white">
            ✕
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="scrollbar-thin scrollbar-thumb-gray-700 flex-1 overflow-y-auto p-6">
          <form className="flex flex-col gap-4" onSubmit={handleUpdate}>
            {/* ── Images ── */}
            <div className="relative">
              <div
                className="group/cover relative h-52 w-full cursor-pointer overflow-hidden rounded-t-lg"
                onClick={() => coverImgRef.current.click()}
              >
                <img
                  src={getOptimizedImageUrl(
                    coverImg || authUser?.coverImg?.imageUrl || "/cover.png",
                    "cover",
                  )}
                  className="h-full w-full object-cover opacity-75 transition"
                  alt="cover preview"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <TbCameraPlus className="text-white" size={50} />
                </div>
              </div>
              <div
                className="group/profile absolute -bottom-16 left-4 cursor-pointer"
                onClick={() => profileImgRef.current.click()}
              >
                <div className="avatar size-32 rounded-full border-4 border-base-100">
                  <img
                    src={getOptimizedImageUrl(
                      profileImg || authUser?.profileImg?.imageUrl || "/avatar-placeholder.png",
                      "avatar",
                    )}
                    className="size-32 rounded-full opacity-75"
                    alt="profile preview"
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <TbCameraPlus size={40} className="text-white" />
                </div>
              </div>
              <input
                type="file"
                hidden
                accept="image/*"
                ref={coverImgRef}
                onChange={(e) => handleImgChange(e, "coverImg")}
              />
              <input
                type="file"
                hidden
                accept="image/*"
                ref={profileImgRef}
                onChange={(e) => handleImgChange(e, "profileImg")}
              />
            </div>

            <div className="h-16" />

            {/* ── Inputs ── */}
            {[
              { name: "fullName", placeholder: "Full Name" },
              { name: "username", placeholder: "Handle" },
              { name: "link", placeholder: "Link" },
            ].map(({ name, placeholder }) => (
              <div key={name} className="relative">
                <input
                  type="text"
                  placeholder={placeholder}
                  className="input-md w-full rounded-[4px] border border-secondary bg-base-100 p-2 focus:border-primary focus:outline-none"
                  value={formData[name]}
                  name={name}
                  onChange={handleInputChange}
                  maxLength={charLimits[name]}
                  onFocus={() => setFocusedInput(name)}
                  onBlur={() => setFocusedInput(null)}
                />
                {focusedInput === name && charLimits[name] && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                    {formData[name].length}/{charLimits[name]}
                  </span>
                )}
              </div>
            ))}

            <div className="relative">
              <textarea
                placeholder="Bio"
                className="w-full resize-none rounded-[4px] border border-secondary bg-base-100 p-2 pt-4 text-sm focus:border-primary focus:outline-none"
                value={formData.bio}
                name="bio"
                rows={3}
                onChange={handleInputChange}
                maxLength={charLimits.bio}
                onFocus={() => setFocusedInput("bio")}
                onBlur={() => setFocusedInput(null)}
              />
              {focusedInput === "bio" && (
                <span className="absolute right-2 top-[20%] text-xs text-slate-500">
                  {formData.bio.length}/{charLimits.bio}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <label className="mb-1 ml-1 block text-xs text-slate-500">Education Level</label>
                <select
                  name="levelOfEducation"
                  className="select-md w-full cursor-pointer rounded-[4px] border border-secondary bg-base-100 p-2 text-sm focus:border-primary focus:outline-none"
                  value={formData.levelOfEducation}
                  onChange={handleInputChange}
                >
                  <option value="">Prefer not to say</option>
                  <option value="Middle School">Middle School</option>
                  <option value="High School">High School</option>
                  <option value="Undergraduate">Undergraduate</option>
                  <option value="Postgraduate">Postgraduate</option>
                  <option value="Vocational">Vocational</option>
                  <option value="Self-Taught">Self-Taught</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="relative flex-1">
                <label className="mb-1 ml-1 block text-xs text-slate-500">Major / Field</label>
                <input
                  type="text"
                  placeholder="e.g. Computer Science"
                  className="input-md w-full rounded-[4px] border border-secondary bg-base-100 p-2 text-sm focus:border-primary focus:outline-none"
                  value={formData.majorOrField}
                  name="majorOrField"
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div className="relative flex-1">
              <label className="mb-1 ml-1 block text-xs text-slate-500">Relationship Status</label>
              <select
                name="relationshipStatus"
                className="select-md w-full cursor-pointer rounded-[4px] border border-secondary bg-base-100 p-2 text-sm focus:border-primary focus:outline-none"
                value={formData.relationshipStatus}
                onChange={handleInputChange}
              >
                <option value="">Prefer not to say</option>
                <option value="Single">Single</option>
                <option value="In a relationship">In a relationship</option>
                <option value="It's complicated">It's complicated</option>
                <option value="Casually Dating">Casually dating</option>
                <option value="Engaged">Engaged</option>
                <option value="Married">Married</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary btn-sm mt-2 rounded-full text-white">
              {isUpdatingProfile ? <LoadingSpinner size="sm" /> : "Save Changes"}
            </button>
          </form>

          {/* ── Privacy section ── */}
          <div className="mt-6 border-t border-accent pt-5">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-base font-bold">Privacy</h2>
              {isUpdatingPrivacy && <LoadingSpinner size="sm" />}
            </div>
            <p className="mb-3 text-xs text-slate-500">Changes apply immediately.</p>
            <div className="divide-y divide-accent">
              <PrivacyToggleRow
                label="Private Account"
                description="Only approved followers can see your posts. Rants excluded."
                checked={!!authUser?.isPrivate}
                onChange={handlePrivacyToggle}
                disabled={isUpdatingPrivacy}
              />
              <PrivacyToggleRow
                label="Private Liked Posts"
                description="Hide your liked posts from other users."
                checked={!!authUser?.isLikedFeedPrivate}
                onChange={handleLikedFeedToggle}
                disabled={isUpdatingPrivacy}
              />
              <PrivacyToggleRow
                label="Private Pomodoro Sessions"
                description="Hide your live study timer from other users."
                checked={!!authUser?.isPomodoroPrivate}
                onChange={() => updatePrivacy({ isPomodoroPrivate: !authUser?.isPomodoroPrivate })}
                disabled={isUpdatingPrivacy}
              />
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default EditProfileModal
