import { useRef, useState, useEffect, useCallback } from "react";
import { IoClose, IoCloseSharp } from "react-icons/io5";
import { PiSmiley } from "react-icons/pi";
import { useAuthUser } from "../../../hooks/authHooks/useAuthUser";
import { useCreatePosts } from "../../../hooks/postsHooks/useCreatePosts";
import { Link } from "react-router-dom";
import { BiImageAdd, BiPoll } from "react-icons/bi";
import EmojiPicker from "emoji-picker-react";
import { FaPlus } from "react-icons/fa6";
import { TbCalendarClock } from "react-icons/tb";

// IMPORTS FOR MENTION FEATURE
import SchedulePostModal from "../SchedulePostModal";
import ScheduledPostsModal from "../ScheduledPostsModal";
import EditScheduledPostModal from "../EditSchedulePostModal";
import { useSearchUsers } from "../../../hooks/usersHooks/userSearchUsers";
import { useDebounce } from "../../../hooks/customHooks/useDebounce";
import { showAppToast } from "../../../utils/showAppToast";
import { useSocket } from "../../../context/SocketContext";
import { useQueryClient } from "@tanstack/react-query";
import { useMarkPostsAsRead } from "../../../hooks/postsHooks/useMarkPostsAsRead";
import { useIsMobile } from "../../../hooks/customHooks/useIsMobile";
import { usePasteHandler } from "../../../hooks/customHooks/usePasteHandler";

const POLL_CHOICE_MAX_LENGTH = 25;
const MAX_POLL_CHOICES = 4;
const MAX_FILE_SIZE_MB = 20;

const CreatePost = () => {
  const { setShowNewFeedPostsButton, newPostCount } =
    useSocket();
  const queryClient = useQueryClient();

  // State for post content
  const [postInput, setPostInput] = useState("");
  const [postSelectedFile, setPostSelectedFile] = useState(null);
  const [postPreviewImage, setPostPreviewImage] = useState(null);

  // State for emoji picker
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPickerWidth, setEmojiPickerWidth] = useState(350); // Default for larger screens

  // State for poll feature
  const [showPollInputs, setShowPollInputs] = useState(false);
  const [pollChoices, setPollChoices] = useState([{ text: "" }, { text: "" }]);
  const [focusedPollInputIndex, setFocusedPollInputIndex] = useState(null);

  // State for schedule post feature (for NEW posts)
  const [showSchedulePostModal, setShowSchedulePostModal] = useState(false); // Renamed for clarity
  const [scheduledAt, setScheduledAt] = useState(null); // Stores the ISO string from the modal

  // State for viewing ALL scheduled posts

  // State for showing edit schedule modal
  const [isScheduledPostsModalOpen, setIsScheduledPostsModalOpen] = useState(false);
  const [isEditScheduledPostModalOpen, setIsEditScheduledPostModalOpen] = useState(false);
  const [postToEdit, setPostToEdit] = useState(null);

  // State for mention feature
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);

  const debouncedMentionSearchTerm = useDebounce(mentionQuery, 300);

  // Refs
  const postFileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const postInputRef = useRef(null);
  const suggestionBoxRef = useRef(null);

  // Hooks
  const { authUser } = useAuthUser();
  const { createPost, isPending, isError, error } = useCreatePosts();

  const isMobile = useIsMobile();

  // Empty dependency array means this runs once on mount and cleans up on unmount

  // Fetch mention suggestions using react-query
  const { suggestedUsers, isLoadingSuggestedUsers } = useSearchUsers(
    debouncedMentionSearchTerm
  );
  const { markFeedAsRead } = useMarkPostsAsRead();

  // Effect to adjust emoji picker width on resize
  useEffect(() => {
    const handleResize = () => {
      setEmojiPickerWidth(window.innerWidth < 640 ? 300 : 350);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Effect to close emoji picker on click outside
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

  // Effect to close mention suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showMentionSuggestions &&
        suggestionBoxRef.current &&
        !suggestionBoxRef.current.contains(event.target) &&
        postInputRef.current &&
        !postInputRef.current.contains(event.target)
      ) {
        setShowMentionSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMentionSuggestions]);

  // Effect to manage textarea height dynamically
  useEffect(() => {
    if (postInputRef.current) {
      postInputRef.current.style.height = "auto";
      postInputRef.current.style.height = postInputRef.current.scrollHeight + "px";
    }
  }, [postInput, showPollInputs]); // Also react to poll input visibility as it changes layout

  // Handlers

  const resetForm = useCallback(() => {
    setPostInput("");
    setPostSelectedFile(null);
    setPostPreviewImage(null);
    setShowPollInputs(false);
    setPollChoices([{ text: "" }, { text: "" }]);
    setScheduledAt(null);
    setShowEmojiPicker(false);
    setMentionQuery("");
    setShowMentionSuggestions(false);
    setMentionStartIndex(-1);
    if (postFileInputRef.current) {
      postFileInputRef.current.value = null;
    }
    if (postInputRef.current) {
      postInputRef.current.style.height = "auto";
    }
  }, []);

  const handleNewPostsButtonClick = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    queryClient.invalidateQueries({ queryKey: ["posts", "/api/posts/all"] });

    setShowNewFeedPostsButton(false);
    markFeedAsRead();
  }, [queryClient, setShowNewFeedPostsButton, markFeedAsRead]);

  const handlePaste = usePasteHandler({
    inputRef: postInputRef,
    input: postInput,
    setInput: setPostInput,
    setSelectedFile: setPostSelectedFile,
    setPreviewImage: setPostPreviewImage,
    postFileInputRef: postFileInputRef,
  });

  const handleTextChange = useCallback((e) => {
    const newText = e.target.value;
    setPostInput(newText);

    if (postInputRef.current) {
      postInputRef.current.style.height = "auto";
      postInputRef.current.style.height = postInputRef.current.scrollHeight + "px";
    }

    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = newText.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    // Logic for mention suggestions
    if (
      lastAtIndex !== -1 &&
      (lastAtIndex === 0 || /\s/.test(textBeforeCursor[lastAtIndex - 1])) // Ensures '@' is preceded by whitespace or start of string
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
  }, []);

  const handleMentionSelect = useCallback(
    (username) => {
      const currentText = postInput;
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

      setPostInput(newText);
      setMentionQuery("");
      setMentionStartIndex(-1);
      setShowMentionSuggestions(false);

      const newCursorPosition = startReplaceIndex + `@${username} `.length;
      setTimeout(() => {
        if (postInputRef.current) {
          postInputRef.current.focus();
          postInputRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
          postInputRef.current.style.height = "auto";
          postInputRef.current.style.height = postInputRef.current.scrollHeight + "px";
        }
      }, 0);
    },
    [postInput, mentionStartIndex]
  );

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      if (isPending) {
        return; // Do nothing if a post is already being created
      }

      if (showPollInputs) {
        const filledPollChoices = pollChoices.filter(
          (choice) => choice.text.trim() !== ""
        );

        if (postInput.trim() === "") {
          showAppToast("Polls should have a question/text.", "error");
          return;
        }

        if (pollChoices[0].text.trim() === "" || pollChoices[1].text.trim() === "") {
          showAppToast("At least the first two poll options must be filled.", "error");
          return;
        }

        if (
          filledPollChoices.some((choice) => choice.text.length > POLL_CHOICE_MAX_LENGTH)
        ) {
          showAppToast(
            `Poll options cannot exceed ${POLL_CHOICE_MAX_LENGTH} characters.`,
            "error"
          );
          return;
        }

        if (postSelectedFile) {
          showAppToast("You cannot post a poll with an image or video.", "error");
          return;
        }
        if (scheduledAt) {
          showAppToast("You cannot schedule a poll.", "error");
          return;
        }

        let postData = {
          text: postInput,
          pollOptions: filledPollChoices.map((c) => ({ text: c.text })),
        };

        createPost(postData, {
          onSuccess: resetForm,
          onError: (err) => {
            showAppToast(err?.message || "Failed to create post with poll.", "error");
          },
        });
        return;
      }

      // Regular post (text or media)
      if (postInput.trim() === "" && !postSelectedFile) {
        // showAppToastt(("Post must have text, an image, or a video.");
        return;
      }

      if (postSelectedFile && scheduledAt) {
        showAppToast("You cannot schedule a post with media.", "error");
        return;
      }

      let postData = { text:postInput };

      if (postSelectedFile) {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (postSelectedFile.type.startsWith("image/")) {
            postData.img = reader.result;
          } else if (postSelectedFile.type.startsWith("video/")) {
            postData.video = reader.result;
          }

          createPost(postData, {
            onSuccess: resetForm,
            onError: (err) => {
              showAppToast(err?.message || "Failed to create post with media.", "error");
            },
          });
        };
        reader.readAsDataURL(postSelectedFile);
      } else {
        if (scheduledAt) {
          postData.scheduledAt = scheduledAt;
        }

        createPost(postData, {
          onSuccess: resetForm,
          onError: (err) => {
            showAppToast(err?.message || "Failed to create post.", "error");
          },
        });
      }
    },
    [
      postInput,
      postSelectedFile,
      showPollInputs,
      pollChoices,
      scheduledAt,
      createPost,
      resetForm,
      isPending,
    ]
  );

  const handleFileChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
        showAppToast(
          "Unsupported file type. Please select an image or a video.",
          "error"
        );
        setPostSelectedFile(null);
        setPostPreviewImage(null);
        if (postFileInputRef.current) postFileInputRef.current.value = null;
        return;
      }

      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        showAppToast(`File size exceeds ${MAX_FILE_SIZE_MB}MB limit.`, "error");
        setPostSelectedFile(null);
        setPostPreviewImage(null);
        if (postFileInputRef.current) postFileInputRef.current.value = null;
        return;
      }

      setPostSelectedFile(file);
      setPostPreviewImage(URL.createObjectURL(file));

      // Reset conflicting states
      setShowPollInputs(false);
      setPollChoices([{ text: "" }, { text: "" }]);
      setShowMentionSuggestions(false);
      setScheduledAt(null); // Clear scheduledAt if media is selected
    } else {
      setPostSelectedFile(null);
      setPostPreviewImage(null);
    }
  }, []);

  const onEmojiClick = useCallback((emojiObject) => {
    setPostInput((prevText) => prevText + emojiObject.emoji);
    if (postInputRef.current) {
      postInputRef.current.focus();
      // Auto-adjust height after emoji insert
      postInputRef.current.style.height = "auto";
      postInputRef.current.style.height = postInputRef.current.scrollHeight + "px";
    }
  }, []);

  const handleKeyDown = (e) => {
    if (isMobile) {
      return;
    }
    if (e.key === "Enter") {
      if (!e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
      }
    }
  };

  const handleAddPollChoice = useCallback(() => {
    if (pollChoices.length < MAX_POLL_CHOICES) {
      setPollChoices([...pollChoices, { text: "" }]);
    }
  }, [pollChoices]);

  const handlePollChoiceChange = useCallback(
    (index, value) => {
      const newChoices = [...pollChoices];
      newChoices[index].text = value.slice(0, POLL_CHOICE_MAX_LENGTH);
      setPollChoices(newChoices);
    },
    [pollChoices]
  );

  const handleRemovePollChoice = useCallback(
    (indexToRemove) => {
      const newChoices = pollChoices.filter((_, i) => i !== indexToRemove);
      // Ensure at least two choices remain
      while (newChoices.length < 2) {
        newChoices.push({ text: "" });
      }
      setPollChoices(newChoices);
    },
    [pollChoices]
  );

  const handleRemovePoll = useCallback(() => {
    setShowPollInputs(false);
    setPollChoices([{ text: "" }, { text: "" }]);
    if (postInputRef.current) {
      postInputRef.current.style.height = "auto";
    }
  }, []);

  const handlePollIconClick = useCallback(() => {
    setShowPollInputs((prev) => !prev);
    if (!showPollInputs) {
      // If turning poll inputs ON, clear other conflicting states
      setPostSelectedFile(null);
      setPostPreviewImage(null);
      if (postFileInputRef.current) postFileInputRef.current.value = null;
      setScheduledAt(null);
      setPollChoices([{ text: "" }, { text: "" }]);
      setMentionQuery("");
      setShowMentionSuggestions(false);
      setMentionStartIndex(-1);
    }
  }, [showPollInputs]);

  const handlePollInputFocus = useCallback((index) => {
    setFocusedPollInputIndex(index);
  }, []);

  const handlePollInputBlur = useCallback(() => {
    setFocusedPollInputIndex(null);
  }, []);

  // Handlers for SchedulePostModal (for new posts)
  const handleOpenSchedulePostModal = useCallback(() => {
    setShowSchedulePostModal(true);
    // When opening schedule modal, clear other conflicting states
    setPostSelectedFile(null);
    setPostPreviewImage(null);
    if (postFileInputRef.current) postFileInputRef.current.value = null;
    setShowPollInputs(false);
    setPollChoices([{ text: "" }, { text: "" }]);
  }, []);

  const handleCloseSchedulePostModal = useCallback(() => {
    setShowSchedulePostModal(false);
  }, []);

  const handleScheduleConfirm = useCallback((isoDateTime) => {
    setScheduledAt(isoDateTime);
    setShowSchedulePostModal(false);
  }, []);

  const handleRemoveSchedule = useCallback(() => {
    setScheduledAt(null);
    setShowSchedulePostModal(false);
  }, []);

  const handleOpenScheduledPostsListModal = useCallback(() => {
    setIsScheduledPostsModalOpen(true); // Control the list modal
    setShowSchedulePostModal(false); // Close the new post schedule modal if open
    setIsEditScheduledPostModalOpen(false); // Ensure edit modal is closed
    setPostToEdit(null); // Clear any previously selected post for edit
  }, []);

  // This function closes the ScheduledPostsModal (the list)
  const handleCloseScheduledPostsListModal = useCallback(() => {
    setIsScheduledPostsModalOpen(false);
    setShowSchedulePostModal(true);
  }, []);

  // This function is called when a post item is clicked in ScheduledPostsModal
  const handlePostSelectedForEdit = (post) => {
    setIsScheduledPostsModalOpen(false); // Close the list modal
    setPostToEdit(post); // Set the post data
    setIsEditScheduledPostModalOpen(true); // Open the edit modal
  };

  // This function is called when EditScheduledPostModal is closed
  const handleCloseEditScheduledPostModal = () => {
    setIsEditScheduledPostModalOpen(false); // Close the edit modal
    setPostToEdit(null); // Clear the post data

    // Option 1: Go back to the list of scheduled posts
    setIsScheduledPostsModalOpen(true);
    // Option 2: Just close all modals and return to main CreatePost screen
    // setIsScheduledPostsModalOpen(false); // If you prefer this behavior
  };

  // Determine if the post button should be disabled
  const isButtonDisabled =
    isPending ||
    (() => {
      if (scheduledAt) {
        // Scheduled post requires text, and cannot have media or be a poll
        return postInput.trim() === "" || postSelectedFile !== null || showPollInputs;
      }
      if (showPollInputs) {
        // Poll requires postInput and at least two non-empty choices, and no choice exceeds max length
        return (
          postInput.trim() === "" ||
          pollChoices[0].text.trim() === "" ||
          pollChoices[1].text.trim() === "" ||
          pollChoices.some((choice) => choice.text.length > POLL_CHOICE_MAX_LENGTH)
        );
      }
      // Regular post requires text OR a selected file
      return postInput.trim() === "" && !postSelectedFile;
    })();

  return (
    <>
      <div
        className={` flex p-4 items-start gap-3 border-b border-accent relative ${
          scheduledAt ? "mt-2" : ""
        } `}
      >
        {scheduledAt && (
          <div
            className="flex items-center justify-between absolute top-0 left-[66px]"
            onClick={handleOpenSchedulePostModal}
          >
            <p className="text-slate-500 text-sm flex gap-3 items-center cursor-pointer hover:underline">
              <TbCalendarClock size={16} />
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
          </div>
        )}
        <Link to={`/profile/${authUser.username}`}>
          <div className={`avatar ${scheduledAt ? "mt-1" : ""}`}>
            <div className="w-10 rounded-full">
              <img src={authUser?.profileImg || "/avatar-placeholder.png"} />
            </div>
          </div>
        </Link>
        <form
          className={`flex flex-col w-full relative ${scheduledAt ? "mt-1" : ""}`}
          onSubmit={handleSubmit}
        >
          <div className="relative w-full">
            <textarea
              className="bg-inherit w-full p-0 pb-4 resize-none max-h-[270px] border-none focus:outline-none border-gray-800 text-xl relative overflow-y-auto"
              placeholder={
                scheduledAt
                  ? "What is happening?"
                  : showPollInputs
                  ? "Ask a question"
                  : "What is happening?"
              }
              value={postInput}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              ref={postInputRef}
              rows={2}
              style={{ minHeight: "28px" }}
            />
            {/* Mention Suggestions Popover */}
            {showMentionSuggestions && suggestedUsers?.length > 0 && !showPollInputs && (
              <div
                ref={suggestionBoxRef}
                className="absolute z-50 bg-base-100 border border-accent rounded-md shadow-lg max-h-60 overflow-y-auto w-full"
                style={{ top: postInputRef.current?.scrollHeight || 0, left: 0 }}
              >
                {isLoadingSuggestedUsers ? (
                  <p className="p-2 text-slate-400">Loading suggestions...</p>
                ) : suggestedUsers.length === 0 ? (
                  <p className="p-2 text-slate-500">No users found.</p>
                ) : (
                  suggestedUsers.map((user) => (
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
                        <p className="text-slate-500 text-sm">@{user.username}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {postPreviewImage && (
            <div className="relative max-w-full mx-auto sm:w-auto">
              <IoClose
                size={25}
                className="absolute -top-2 -right-2 text-white bg-slate-500 transition duration-200 hover:bg-gray-600 rounded-full p-1 cursor-pointer z-10"
                onClick={() => {
                  setPostSelectedFile(null);
                  setPostPreviewImage(null);
                  if (postFileInputRef.current) postFileInputRef.current.value = null;
                }}
              />
              {postSelectedFile.type.startsWith("image/") ? (
                <img
                  src={postPreviewImage}
                  className="w-full h-auto max-h-96 object-contain rounded"
                  alt="Image preview"
                />
              ) : (
                <video
                  controls
                  src={postPreviewImage}
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
                      } placeholder:text-slate-500 focus:outline-none focus:border-accent/99 rounded-[4px] `}
                      value={choice.text}
                      onChange={(e) => handlePollChoiceChange(index, e.target.value)}
                      onFocus={() => handlePollInputFocus(index)}
                      onBlur={handlePollInputBlur}
                      maxLength={POLL_CHOICE_MAX_LENGTH}
                    />

                    {focusedPollInputIndex === index && (
                      <span className="absolute top-1 right-2 text-xs text-slate-500">
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

          <div className="flex justify-between pt-3">
            <div className="flex gap-1 items-center">
              {/* Image/Video input - hidden if poll or schedule is active */}
              {!showPollInputs && !scheduledAt && (
                <BiImageAdd
                  className="text-primary w-6 h-6 cursor-pointer hover:text-primary/80"
                  onClick={() => postFileInputRef.current.click()}
                  title="Add image or video"
                  aria-label="Add image or video"
                />
              )}
              <input
                type="file"
                accept="image/*,video/*"
                hidden
                ref={postFileInputRef}
                onChange={handleFileChange}
              />

              {/* Poll icon - hidden if media or schedule is selected/previewed */}
              {!postSelectedFile && !scheduledAt && (
                <BiPoll
                  className="text-primary size-6 cursor-pointer hover:text-primary/80"
                  onClick={handlePollIconClick}
                  title="Add a poll"
                  aria-label="Add a poll"
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
                  title="Choose an emoji"
                  aria-label="Choose an emoji"
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
                      lazyLoadEmojis={true}
                    />
                  </div>
                )}
              </div>

              {/* Schedule NEW Post icon - hidden if media or poll is active */}
              {!postSelectedFile && !showPollInputs && (
                <TbCalendarClock
                  size={22}
                  className="text-primary cursor-pointer hover:text-primary/80"
                  onClick={handleOpenSchedulePostModal} // Changed to open SchedulePostModal
                  title="Schedule post"
                  aria-label="Schedule new post"
                />
              )}
            </div>
            <button
              type="submit"
              className=" px-4 py-2 bg-primary text-white rounded-full hover:bg-primary/80 transition duration-300 disabled:bg-slate-500 disabled:text-black font-bold disabled:cursor-default"
              disabled={isButtonDisabled}
            >
              {isPending ? "Posting..." : scheduledAt ? "Schedule" : "Post"}
            </button>
          </div>
          {isError && <div className="text-red-500 mt-2">{error.message}</div>}
        </form>

        {/* Schedule Post Modal (for NEW posts) */}
        <SchedulePostModal
          isOpen={showSchedulePostModal} // Changed state name
          onClose={handleCloseSchedulePostModal} // Changed handler name
          onScheduleConfirm={handleScheduleConfirm}
          initialDate={scheduledAt} // Pass current scheduledAt if editing
          openAllScheduledPosts={handleOpenScheduledPostsListModal}
          scheduledAt={scheduledAt}
          onRemoveSchedule={handleRemoveSchedule}
        />

        {/* Scheduled Posts List Modal (to view/manage ALL existing scheduled posts) */}
        <ScheduledPostsModal
          isOpen={isScheduledPostsModalOpen}
          onClose={handleCloseScheduledPostsListModal}
          onPostSelectedForEdit={handlePostSelectedForEdit} // Pass the new handler
        />

        {/* Render EditScheduledPostModal separately */}
        {postToEdit && ( // Only render if there's a post to edit
          <EditScheduledPostModal
            isOpen={isEditScheduledPostModalOpen}
            onClose={handleCloseEditScheduledPostModal}
            post={postToEdit}
          />
        )}
      </div>
      {newPostCount > 0 && (
        <div
          onClick={handleNewPostsButtonClick}
          className="py-3 hover:bg-gray-700/30 transition duration-500 border-b border-accent text-center text-primary cursor-pointer"
        >
          Show {newPostCount} post{newPostCount > 1 ? "s" : ""}
        </div>
      )}
    </>
  );
};
export default CreatePost;
