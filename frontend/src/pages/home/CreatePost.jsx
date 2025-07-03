import { CiImageOn } from "react-icons/ci"; // Not used, can remove if not used elsewhere
import { useRef, useState } from "react";
import { IoCloseSharp } from "react-icons/io5";
import { PiSmiley } from "react-icons/pi";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";
import { useCreatePosts } from "../../hooks/postsHooks/useCreatePosts";
import { Link } from "react-router-dom";
import { BiImageAdd } from "react-icons/bi"; // Icon for media upload

import EmojiPicker from "emoji-picker-react";
import { useEffect } from "react";

const CreatePost = () => {
  const [text, setText] = useState("");
  // --- MODIFIED: Use a single state for the selected file and its preview URL ---
  const [selectedFile, setSelectedFile] = useState(null); // Stores the actual File object (image or video)
  const [previewUrl, setPreviewUrl] = useState(null); // Stores the URL.createObjectURL for preview
  // --- END MODIFIED ---
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPickerWidth, setEmojiPickerWidth] = useState(150);

  const { authUser } = useAuthUser();

  // --- MODIFIED: Rename imgRef to fileInputRef as it handles both ---
  const fileInputRef = useRef(null); // Renamed from imgRef
  // --- END MODIFIED ---
  const emojiPickerRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const textareaRef = useRef(null);
  const formRef = useRef(null);

  // --- MODIFIED: Pass selectedFile to useCreatePosts ---
  // The mutationFn will now handle reading the file to base64
  const { createPost, isPending, isError, error } = useCreatePosts();
  // --- END MODIFIED ---

  const handleSubmit = async (e) => {
    // Added async keyword
    e.preventDefault();
    // --- MODIFIED: Check for text or selectedFile ---
    if (text.trim() === "" && !selectedFile) {
      return;
    }
    // --- END MODIFIED ---

    let postData = { text };

    if (selectedFile) {
      // --- MODIFIED: Handle both image and video files ---
      const reader = new FileReader();
      reader.onloadend = () => {
        // Use onloadend to ensure file is fully read
        if (selectedFile.type.startsWith("image/")) {
          postData.img = reader.result; // Base64 string for image
        } else if (selectedFile.type.startsWith("video/")) {
          postData.video = reader.result; // Base64 string for video
        }

        // Call the mutation after the file is read
        createPost(
          postData, // Pass the object with text, and either img or video
          {
            onSuccess: () => {
              setText("");
              setSelectedFile(null); // Clear selected file
              setPreviewUrl(null); // Clear preview
              if (fileInputRef.current) {
                // Clear file input value
                fileInputRef.current.value = null;
              }
            },
          }
        );
      };
      reader.readAsDataURL(selectedFile); // Read the file as a Data URL (Base64)
      // --- END MODIFIED ---
    } else {
      // If no file, just create post with text
      createPost(postData, {
        onSuccess: () => {
          setText("");
          setSelectedFile(null);
          setPreviewUrl(null);
        },
      });
    }
  };

  // --- MODIFIED: Renamed and adjusted to handle any file type ---
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Basic client-side validation for file type (optional, but good UX)
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
        alert("Unsupported file type. Please select an image or a video.");
        setSelectedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = null;
        return;
      }

      // Basic client-side validation for file size (optional, but good UX)
      // Adjust 20 * 1024 * 1024 (20MB) as per your server limit
      if (file.size > 20 * 1024 * 1024) {
        alert("File size exceeds 20MB limit.");
        setSelectedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = null;
        return;
      }

      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file)); // Create URL for instant preview
    } else {
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  };
  // --- END MODIFIED ---

  const onEmojiClick = (emojiObject) => {
    setText((prevText) => prevText + emojiObject.emoji);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      if (e.shiftKey) {
        e.preventDefault();
        const start = e.target.selectionStart;
        const end = e.target.selectionEnd;
        setText((prevText) => {
          return prevText.substring(0, start) + "\n" + prevText.substring(end);
        });
        setTimeout(() => {
          e.target.selectionStart = e.target.selectionEnd = start + 1;
        }, 0);
      } else {
        e.preventDefault();
        // Since handleSubmit is now async due to FileReader, call it directly
        handleSubmit(e);
      }
    }
  };

  // --- MODIFIED: Check selectedFile instead of img ---
  const isButtonDisabled = (text.trim() === "" && !selectedFile) || isPending;
  // --- END MODIFIED ---

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setEmojiPickerWidth(300);
      } else {
        setEmojiPickerWidth(350);
      }
    };

    handleResize();

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showEmojiPicker &&
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(event.target)
      ) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEmojiPicker]);

  return (
    <div className="flex p-4 items-start gap-3 border-b border-gray-700 mt-12">
      <Link to={`/profile/${authUser.username}`}>
        <div className="avatar">
          <div className="w-8 md:w-10 rounded-full">
            <img src={authUser?.profileImg || "/avatar-placeholder.png"} />
          </div>
        </div>
      </Link>
      <form className="flex flex-col w-full" onSubmit={handleSubmit} ref={formRef}>
        <textarea
          className="textarea w-full p-0 pb-4 resize-none border-none focus:outline-none border-gray-800 text-xl"
          placeholder="What is happening?"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          ref={textareaRef}
        />
        {/* --- MODIFIED: Conditional render for image or video preview --- */}
        {previewUrl && (
          <div className="relative max-w-full mx-auto sm:w-auto">
            {" "}
            {/* sm:w-auto to prevent fixed width on small screens */}
            <IoCloseSharp
              className="absolute top-0 right-0 text-white bg-gray-800 rounded-full w-5 h-5 cursor-pointer z-10" // Added z-10
              onClick={() => {
                setSelectedFile(null);
                setPreviewUrl(null);
                if (fileInputRef.current) fileInputRef.current.value = null;
              }}
            />
            {selectedFile.type.startsWith("image/") ? (
              <img
                src={previewUrl}
                className="w-full h-auto max-h-96 object-contain rounded"
                alt="Image preview"
              /> // max-h-96 for better scaling
            ) : (
              <video
                controls
                src={previewUrl}
                className="w-full h-auto max-h-96 object-contain rounded"
                preload="metadata"
              >
                {" "}
                {/* preload="metadata" for faster loading */}
                Your browser does not support the video tag.
              </video>
            )}
          </div>
        )}
        {/* --- END MODIFIED --- */}

        <div className="flex justify-between pt-3">
          <div className="flex gap-1 items-center">
            <BiImageAdd
              className="text-primary w-6 h-6 cursor-pointer hover:text-blue-400"
              onClick={() => fileInputRef.current.click()} // Use fileInputRef
            />
            <div className="relative">
              <PiSmiley
                ref={emojiButtonRef}
                className="text-primary cursor-pointer hidden md:block hover:text-blue-400"
                size={22}
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                strokeWidth={10}
              />
              {showEmojiPicker && (
                <div
                  className="absolute z-10 mt-2 top-full -left-28 md:left-0 md:translate-x-0 "
                  ref={emojiPickerRef}
                >
                  <EmojiPicker
                    onEmojiClick={onEmojiClick}
                    theme="dark"
                    width={emojiPickerWidth}
                  />{" "}
                </div>
              )}
            </div>
          </div>
          <input
            type="file"
            accept="image/*,video/*" // --- MODIFIED: Accept both image and video files ---
            hidden
            ref={fileInputRef} // Use fileInputRef
            onChange={handleFileChange}
          />
          <button
            type="submit"
            className="px-3 py-1 text-sm md:text-base md:px-4 md:py-2 bg-primary text-white rounded-full hover:bg-[#1d9cf0d8] transition duration-300 disabled:bg-gray-500 disabled:text-black font-bold disabled:cursor-default"
            disabled={isButtonDisabled}
          >
            {isPending ? "Posting..." : "Post"}
          </button>
        </div>
        {isError && <div className="text-red-500">{error.message}</div>}
      </form>
    </div>
  );
};
export default CreatePost;
