import { useRef, useState, useEffect } from "react";
import { IoCloseSharp } from "react-icons/io5";
import { PiSmiley } from "react-icons/pi";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";
import { useCreatePosts } from "../../hooks/postsHooks/useCreatePosts";
import { Link } from "react-router-dom";
import { BiImageAdd, BiPoll } from "react-icons/bi";

import EmojiPicker from "emoji-picker-react";
import toast from "react-hot-toast";
import { FaPlus } from "react-icons/fa6"; // Assuming you want this plus icon for adding poll choices

const POLL_CHOICE_MAX_LENGTH = 25; // Define max length for poll choices

const CreatePost = () => {
  const [text, setText] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPickerWidth, setEmojiPickerWidth] = useState(150);

  // --- NEW POLL STATE ---
  const [showPollInputs, setShowPollInputs] = useState(false);
  // Initialize with 2 choices. We'll add more dynamically as user types/clicks.
  const [pollChoices, setPollChoices] = useState([{ text: "" }, { text: "" }]);
  const MAX_POLL_CHOICES = 4; // Max options allowed (X/Twitter usually has 4)
  // State to track which poll choice input is focused for character count display
  const [focusedPollInputIndex, setFocusedPollInputIndex] = useState(null);
  // --- END NEW POLL STATE ---

  const { authUser } = useAuthUser();

  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const textareaRef = useRef(null);
  const formRef = useRef(null);

  const { createPost, isPending, isError, error } = useCreatePosts();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Poll validation
    if (showPollInputs) {
      // Filter out empty optional choices to count actual filled choices for submission
      const filledPollChoices = pollChoices.filter((choice) => choice.text.trim() !== "");

      if (text.trim() === "") {
        toast.error("Polls should have a question/text.");
        return;
      }

      // Ensure at least the first two choices (mandatory) are filled
      if (pollChoices[0].text.trim() === "" || pollChoices[1].text.trim() === "") {
        toast.error("At least the first two poll options must be filled.");
        return;
      }

      // Check if any *filled* poll choice exceeds the max length
      if (
        filledPollChoices.some((choice) => choice.text.length > POLL_CHOICE_MAX_LENGTH)
      ) {
        toast.error(`Poll options cannot exceed ${POLL_CHOICE_MAX_LENGTH} characters.`);
        return;
      }

      // Prevent submitting media with poll
      if (selectedFile) {
        toast.error("You cannot post a poll with an image or video.");
        return;
      }

      let postData = { text };
      // Pass only the filled poll options to the backend
      postData.pollOptions = filledPollChoices;

      createPost(postData, {
        onSuccess: () => {
          setText("");
          setSelectedFile(null);
          setPreviewUrl(null);
          setShowPollInputs(false); // Reset poll state
          // Reset poll choices to their initial state (2 empty choices)
          setPollChoices([{ text: "" }, { text: "" }]);
          if (fileInputRef.current) {
            fileInputRef.current.value = null;
          }
        },
        onError: (err) => {
          toast.error(err?.message || "Failed to create post with poll.");
        },
      });
      return; // Return here after handling poll submission
    }

    // General validation (text or media, when NOT a poll)
    if (text.trim() === "" && !selectedFile) {
      toast.error("Post must have text, an image, or a video.");
      return;
    }

    let postData = { text };

    if (selectedFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (selectedFile.type.startsWith("image/")) {
          postData.img = reader.result;
        } else if (selectedFile.type.startsWith("video/")) {
          postData.video = reader.result;
        }

        createPost(postData, {
          onSuccess: () => {
            setText("");
            setSelectedFile(null);
            setPreviewUrl(null);
            setShowPollInputs(false);
            setPollChoices([{ text: "" }, { text: "" }]); // Reset poll choices
            if (fileInputRef.current) {
              fileInputRef.current.value = null;
            }
          },
          onError: (err) => {
            toast.error(err?.message || "Failed to create post with media.");
          },
        });
      };
      reader.readAsDataURL(selectedFile);
    } else {
      // For text-only posts (when not a poll and no media)
      createPost(postData, {
        onSuccess: () => {
          setText("");
          setSelectedFile(null);
          setPreviewUrl(null);
          setShowPollInputs(false);
          setPollChoices([{ text: "" }, { text: "" }]); // Reset poll choices
        },
        onError: (err) => {
          toast.error(err?.message || "Failed to create post.");
        },
      });
    }
  };

  const handleFileChange = (e) => {
    // If user selects a file, disable poll inputs
    if (e.target.files[0]) {
      setShowPollInputs(false);
      // Clear poll choices if media is selected
      setPollChoices([{ text: "" }, { text: "" }]);
    }
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
        toast.error("Unsupported file type. Please select an image or a video.");
        setSelectedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = null;
        return;
      }

      if (file.size > 20 * 1024 * 1024) {
        toast.error("File size exceeds 20MB limit.");
        setSelectedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = null;
        return;
      }

      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  };

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
        handleSubmit(e);
      }
    }
  };

  // --- NEW POLL HANDLERS ---
  const handleAddPollChoice = () => {
    if (pollChoices.length < MAX_POLL_CHOICES) {
      setPollChoices([...pollChoices, { text: "" }]);
    }
  };

  const handlePollChoiceChange = (index, value) => {
    const newChoices = [...pollChoices];
    // Truncate value if it exceeds max length
    newChoices[index].text = value.slice(0, POLL_CHOICE_MAX_LENGTH);
    setPollChoices(newChoices);
  };

  const handleRemovePollChoice = (indexToRemove) => {
    const newChoices = pollChoices.filter((_, i) => i !== indexToRemove);
    // If we remove an option and now have less than 2, add empty ones back
    while (newChoices.length < 2) {
      newChoices.push({ text: "" });
    }
    setPollChoices(newChoices);
  };

  const handleRemovePoll = () => {
    setShowPollInputs(false);
    // Reset to 2 empty choices when removing the poll
    setPollChoices([{ text: "" }, { text: "" }]);
  };

  const handlePollIconClick = () => {
    setShowPollInputs(!showPollInputs);
    // If showing poll inputs, clear any selected media and reset poll choices
    if (!showPollInputs) {
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = null;
      setPollChoices([{ text: "" }, { text: "" }]); // Reset to 2 empty choices
    }
  };

  const handlePollInputFocus = (index) => {
    setFocusedPollInputIndex(index);
  };

  const handlePollInputBlur = () => {
    setFocusedPollInputIndex(null);
  };
  // --- END NEW POLL HANDLERS ---

  // Refined isButtonDisabled logic
  const isButtonDisabled =
    isPending ||
    (() => {
      if (showPollInputs) {
        // If poll is active:
        // 1. Text (question) must not be empty
        // 2. First two choices must be filled
        // 3. No choice (even optional ones) can exceed max length
        return (
          text.trim() === "" ||
          pollChoices[0].text.trim() === "" ||
          pollChoices[1].text.trim() === "" ||
          pollChoices.some((choice) => choice.text.length > POLL_CHOICE_MAX_LENGTH)
        );
      } else {
        // If poll is NOT active:
        // Post must have either text OR a selected file
        return text.trim() === "" && !selectedFile;
      }
    })();

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
    <div className="flex p-4 items-start gap-3 border-b border-accent mt-12">
      <Link to={`/profile/${authUser.username}`}>
        <div className="avatar">
          <div className="w-8 md:w-10 rounded-full">
            <img src={authUser?.profileImg || "/avatar-placeholder.png"} />
          </div>
        </div>
      </Link>
      <form className="flex flex-col w-full" onSubmit={handleSubmit} ref={formRef}>
        <textarea
          className="bg-inherit w-full p-0 pb-4 resize-none border-none focus:outline-none border-gray-800 text-xl"
          placeholder={showPollInputs ? "Ask a question" : "What is happening?"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          ref={textareaRef}
        />
        {previewUrl && (
          <div className="relative max-w-full mx-auto sm:w-auto">
            <IoCloseSharp
              className="absolute top-0 right-0 text-white bg-gray-800 rounded-full w-5 h-5 cursor-pointer z-10"
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
              />
            ) : (
              <video
                controls
                src={previewUrl}
                className="w-full h-auto max-h-96 object-contain rounded"
                preload="metadata"
              >
                Your browser does not support the video tag.
              </video>
            )}
          </div>
        )}

        {/* --- POLL INPUTS SECTION START --- */}
        {showPollInputs && (
          <div className="flex flex-col gap-4 mt-4 p-3 border border-accent rounded-2xl">
            {pollChoices.map((choice, index) => (
              <div key={index} className="flex items-center gap-1 relative">
                <div
                  className={`relative ${
                    pollChoices.length > 3 ? "w-full" : "w-full mr-7"
                  }`}
                >
                  <input
                    type="text"
                    placeholder={`Choice ${index + 1}`}
                    className={`bg-black/0 border p-2 py-3 border-accent ${
                      pollChoices.length > 3 ? "w-full" : "w-full mr-7"
                    } placeholder:text-gray-500 focus:outline-none focus:border-accent/99 rounded-[4px] `}
                    value={choice.text}
                    onChange={(e) => handlePollChoiceChange(index, e.target.value)}
                    onFocus={() => handlePollInputFocus(index)}
                    onBlur={handlePollInputBlur}
                    maxLength={POLL_CHOICE_MAX_LENGTH} // Enforce max length HTML attribute
                  />
                  
                  {focusedPollInputIndex === index && (
                    <span className="absolute top-1 right-2 text-xs text-gray-500">
                      {choice.text.length} / {POLL_CHOICE_MAX_LENGTH}
                    </span>
                  )}

                  {index >= 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePollChoice(index)}
                      className="text-red-600 hover:text-red-400 absolute top-3.5 right-1 transition duration-200"
                    >
                      <IoCloseSharp size={23} />
                    </button>
                  )}
                </div>
                {/* Plus icon for adding new choices */}
                {index === pollChoices.length - 1 &&
                  pollChoices.length < MAX_POLL_CHOICES && (
                    <button
                      type="button"
                      onClick={handleAddPollChoice}
                      className="text-primary hover:text-blue-400 transition duration-200 absolute right-0" // Add some margin if needed
                    >
                      <FaPlus size={18} />
                    </button>
                  )}
              </div>
            ))}
            <div className="flex justify-center items-center">
            <button
              type="button"
              onClick={handleRemovePoll}
              className="text-red-600 hover:text-red-400 mb-1 mt-2 rounded-full px-3 py-1  transition duration-200" // Added some top margin
            >
              Remove poll
            </button>
            </div>
          </div>
        )}

        <div className="flex justify-between pt-3">
          <div className="flex gap-1 items-center">
            {/* Image/Video input - hidden if poll is active */}
            {!showPollInputs && (
              <BiImageAdd
                className="text-primary w-6 h-6 cursor-pointer hover:text-primary/80"
                onClick={() => fileInputRef.current.click()}
              />
            )}
            <input
              type="file"
              accept="image/*,video/*"
              hidden
              ref={fileInputRef}
              onChange={handleFileChange}
            />

            {/* Poll icon - hidden if media is selected/previewed */}
            {!selectedFile && (
              <BiPoll
                className="text-primary size-6 cursor-pointer hover:text-primary/80"
                onClick={handlePollIconClick}
                title="Add a poll"
              />
            )}

            {/* Emoji picker */}
            <div className="relative">
              <PiSmiley
                ref={emojiButtonRef}
                className="text-primary cursor-pointer hidden md:block hover:text-primary/80"
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
          <button
            type="submit"
            className="px-3 py-1 text-sm md:text-base md:px-4 md:py-2 bg-primary text-secondary rounded-full hover:bg-primary/80 transition duration-300 disabled:bg-gray-500 disabled:text-black font-bold disabled:cursor-default"
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
