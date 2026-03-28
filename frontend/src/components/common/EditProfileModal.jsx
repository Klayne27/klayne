import { useEffect, useRef, useState } from "react"
import { useUpdateUserProfile } from "../../features/users/usersHooks/useUpdateUserProfile"
import { useNavigate } from "react-router-dom"
import { FaEye, FaEyeSlash } from "react-icons/fa6"
import { useToggleLikedFeedPrivacy } from "../../features/users/usersHooks/useToggleLikedFeed"
import { TbCameraPlus } from "react-icons/tb"
import LoadingSpinner from "../common/LoadingSpinner"

const EditProfileModal = ({ authUser }) => {
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
    levelOfEducation: "", // Added
    majorOrField: "", // Added
  }) // Add new state for image previews

  const [profileImg, setProfileImg] = useState(null)
  const [coverImg, setCoverImg] = useState(null) // Add refs for file input elements

  const coverImgRef = useRef(null)
  const profileImgRef = useRef(null)

  const navigate = useNavigate()

  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false)
  const [focusedInput, setFocusedInput] = useState(null)
  const [isLikedFeedPrivate, setIsLikedFeedPrivate] = useState(false)

  const curPasswordRef = useRef(null)
  const newPasswordRef = useRef(null)
  const confirmNewPasswordRef = useRef(null)

  const { updateProfile, isUpdatingProfile, isSuccess, newUsername } =
    useUpdateUserProfile(formData)
  const { toggleLikedFeedPrivacy, isTogglingPrivacy } = useToggleLikedFeedPrivacy()

  const handleInputChange = (e) => {
    const { name, value } = e.target

    let newValue = value

    if (name === "fullName" && newValue.length > 50) {
      newValue = newValue.slice(0, 50)
    } else if (name === "username") {
      newValue = newValue.replace(/\s/g, "").slice(0, 50)
    } else if (name === "bio" && newValue.length > 160) {
      newValue = newValue.slice(0, 160)
    } else if (name === "link" && newValue.length > 100) {
      newValue = newValue.slice(0, 100)
    }

    setFormData({ ...formData, [name]: newValue })
  }

  const handleImgChange = (e, imgType) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        if (imgType === "profileImg") {
          setProfileImg(reader.result)
        } else if (imgType === "coverImg") {
          setCoverImg(reader.result)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const charLimits = {
    fullName: 50,
    username: 50,
    bio: 160,
    link: 100,
  }

  useEffect(() => {
    if (authUser) {
      setFormData({
        fullName: authUser?.fullName,
        username: authUser?.username,
        email: authUser?.email,
        bio: authUser?.bio,
        link: authUser?.link,
        relationshipStatus: authUser?.relationshipStatus || "", // Add this
        levelOfEducation: authUser?.levelOfEducation || "", // Added
        majorOrField: authUser?.majorOrField || "", // Added
        newPassword: "",
        currentPassword: "",
        confirmNewPassword: "",
      })
      setIsLikedFeedPrivate(authUser?.isLikedFeedPrivate || false)
    }
  }, [authUser])

  useEffect(() => {
    if (isSuccess && newUsername) {
      navigate(`/profile/${newUsername}`)
      document.getElementById("edit_profile_modal").close()
    }
  }, [isSuccess, newUsername, navigate])

  const handleTogglePrivacy = () => {
    toggleLikedFeedPrivacy(!isLikedFeedPrivate)
    setIsLikedFeedPrivate(!isLikedFeedPrivate)
  } // Combine all form data, including images, for the update call

  const handleUpdate = (e) => {
    e.preventDefault() // Pass profileImg and coverImg along with other form data
    updateProfile({ ...formData, profileImg, coverImg })
  }

  return (
    <>
      <dialog id="edit_profile_modal" className="modal">
        <div className="modal-box rounded-2xl shadow-md">
          <h3 className="mb-4 text-lg font-bold">Update Profile</h3>
          <form
            className="flex flex-col gap-4"
            onSubmit={handleUpdate} // Use the new handleUpdate function
          >
            {/* The image preview section is already correct */}
            <div className="relative">
              {/* Cover Image Preview */}
              <div
                className="group/cover relative h-52 w-full cursor-pointer overflow-hidden rounded-t-lg transition duration-200"
                onClick={() => coverImgRef.current.click()}
              >
                <img
                  src={coverImg || authUser.coverImg?.imageUrl || "/cover.png"}
                  className="h-full w-full object-cover opacity-75 transition"
                  alt="cover image preview"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <TbCameraPlus className="text-white" size={50} />
                </div>
              </div>
              {/* Profile Image Preview */}
              <div
                className="group/profile absolute -bottom-16 left-4 cursor-pointer"
                onClick={() => profileImgRef.current.click()}
              >
                <div className="avatar size-32 rounded-full border-4 border-base-100">
                  <img
                    src={profileImg || authUser.profileImg?.imageUrl || "/avatar-placeholder.png"}
                    className="size-32 rounded-full opacity-75 transition"
                    alt="profile image preview"
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <TbCameraPlus size={40} className="text-white" />
                </div>
              </div>
              {/* Hidden File Inputs */}
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
            {/* Spacer to push form elements down */} <div className="h-16"></div>
            <div className="relative">
              <input
                type="text"
                placeholder="Username"
                className="input-md w-full flex-1 rounded-[4px] border border-secondary bg-base-100 p-2 focus:border-primary focus:outline-none"
                value={formData.fullName}
                name="fullName"
                onChange={handleInputChange}
                maxLength={charLimits.fullName}
                onFocus={() => setFocusedInput("fullName")}
                onBlur={() => setFocusedInput(null)}
              />
              {focusedInput === "fullName" && (
                <span className="absolute right-2 top-1/4 -translate-y-1/2 text-xs text-slate-500">
                  {formData.fullName.length}/{charLimits.fullName}
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="Handle"
                className="input-md w-full flex-1 rounded-[4px] border border-secondary bg-base-100 p-2 focus:border-primary focus:outline-none"
                value={formData.username}
                name="username"
                onChange={handleInputChange}
                maxLength={charLimits.username}
                onFocus={() => setFocusedInput("username")}
                onBlur={() => setFocusedInput(null)}
              />
              {focusedInput === "username" && (
                <span className="absolute right-2 top-1/4 -translate-y-1/2 text-xs text-slate-500">
                  {formData.username.length}/{charLimits.username}
                </span>
              )}
            </div>
            <div className="relative">
              <textarea
                placeholder="Bio"
                className="w-full flex-1 resize-none rounded-[4px] border border-secondary bg-base-100 p-2 pt-4 text-sm focus:border-primary focus:outline-none"
                value={formData.bio}
                name="bio"
                rows={3}
                onChange={handleInputChange}
                maxLength={charLimits.bio}
                onFocus={() => setFocusedInput("bio")}
                onBlur={() => setFocusedInput(null)}
              />
              {focusedInput === "bio" && (
                <span className="absolute right-2 top-[15%] -translate-y-1/2 text-xs text-slate-500">
                  {formData.bio.length}/{charLimits.bio}
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="Link"
                className="input-md w-full flex-1 rounded-[4px] border border-secondary bg-base-100 p-2 focus:border-primary focus:outline-none"
                value={formData.link}
                name="link"
                onChange={handleInputChange}
                maxLength={charLimits.link}
                onFocus={() => setFocusedInput("link")}
                onBlur={() => setFocusedInput(null)}
              />
              {focusedInput === "link" && (
                <span className="absolute right-2 top-1/4 -translate-y-1/2 text-xs text-slate-500">
                  {formData.link.length}/{charLimits.link}
                </span>
              )}
            </div>
            {!authUser?.googleId && (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Email"
                  className="input-md w-full flex-1 rounded-[4px] border border-secondary bg-base-100 p-2 focus:border-primary focus:outline-none"
                  value={formData.email}
                  name="email"
                  onChange={handleInputChange}
                  onFocus={() => setFocusedInput("email")}
                  onBlur={() => setFocusedInput(null)}
                />
              </div>
            )}
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <label className="mb-1 ml-1 block text-xs text-slate-500">Education Level</label>
                <select
                  name="levelOfEducation"
                  className="select-md w-full cursor-pointer rounded-[4px] border border-secondary bg-base-100 p-2 text-sm focus:border-primary focus:outline-none"
                  value={formData.levelOfEducation}
                  onChange={handleInputChange}
                >
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
            <div className="relative">
              <label className="mb-1 ml-1 block text-xs text-slate-500">Relationship Status</label>
              <select
                name="relationshipStatus"
                className="select-md w-full flex-1 cursor-pointer appearance-none rounded-[4px] border border-secondary bg-base-100 p-2 text-sm focus:border-primary focus:outline-none"
                value={formData.relationshipStatus}
                onChange={handleInputChange}
              >
                <option value="">Prefer not to say</option>
                <option value="Single">Single</option>
                <option value="In a relationship">In a relationship</option>
                <option value="It's complicated">It's complicated</option>
                <option value="Casually Dating">Casually Dating</option>
                <option value="Engaged">Engaged</option>
                <option value="Married">Married</option>
              </select>
            </div>
            {!authUser?.googleId && (
              <>
                <h3 className="text-lg font-bold">Change Password</h3>
                <div className="relative">
                  <input
                    ref={curPasswordRef}
                    type={showCurrentPassword ? "text" : "password"}
                    placeholder="Current Password"
                    className="input-md w-full flex-1 rounded-[4px] border border-secondary bg-base-100 p-2 pr-10 focus:border-primary focus:outline-none"
                    value={formData.currentPassword}
                    name="currentPassword"
                    onChange={handleInputChange}
                    onFocus={() => setFocusedInput("currentPassword")}
                    onBlur={() => setFocusedInput(null)}
                  />
                  <span
                    className={`${
                      focusedInput === "currentPassword" ? "text-primary" : "text-slate-500"
                    } absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-xs`}
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    title={showCurrentPassword ? "Hide password" : "Show password"}
                  >
                    {!showCurrentPassword ? <FaEyeSlash size={15} /> : <FaEye size={15} />}
                  </span>
                </div>
                <div className="relative">
                  <input
                    ref={newPasswordRef}
                    type={showNewPassword ? "text" : "password"}
                    tabIndex="-1"
                    placeholder="New Password"
                    className="input-md w-full flex-1 rounded-[4px] border border-secondary bg-base-100 p-2 pr-10 focus:border-primary focus:outline-none"
                    value={formData.newPassword}
                    name="newPassword"
                    onChange={handleInputChange}
                    onFocus={() => setFocusedInput("newPassword")}
                    onBlur={() => setFocusedInput(null)}
                  />
                  <span
                    className={`${
                      focusedInput === "newPassword" ? "text-primary" : "text-slate-500"
                    } absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-xs`}
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    title={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {!showNewPassword ? <FaEyeSlash size={15} /> : <FaEye size={15} />}
                  </span>
                </div>
                <div className="relative">
                  <input
                    ref={confirmNewPasswordRef}
                    type={showConfirmNewPassword ? "text" : "password"}
                    tabIndex="-1"
                    placeholder="Confirm New Password"
                    className="input-md w-full flex-1 rounded-[4px] border border-secondary bg-base-100 p-2 pr-10 focus:border-primary focus:outline-none"
                    value={formData.confirmNewPassword}
                    name="confirmNewPassword"
                    onChange={handleInputChange}
                    onFocus={() => setFocusedInput("confirmNewPassword")}
                    onBlur={() => setFocusedInput(null)}
                  />
                  <span
                    className={`${
                      focusedInput === "confirmNewPassword" ? "text-primary" : "text-slate-500"
                    } absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-xs`}
                    onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                    title={showConfirmNewPassword ? "Hide password" : "Show password"}
                  >
                    {!showConfirmNewPassword ? <FaEyeSlash size={15} /> : <FaEye size={15} />}
                  </span>
                </div>
              </>
            )}
            {/* New Section for Liked Feed Privacy */}
            <h1 className="text-xl font-bold">Privacy</h1>
            <div className="flex items-center justify-between">
              <h3 className="text-md">Liked Posts</h3>
              {isTogglingPrivacy ? (
                <LoadingSpinner size="sm" />
              ) : (
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={isLikedFeedPrivate}
                    onChange={handleTogglePrivacy}
                    disabled={isTogglingPrivacy}
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-600 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white rtl:peer-checked:after:-translate-x-full"></div>
                  {/* FIXED: Add a fixed width to the span to prevent shifting */}
                  <span className="ms-3 w-16 text-left text-sm font-medium text-slate-500">
                    {isLikedFeedPrivate ? "Private" : "Public"}
                  </span>
                </label>
              )}
            </div>
            {/* End of New Section */}
            <button className="btn btn-primary btn-sm rounded-full text-white">
              {isUpdatingProfile ? "Updating..." : "Update"}
            </button>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button className="outline-none">close</button>
        </form>
      </dialog>
    </>
  )
}
export default EditProfileModal
