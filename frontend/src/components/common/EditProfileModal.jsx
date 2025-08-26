import { useEffect, useRef, useState } from "react"
import { useUpdateUserProfile } from "../../features/users/usersHooks/useUpdateUserProfile"
import { useNavigate } from "react-router-dom"
import { FaEye, FaEyeSlash } from "react-icons/fa6"

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
  })

  const navigate = useNavigate()

  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false)
  const [focusedInput, setFocusedInput] = useState(null)

  const curPasswordRef = useRef(null)
  const newPasswordRef = useRef(null)
  const confirmNewPasswordRef = useRef(null)

  const { updateProfile, isUpdatingProfile, isSuccess, newUsername } =
    useUpdateUserProfile(formData)

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
        newPassword: "",
        currentPassword: "",
        confirmNewPassword: "",
      })
    }
  }, [authUser])

  useEffect(() => {
    if (isSuccess && newUsername) {
      navigate(`/profile/${newUsername}`)
      document.getElementById("edit_profile_modal").close()
    }
  }, [isSuccess, newUsername, navigate])

  return (
    <>
      <button
        className="rounded-full border border-secondary px-4 py-1.5 transition duration-200 hover:bg-secondary"
        onClick={() => document.getElementById("edit_profile_modal").showModal()}
      >
        Edit profile
      </button>
      <dialog id="edit_profile_modal" className="modal">
        <div className="modal-box rounded-2xl shadow-md">
          <h3 className="mb-4 text-lg font-bold">Update Profile</h3>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              updateProfile(formData)
            }}
          >
            <div className="relative">
              <input
                type="text"
                placeholder="Full Name"
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
                placeholder="Username"
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
                    {!showNewPassword ? <FaEyeSlash size={15} /> : <Fa size={15} />}
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
                    {!showConfirmNewPassword ? <FaEyeSlash size={15} /> : <Fa size={15} />}
                  </span>
                </div>
              </>
            )}
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
