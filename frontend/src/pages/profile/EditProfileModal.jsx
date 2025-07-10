import { useEffect, useState } from "react";
import { useUpdateUserProfile } from "../../hooks/usersHooks/useUpdateUserProfile";
import { useNavigate } from "react-router-dom";

const EditProfileModal = ({ authUser }) => {
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    bio: "",
    link: "",
    newPassword: "",
    currentPassword: "",
  });

  const navigate = useNavigate();

  const { updateProfile, isUpdatingProfile, isSuccess, newUsername} =
    useUpdateUserProfile(formData);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "username") {
      setFormData({ ...formData, [name]: value.replace(/\s/g, "") });
    } else {
      setFormData({ ...formData, [name]: value });
    }
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
        className="rounded-full border-accent border px-2 md:px-4 py-0.5 md:py-1.5 hover:bg-secondary transition duration-200"
        onClick={() => document.getElementById("edit_profile_modal").showModal()}
      >
        Edit profile
      </button>
      <dialog id="edit_profile_modal" className="modal ">
        <div className="modal-box border border-accent shadow-md rounded-2xl">
          <h3 className="font-bold text-lg mb-4">Update Profile</h3>
          <form
            className="flex flex-col gap-4 "
            onSubmit={(e) => {
              e.preventDefault();
              updateProfile(formData);
            }}
          >
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                placeholder="Full Name"
                className="flex-1 input border border-accent rounded-lg p-2 input-md"
                value={formData.fullName}
                name="fullName"
                onChange={handleInputChange}
              />
              <input
                type="text"
                placeholder="Username"
                className="flex-1 input border border-accent rounded-lg p-2 input-md"
                value={formData.username}
                name="username"
                onChange={handleInputChange}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                type="email"
                placeholder="Email"
                className="flex-1 input border border-accent rounded-lg p-2 input-md"
                value={formData.email}
                name="email"
                onChange={handleInputChange}
              />
              <textarea
                placeholder="Bio"
                className="resize-none flex-1 input border border-accent rounded-lg p-2 input-md"
                value={formData.bio}
                name="bio"
                onChange={handleInputChange}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                type="password"
                placeholder="Current Password"
                className="flex-1 input border border-accent rounded-lg p-2 input-md"
                value={formData.currentPassword}
                name="currentPassword"
                onChange={handleInputChange}
              />
              <input
                type="password"
                placeholder="New Password"
                className="flex-1 input border border-accent rounded-lg p-2 input-md"
                value={formData.newPassword}
                name="newPassword"
                onChange={handleInputChange}
              />
            </div>
            <input
              type="text"
              placeholder="Link"
              className="flex-1 input border border-accent rounded-lg p-2 input-md"
              value={formData.link}
              name="link"
              onChange={handleInputChange}
            />
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


// export const renderClickableText = (text, currentUser) => {
//   if (!text) return null;

//   const urlRegex =
//     /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])|(www\.[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/gi;

//   const parts = [];
//   let lastIndex = 0;
//   let match;

//   while ((match = urlRegex.exec(text)) !== null) {
//     const url = match[0];
//     const urlStartIndex = match.index;
//     const urlEndIndex = urlRegex.lastIndex;

//     if (urlStartIndex > lastIndex) {
//       parts.push(text.substring(lastIndex, urlStartIndex));
//     }

//     const formattedUrl = url.startsWith("http") ? url : `http://${url}`;
//     parts.push(
//       <a
//         key={urlStartIndex}
//         href={formattedUrl}
//         target="_blank"
//         rel="noopener noreferrer"
//         className={`hover:underline ${
//           currentUser ? "text-white" : "text-blue-500"
//         } `}
//         onClick={(e) => e.stopPropagation()}
//       >
//         {url}
//       </a>
//     );

//     lastIndex = urlEndIndex;
//   }

//   if (lastIndex < text.length) {
//     parts.push(text.substring(lastIndex));
//   }

//   return <>{parts}</>;
// };


import { Link } from 'react-router-dom';

export const renderClickableText = (text) => {
  if (!text) return [];

  const parts = [];
  let lastIndex = 0;

  // Regex to match URLs, #hashtags, and @mentions
  // Mentions: @ followed by alphanumeric characters or underscores, at least 1 character long.
  // Hashtags: # followed by alphanumeric characters or underscores, at least 1 character long.
  // URLs: common URL pattern
  // const regex = /(https?:\/\/[^\s]+)|(#[\w_]+)|(@[\w_]+)/g;
  // const regex = /(https?:\/\/[^\s]+)|(@[\w_]+)/g;
  const regex = /(https?:\/\/[^\s]+)|(@[\p{L}\p{N}_]+)/gu; // Added \p{L} for any letter, \p{N} for any number, and 'u' flag

  let match;
  while ((match = regex.exec(text)) !== null) {
    const [fullMatch, url, hashtag, mention] = match;

    // Add preceding text as a plain string
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    if (url) {
      parts.push(
        <a
          key={match.index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
          onClick={(e) => e.stopPropagation()} // Prevent post navigation on link click
        >
          {url}
        </a>
      );
    } else if (hashtag) {
      parts.push(
        <Link
          key={match.index}
          to={`/explore?hashtag=${hashtag.substring(1)}`} // Assuming an explore page for hashtags
          className="text-blue-500 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {hashtag}
        </Link>
      );
    } else if (mention) {
      const username = mention.substring(1); // Remove '@'
      parts.push(
        <Link
          key={match.index}
          to={`/profile/${username}`} // Link to the user's profile page
          className="text-blue-500 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {mention}
        </Link>
      );
    }
    lastIndex = regex.lastIndex;
  }

  // Add any remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
};