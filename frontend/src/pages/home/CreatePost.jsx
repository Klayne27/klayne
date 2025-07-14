import { useRef, useState, useEffect, useCallback } from "react";
import { IoClose, IoCloseSharp } from "react-icons/io5";
import { PiSmiley } from "react-icons/pi";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";
import { useCreatePosts } from "../../hooks/postsHooks/useCreatePosts";
import { Link } from "react-router-dom";
import { BiImageAdd, BiPoll } from "react-icons/bi";
import EmojiPicker from "emoji-picker-react";
import toast from "react-hot-toast";
import { FaPlus } from "react-icons/fa6";
import { IoCalendarOutline } from "react-icons/io5"; // Import calendar icon

// Import the new SchedulePostModal component

// IMPORTS FOR MENTION FEATURE
import { useQuery } from "@tanstack/react-query";
import { searchUsersApi } from "../../api/usersApi";
import SchedulePostModal from "../../components/common/SchedulePostModal";

const POLL_CHOICE_MAX_LENGTH = 25;

const CreatePost = () => {
  const [text, setText] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPickerWidth, setEmojiPickerWidth] = useState(150);

  // --- NEW POLL STATE ---
  const [showPollInputs, setShowPollInputs] = useState(false);
  const [pollChoices, setPollChoices] = useState([{ text: "" }, { text: "" }]);
  const MAX_POLL_CHOICES = 4;
  const [focusedPollInputIndex, setFocusedPollInputIndex] = useState(null);
  // --- END NEW POLL STATE ---

  // --- SCHEDULE POST STATE ---
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduledAt, setScheduledAt] = useState(null); // Stores the ISO string from the modal
  // --- END SCHEDULE POST STATE ---

  // --- MENTION STATE ---
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const suggestionBoxRef = useRef(null);
  // --- END MENTION STATE ---

  const { authUser } = useAuthUser();

  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const textareaRef = useRef(null);

  const { createPost, isPending, isError, error } = useCreatePosts();

  // Debounced query for mention search
  const [debouncedMentionQuery, setDebouncedMentionQuery] = useState("");

  const handlePaste = (e) => {
    e.preventDefault();

    const items = e.clipboardData.items;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();

        if (file) {
          if (!file.type.startsWith("image/")) {
            toast.error("Pasted content is not a supported image type.");
            setSelectedFile(null);
            setPreviewUrl(null);
            if (fileInputRef.current) fileInputRef.current.value = null;
            return;
          }

          if (file.size > 20 * 1024 * 1024) {
            toast.error("Pasted image size exceeds 20MB limit.");
            setSelectedFile(null);
            setPreviewUrl(null);
            if (fileInputRef.current) fileInputRef.current.value = null;
            return;
          }

          setSelectedFile(file);
          setPreviewUrl(URL.createObjectURL(file));

          // Reset other conflicting states
          setShowPollInputs(false);
          setPollChoices([{ text: "" }, { text: "" }]);
          setShowMentionSuggestions(false);
          setScheduledAt(null); // Clear scheduled post if media is pasted
          return;
        }
      }
    }

    // If no image was found, or if it was text, proceed with default text paste
    const pastedText = e.clipboardData.getData("text/plain");
    if (pastedText) {
      const cursorStart = e.target.selectionStart;
      const cursorEnd = e.target.selectionEnd;

      const newText =
        text.substring(0, cursorStart) + pastedText + text.substring(cursorEnd);

      setText(newText);

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = cursorStart + pastedText.length;
          textareaRef.current.selectionEnd = cursorStart + pastedText.length;
          textareaRef.current.style.height = "auto";
          textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
        }
      }, 0);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedMentionQuery(mentionQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [mentionQuery]);

  // Fetch mention suggestions using react-query
  const { data: mentionSuggestions = [], isLoading: isLoadingMentions } = useQuery({
    queryKey: ["mentionSuggestions", debouncedMentionQuery],
    queryFn: () => searchUsersApi(debouncedMentionQuery),
    enabled: !!debouncedMentionQuery && showMentionSuggestions && !showPollInputs,
  });

  // --- TEXTAREA CHANGE HANDLER ---
  const handleTextChange = (e) => {
    const newText = e.target.value;
    setText(newText);

    // Auto-adjust textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }

    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = newText.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (
      lastAtIndex !== -1 &&
      !/\S/.test(textBeforeCursor.substring(lastAtIndex - 1, lastAtIndex)) // Ensures '@' is preceded by whitespace or start of string
    ) {
      const possibleMention = textBeforeCursor.substring(lastAtIndex);
      const mentionMatch = possibleMention.match(/^@([\p{L}\p{N}_]*)$/u);

      if (mentionMatch) {
        setMentionQuery(mentionMatch[1]);
        setMentionStartIndex(lastAtIndex);
        setShowMentionSuggestions(true);
        return;
      }
    }

    setMentionQuery("");
    setMentionStartIndex(-1);
    setShowMentionSuggestions(false);
  };

  // --- MENTION SELECTION HANDLER ---
  const handleMentionSelect = (username) => {
    const currentText = text;
    const startReplaceIndex = mentionStartIndex;

    const textFromAt = currentText.substring(mentionStartIndex);
    const match = textFromAt.match(/^@([\p{L}\p{N}_]*)/u);
    let partialMentionLength = 0;
    if (match && match[1]) {
      partialMentionLength = match[1].length;
    }

    const endReplaceIndex = mentionStartIndex + 1 + partialMentionLength;

    const newText =
      currentText.substring(0, startReplaceIndex) +
      `@${username} ` +
      currentText.substring(endReplaceIndex);

    setText(newText);
    setMentionQuery("");
    setMentionStartIndex(-1);
    setShowMentionSuggestions(false);

    const newCursorPosition = startReplaceIndex + `@${username} `.length;
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
      }
    }, 0);
  };

  // --- CLOSE SUGGESTIONS ON CLICK OUTSIDE ---
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showMentionSuggestions &&
        suggestionBoxRef.current &&
        !suggestionBoxRef.current.contains(event.target) &&
        textareaRef.current &&
        !textareaRef.current.contains(event.target)
      ) {
        setShowMentionSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMentionSuggestions]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (showPollInputs) {
      const filledPollChoices = pollChoices.filter((choice) => choice.text.trim() !== "");

      if (text.trim() === "") {
        toast.error("Polls should have a question/text.");
        return;
      }

      if (pollChoices[0].text.trim() === "" || pollChoices[1].text.trim() === "") {
        toast.error("At least the first two poll options must be filled.");
        return;
      }

      if (
        filledPollChoices.some((choice) => choice.text.length > POLL_CHOICE_MAX_LENGTH)
      ) {
        toast.error(`Poll options cannot exceed ${POLL_CHOICE_MAX_LENGTH} characters.`);
        return;
      }

      if (selectedFile) {
        toast.error("You cannot post a poll with an image or video.");
        return;
      }
      if (scheduledAt) {
        // Cannot schedule a poll
        toast.error("You cannot schedule a poll.");
        return;
      }

      let postData = { text };
      postData.pollOptions = filledPollChoices;

      createPost(postData, {
        onSuccess: () => {
          setText("");
          setSelectedFile(null);
          setPreviewUrl(null);
          setShowPollInputs(false);
          setPollChoices([{ text: "" }, { text: "" }]);
          setScheduledAt(null); // Clear scheduledAt
          if (fileInputRef.current) {
            fileInputRef.current.value = null;
          }
          if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
          }
        },
        onError: (err) => {
          toast.error(err?.message || "Failed to create post with poll.");
        },
      });
      return;
    }

    // Regular post (text or media)
    if (text.trim() === "" && !selectedFile) {
      toast.error("Post must have text, an image, or a video.");
      return;
    }

    // If media is selected, clear scheduledAt and vice-versa
    if (selectedFile && scheduledAt) {
      toast.error("You cannot schedule a post with media.");
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

        // Pass scheduledAt only if it's set and no media (handled above, but good for clarity)
        if (scheduledAt && !selectedFile) {
          postData.scheduledAt = scheduledAt;
        }

        createPost(postData, {
          onSuccess: (data) => {
            // Data contains isScheduled and scheduledAt
            setText("");
            setSelectedFile(null);
            setPreviewUrl(null);
            setShowPollInputs(false);
            setPollChoices([{ text: "" }, { text: "" }]);
            setScheduledAt(null); // Clear scheduledAt after successful creation/scheduling
            if (fileInputRef.current) {
              fileInputRef.current.value = null;
            }
            if (textareaRef.current) {
              textareaRef.current.style.height = "auto";
            }
            // Toast message handled by useCreatePosts hook now
          },
          onError: (err) => {
            toast.error(err?.message || "Failed to create post with media.");
          },
        });
      };
      reader.readAsDataURL(selectedFile);
    } else {
      // If no file, but a scheduledAt is set, include it
      if (scheduledAt) {
        postData.scheduledAt = scheduledAt;
      }

      createPost(postData, {
        onSuccess: (data) => {
          // Data contains isScheduled and scheduledAt
          setText("");
          setSelectedFile(null);
          setPreviewUrl(null);
          setShowPollInputs(false);
          setPollChoices([{ text: "" }, { text: "" }]);
          setScheduledAt(null); // Clear scheduledAt after successful creation/scheduling
          if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
          }
          // Toast message handled by useCreatePosts hook now
        },
        onError: (err) => {
          toast.error(err?.message || "Failed to create post.");
        },
      });
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setShowPollInputs(false);
      setPollChoices([{ text: "" }, { text: "" }]);
      setShowMentionSuggestions(false);
      setScheduledAt(null); // Clear scheduledAt if media is selected
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
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      if (e.shiftKey) {
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
          }
        }, 0);
      } else {
        if (showMentionSuggestions && mentionSuggestions.length > 0) {
          e.preventDefault();
          // Optional: automatically select the first suggestion on Enter
          // handleMentionSelect(mentionSuggestions[0].username);
        } else {
          e.preventDefault();
          handleSubmit(e);
        }
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
    newChoices[index].text = value.slice(0, POLL_CHOICE_MAX_LENGTH);
    setPollChoices(newChoices);
  };

  const handleRemovePollChoice = (indexToRemove) => {
    const newChoices = pollChoices.filter((_, i) => i !== indexToRemove);
    while (newChoices.length < 2) {
      newChoices.push({ text: "" });
    }
    setPollChoices(newChoices);
  };

  const handleRemovePoll = () => {
    setShowPollInputs(false);
    setPollChoices([{ text: "" }, { text: "" }]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handlePollIconClick = () => {
    setShowPollInputs(!showPollInputs);
    if (!showPollInputs) {
      // If turning poll inputs ON
      setSelectedFile(null); // Clear media
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = null;
      setScheduledAt(null); // Clear scheduledAt
      setPollChoices([{ text: "" }, { text: "" }]);
      setMentionQuery("");
      setShowMentionSuggestions(false);
      setMentionStartIndex(-1);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handlePollInputFocus = (index) => {
    setFocusedPollInputIndex(index);
  };

  const handlePollInputBlur = () => {
    setFocusedPollInputIndex(null);
  };
  // --- END NEW POLL HANDLERS ---

  // --- SCHEDULE POST HANDLERS ---
  const handleScheduleIconClick = () => {
    setShowScheduleModal(true);
    // When opening schedule modal, clear other conflicting states
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = null;
    setShowPollInputs(false);
    setPollChoices([{ text: "" }, { text: "" }]);
  };

  const handleScheduleModalClose = () => {
    setShowScheduleModal(false);
  };

  const handleScheduleConfirm = (isoDateTime) => {
    setScheduledAt(isoDateTime);
    setShowScheduleModal(false);
    toast.success(`Post scheduled for ${new Date(isoDateTime).toLocaleString()}`);
  };

  const handleRemoveSchedule = () => {
    setScheduledAt(null);
    toast.success("Schedule removed.");
  };
  // --- END SCHEDULE POST HANDLERS ---

  const isButtonDisabled =
    isPending ||
    (() => {
      // If a scheduledAt date is picked, the post needs text, but not media/poll
      if (scheduledAt) {
        return text.trim() === "" || selectedFile !== null || showPollInputs;
      }
      if (showPollInputs) {
        return (
          text.trim() === "" ||
          pollChoices[0].text.trim() === "" ||
          pollChoices[1].text.trim() === "" ||
          pollChoices.some((choice) => choice.text.length > POLL_CHOICE_MAX_LENGTH)
        );
      } else {
        // Normal post: needs text OR file
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

  // Effect to manage textarea height dynamically on mount and text changes
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [text]);

  return (
    <div className="flex p-4 items-start gap-3 border-b border-accent mt-12 relative">
      <Link to={`/profile/${authUser.username}`}>
        <div className="avatar">
          <div className="w-8 md:w-10 rounded-full">
            <img src={authUser?.profileImg || "/avatar-placeholder.png"} />
          </div>
        </div>
      </Link>
      <form className="flex flex-col w-full relative" onSubmit={handleSubmit}>
        <div className="relative w-full">
          <textarea
            className="bg-inherit w-full p-0 pb-4 resize-none border-none focus:outline-none border-gray-800 text-xl relative overflow-y-auto"
            placeholder={
              scheduledAt
                ? "What do you want to schedule?"
                : showPollInputs
                ? "Ask a question"
                : "What is happening?"
            }
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            ref={textareaRef}
            rows={2}
            style={{ minHeight: "28px" }}
          />
          {/* Mention Suggestions Popover */}
          {showMentionSuggestions && mentionSuggestions.length > 0 && !showPollInputs && (
            <div
              ref={suggestionBoxRef}
              className="absolute z-50 bg-base-100 border border-accent rounded-md shadow-lg max-h-60 overflow-y-auto w-full"
              style={{ top: textareaRef.current?.scrollHeight || 0, left: 0 }}
            >
              {isLoadingMentions ? (
                <p className="p-2 text-gray-400">Loading suggestions...</p>
              ) : mentionSuggestions.length === 0 ? (
                <p className="p-2 text-gray-500">No users found.</p>
              ) : (
                mentionSuggestions.map((user) => (
                  <div
                    key={user._id}
                    className="flex items-center gap-2 p-2 hover:bg-secondary cursor-pointer"
                    onClick={() => handleMentionSelect(user.username)}
                  >
                    <div className="avatar">
                      <div className="w-8 rounded-full">
                        <img
                          src={user.profileImg || "/avatar-placeholder.png"}
                          alt="profile"
                        />
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold">{user.fullName}</p>
                      <p className="text-gray-500 text-sm">@{user.username}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {previewUrl && (
          <div className="relative max-w-full mx-auto sm:w-auto">
            <IoClose
              size={25}
              className="absolute -top-2 -right-2 text-white bg-gray-500 transition duration-200 hover:bg-gray-600 rounded-full p-1 cursor-pointer z-10"
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
                    maxLength={POLL_CHOICE_MAX_LENGTH}
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
                {index === pollChoices.length - 1 &&
                  pollChoices.length < MAX_POLL_CHOICES && (
                    <button
                      type="button"
                      onClick={handleAddPollChoice}
                      className="text-primary hover:text-blue-400 transition duration-200 absolute right-0"
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
                className="text-red-600 hover:text-red-400 mb-1 mt-2 rounded-full px-3 py-1  transition duration-200"
              >
                Remove poll
              </button>
            </div>
          </div>
        )}
        {/* --- POLL INPUTS SECTION END --- */}

        {/* Scheduled Post Display */}
        {scheduledAt && (
          <div className="flex items-center justify-between mt-4 p-3 border border-accent rounded-2xl bg-secondary/20">
            <p className="text-primary text-sm font-semibold">
              Will send on{" "}
              {new Date(scheduledAt).toLocaleString([], {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              })}
            </p>
            <button
              type="button"
              onClick={handleRemoveSchedule}
              className="text-red-600 hover:text-red-400 transition duration-200"
            >
              <IoCloseSharp size={23} />
            </button>
          </div>
        )}

        <div className="flex justify-between pt-3">
          <div className="flex gap-1 items-center">
            {/* Image/Video input - hidden if poll or schedule is active */}
            {!showPollInputs && !scheduledAt && (
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

            {/* Poll icon - hidden if media or schedule is selected/previewed */}
            {!selectedFile && !scheduledAt && (
              <BiPoll
                className="text-primary size-6 cursor-pointer hover:text-primary/80"
                onClick={handlePollIconClick}
                title="Add a poll"
              />
            )}

            {/* Schedule Post icon - hidden if media or poll is active */}
            {!selectedFile && !showPollInputs && (
              <IoCalendarOutline
                className="text-primary size-6 cursor-pointer hover:text-primary/80"
                onClick={handleScheduleIconClick}
                title="Schedule post"
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
                  />
                </div>
              )}
            </div>
          </div>
          <button
            type="submit"
            className="px-3 py-1 text-sm md:text-base md:px-4 md:py-2 bg-primary text-secondary rounded-full hover:bg-primary/80 transition duration-300 disabled:bg-gray-500 disabled:text-black font-bold disabled:cursor-default"
            disabled={isButtonDisabled}
          >
            {isPending ? "Posting..." : scheduledAt ? "Schedule" : "Post"}
          </button>
        </div>
        {isError && <div className="text-red-500">{error.message}</div>}
      </form>

      {/* Schedule Post Modal */}
      <SchedulePostModal
        isOpen={showScheduleModal}
        onClose={handleScheduleModalClose}
        onScheduleConfirm={handleScheduleConfirm}
        initialDate={scheduledAt} // Pass current scheduledAt if editing
      />
    </div>
  );
};
export default CreatePost;
