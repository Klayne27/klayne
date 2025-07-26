import { useEffect, useRef, useState } from "react";
import { useUpdateUserProfile } from "../../hooks/usersHooks/useUpdateUserProfile";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa6";

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
  });

  const navigate = useNavigate();

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false); // New state for confirm password
  const [focusedInput, setFocusedInput] = useState(null);

  const curPasswordRef = useRef(null);
  const newPasswordRef = useRef(null);
  const confirmNewPasswordRef = useRef(null); // New ref for confirm password

  const { updateProfile, isUpdatingProfile, isSuccess, newUsername } =
    useUpdateUserProfile(formData);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    let newValue = value;

    if (name === "fullName" && newValue.length > 50) {
      newValue = newValue.slice(0, 50);
    } else if (name === "username") {
      newValue = newValue.replace(/\s/g, "").slice(0, 50);
    } else if (name === "bio" && newValue.length > 160) {
      newValue = newValue.slice(0, 160);
    } else if (name === "link" && newValue.length > 100) {
      newValue = newValue.slice(0, 100);
    }

    setFormData({ ...formData, [name]: newValue });
  };

  const charLimits = {
    fullName: 50,
    username: 50,
    bio: 160,
    link: 100,
  };

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
      });
    }
  }, [authUser]);

  useEffect(() => {
    if (isSuccess && newUsername) {
      navigate(`/profile/${newUsername}`);
      document.getElementById("edit_profile_modal").close();
    }
  }, [isSuccess, newUsername, navigate]);

  return (
    <>
      <button
        className="rounded-full border-secondary border px-4 py-1.5 hover:bg-secondary transition duration-200"
        onClick={() => document.getElementById("edit_profile_modal").showModal()}
      >
        Edit profile
      </button>
      <dialog id="edit_profile_modal" className="modal">
        <div className="modal-box  shadow-md rounded-2xl">
          <h3 className="font-bold text-lg mb-4">Update Profile</h3>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              updateProfile(formData);
            }}
          >
            <div className="relative">
              <input
                type="text"
                placeholder="Full Name"
                className="flex-1 bg-base-100 w-full focus:outline-none focus:border-primary border border-secondary rounded-[4px] p-2 input-md"
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
            {/* Username Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Username"
                className="flex-1 bg-base-100 w-full focus:outline-none focus:border-primary border border-secondary rounded-[4px] p-2 input-md"
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
            {/* <div className="flex flex-wrap gap-2">
              <input
                type="email"
                placeholder="Email"
                className="flex-1 input border border-secondary rounded-lg p-2 input-md"
                value={formData.email}
                name="email"
                onChange={handleInputChange}
              />
            </div> */}
            <div className="relative">
              <textarea
                placeholder="Bio"
                className="flex-1 bg-base-100 pt-4 resize-none w-full focus:outline-none focus:border-primary border border-secondary rounded-[4px] p-2 text-sm"
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
                  {" "}
                  {/* Positioned for textarea */}
                  {formData.bio.length}/{charLimits.bio}
                </span>
              )}
            </div>

            {/* Link Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Link"
                className="flex-1 bg-base-100 w-full focus:outline-none focus:border-primary border border-secondary rounded-[4px] p-2 input-md"
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

            <h3 className="font-bold text-lg">Change Password</h3>

            {/* Current Password Input */}
            <div className="relative">
              <input
                ref={curPasswordRef}
                type={showCurrentPassword ? "text" : "password"}
                placeholder="Current Password"
                className="flex-1 bg-base-100 w-full pr-10 focus:outline-none focus:border-primary border border-secondary rounded-[4px] p-2 input-md"
                value={formData.currentPassword}
                name="currentPassword"
                onChange={handleInputChange}
                onFocus={() => setFocusedInput("currentPassword")} // Still track focus for potential future use
                onBlur={() => setFocusedInput(null)}
              />
              <span
                className={`${
                  focusedInput === "currentPassword" ? "text-primary" : "text-slate-500"
                } absolute cursor-pointer right-4 top-1/2 -translate-y-1/2 text-xs `}
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                title={showCurrentPassword ? "Hide password" : "Show password"}
              >
                {!showCurrentPassword ? <FaEyeSlash size={15} /> : <FaEye size={15} />}
              </span>
            </div>

            {/* New Password Input */}
            <div className="relative">
              <input
                ref={newPasswordRef}
                type={showNewPassword ? "text" : "password"}
                tabIndex="-1"
                placeholder="New Password"
                className="flex-1 bg-base-100 w-full pr-10 focus:outline-none focus:border-primary border border-secondary rounded-[4px] p-2 input-md"
                value={formData.newPassword}
                name="newPassword"
                onChange={handleInputChange}
                onFocus={() => setFocusedInput("newPassword")} // Still track focus for potential future use
                onBlur={() => setFocusedInput(null)}
              />
              <span
                className={`${
                  focusedInput === "newPassword" ? "text-primary" : "text-slate-500"
                } absolute right-4 cursor-pointer top-1/2 -translate-y-1/2 text-xs`}
                onClick={() => setShowNewPassword(!showNewPassword)}
                title={showNewPassword ? "Hide password" : "Show password"}
              >
                {!showNewPassword ? <FaEyeSlash size={15} /> : <Fa size={15} />}
              </span>
            </div>

            {/* Confirm New Password Input - NEW FIELD */}
            <div className="relative">
              <input
                ref={confirmNewPasswordRef}
                type={showConfirmNewPassword ? "text" : "password"}
                tabIndex="-1"
                placeholder="Confirm New Password"
                className="flex-1 bg-base-100 w-full pr-10 focus:outline-none focus:border-primary border border-secondary rounded-[4px] p-2 input-md"
                value={formData.confirmNewPassword}
                name="confirmNewPassword" // Make sure the name matches the state key
                onChange={handleInputChange}
                onFocus={() => setFocusedInput("confirmNewPassword")}
                onBlur={() => setFocusedInput(null)}
              />
              <span
                className={`${
                  focusedInput === "confirmNewPassword"
                    ? "text-primary"
                    : "text-slate-500"
                } absolute right-4 cursor-pointer top-1/2 -translate-y-1/2 text-xs`}
                onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                title={showConfirmNewPassword ? "Hide password" : "Show password"}
              >
                {!showConfirmNewPassword ? <FaEyeSlash size={15} /> : <Fa size={15} />}
              </span>
            </div>
            <button className="btn btn-primary rounded-full btn-sm text-white">
              {isUpdatingProfile ? "Updating..." : "Update"}
            </button>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button className="outline-none">close</button>
        </form>
      </dialog>
    </>
  );
};
export default EditProfileModal;
