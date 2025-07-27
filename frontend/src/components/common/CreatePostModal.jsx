import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { IoClose, IoCloseSharp } from "react-icons/io5";
import { BiImageAdd, BiPoll } from "react-icons/bi";
import { PiSmiley } from "react-icons/pi";
import { TbCalendarClock } from "react-icons/tb";
import { FaPlus } from "react-icons/fa";
import EmojiPicker from "emoji-picker-react";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";
import EditScheduledPostModal from "./EditSchedulePostModal";
import ScheduledPostsModal from "./ScheduledPostsModal";
import SchedulePostModal from "./SchedulePostModal";
import { showAppToast } from "../../utils/showAppToast";
import { useDebounce } from "../../hooks/useDebounce";
import { useCreatePosts } from "../../hooks/postsHooks/useCreatePosts";
import { useSearchUsers } from "../../hooks/usersHooks/userSearchUsers";

const POLL_CHOICE_MAX_LENGTH = 25;
const MAX_POLL_CHOICES = 4;
const MAX_FILE_SIZE_MB = 20;

function CreatePostModal({ onClose }) {
  // State for post content
  const [text, setText] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

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
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const textareaRef = useRef(null);
  const suggestionBoxRef = useRef(null);
  const modalContentRef = useRef(null);

  // Hooks
  const { authUser } = useAuthUser();
  const { createPost, isPending, isError, error } = useCreatePosts();

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      // Define your breakpoint
      const mobileBreakpoint = 768; // px

      // Update state based on current window width
      setIsMobile(window.innerWidth <= mobileBreakpoint);
    };

    // Initial check when component mounts
    checkIsMobile();

    // Add event listener for window resize
    window.addEventListener("resize", checkIsMobile);

    // Clean up event listener when component unmounts
    return () => {
      window.removeEventListener("resize", checkIsMobile);
    };
  }, []); // Empty dependency array means this runs once on mount and cleans up on unmount

  // Fetch mention suggestions using react-query
  const { suggestedUsers, isLoadingSuggestedUsers } = useSearchUsers(
    debouncedMentionSearchTerm
  );

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

  // Effect to manage textarea height dynamically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [text, showPollInputs]); // Also react to poll input visibility as it changes layout

  // Handlers

  const resetForm = useCallback(() => {
    setText("");
    setSelectedFile(null);
    setPreviewUrl(null);
    setShowPollInputs(false);
    setPollChoices([{ text: "" }, { text: "" }]);
    setScheduledAt(null);
    setShowEmojiPicker(false);
    setMentionQuery("");
    setShowMentionSuggestions(false);
    setMentionStartIndex(-1);
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
    }
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, []);

  const handlePaste = useCallback(
    (e) => {
      e.preventDefault();

      const items = e.clipboardData.items;
      let imagePasted = false;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();

          if (file) {
            if (!file.type.startsWith("image/")) {
              showAppToast("Pasted content is not a supported image type.", "error");
              return;
            }
            if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
              showAppToast(
                `Pasted image size exceeds ${MAX_FILE_SIZE_MB}MB limit.`,
                "error"
              );
              return;
            }

            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));

            // Reset conflicting states
            setShowPollInputs(false);
            setPollChoices([{ text: "" }, { text: "" }]);
            setShowMentionSuggestions(false);
            setScheduledAt(null); // Clear scheduled post if media is pasted
            imagePasted = true;
            break; // Exit loop after finding the first image
          }
        }
      }

      if (!imagePasted) {
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
      }
    },
    [text]
  );

  const handleTextChange = useCallback((e) => {
    const newText = e.target.value;
    setText(newText);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
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
    },
    [text, mentionStartIndex]
  );

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      onClose();
      if (isPending) {
        return; // Do nothing if a post is already being created
      }

      if (showPollInputs) {
        const filledPollChoices = pollChoices.filter(
          (choice) => choice.text.trim() !== ""
        );

        if (text.trim() === "") {
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

        if (selectedFile) {
          showAppToast("You cannot post a poll with an image or video.", "error");
          return;
        }
        if (scheduledAt) {
          showAppToast("You cannot schedule a poll.", "error");
          return;
        }

        let postData = {
          text,
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
      if (text.trim() === "" && !selectedFile) {
        // showAppToastt(("Post must have text, an image, or a video.");
        return;
      }

      if (selectedFile && scheduledAt) {
        showAppToast("You cannot schedule a post with media.", "error");
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
            onSuccess: resetForm,
            onError: (err) => {
              showAppToast(err?.message || "Failed to create post with media.", "error");
            },
          });
        };
        reader.readAsDataURL(selectedFile);
      } else {
        if (scheduledAt) {
          postData.scheduledAt = scheduledAt;
        }

        createPost(postData, {
          onSuccess: () => {
            resetForm();
          },
          onError: (err) => {
            showAppToast(err?.message || "Failed to create post.", "error");
          },
        });
      }
    },
    [
      text,
      selectedFile,
      showPollInputs,
      pollChoices,
      scheduledAt,
      createPost,
      resetForm,
      isPending,
      onClose,
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
        setSelectedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = null;
        return;
      }

      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        showAppToast(`File size exceeds ${MAX_FILE_SIZE_MB}MB limit.`, "error");
        setSelectedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = null;
        return;
      }

      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));

      // Reset conflicting states
      setShowPollInputs(false);
      setPollChoices([{ text: "" }, { text: "" }]);
      setShowMentionSuggestions(false);
      setScheduledAt(null); // Clear scheduledAt if media is selected
    } else {
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  }, []);

  const onEmojiClick = useCallback((emojiObject) => {
    setText((prevText) => prevText + emojiObject.emoji);
    if (textareaRef.current) {
      textareaRef.current.focus();
      // Auto-adjust height after emoji insert
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
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
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, []);

  const handlePollIconClick = useCallback(() => {
    setShowPollInputs((prev) => !prev);
    if (!showPollInputs) {
      // If turning poll inputs ON, clear other conflicting states
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = null;
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
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = null;
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

    const handleBackgroundClick = (e) => {
        e.stopPropagation()
      if (modalContentRef.current && !modalContentRef.current.contains(e.target)) {
        onClose();
      }
    };
  // Determine if the post button should be disabled
  const isButtonDisabled =
    isPending ||
    (() => {
      if (scheduledAt) {
        // Scheduled post requires text, and cannot have media or be a poll
        return text.trim() === "" || selectedFile !== null || showPollInputs;
      }
      if (showPollInputs) {
        // Poll requires text and at least two non-empty choices, and no choice exceeds max length
        return (
          text.trim() === "" ||
          pollChoices[0].text.trim() === "" ||
          pollChoices[1].text.trim() === "" ||
          pollChoices.some((choice) => choice.text.length > POLL_CHOICE_MAX_LENGTH)
        );
      }
      // Regular post requires text OR a selected file
      return text.trim() === "" && !selectedFile;
    })();

  // Prevent scrolling the body when the modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  return (
    <div
      className="fixed inset-0 bg-gray-700 bg-opacity-70 justify-center z-50 p-4"
        onClick={handleBackgroundClick}
    >
      <div
      onClick={e => e.stopPropagation()}
        ref={modalContentRef}
        className={`bg-base-100 rounded-2xl shadow-lg mt-7 pl-3 pr-7 max-w-xl mx-auto w-full flex flex-col overflow-hidden max-h-[90vh]`}
      >
        <div className="flex items-center justify-between py-2">
          <div className="flex gap-5 items-center">
            <button
              className="hover:bg-secondary rounded-full p-1 transition duration-200"
              onClick={onClose}
            >
              <IoClose strokeWidth={1} size={24} className="" />
            </button>
            <h2 className="text-xl font-bold">Create Post</h2>{" "}
          </div>
        </div>

        <div className="flex-1 flex flex-col p-4 overflow-y-auto custom-scrollbar">
          {/* Avatar and Textarea */}
          <div className="flex items-start gap-3 flex-grow">
            <Link to={`/profile/${authUser.username}`}>
              <div className={`avatar ${scheduledAt ? "mt-1" : ""}`}>
                <div className="size-10 rounded-full">
                  <img src={authUser?.profileImg || "/avatar-placeholder.png"} />
                </div>
              </div>
            </Link>
            <div className={`flex w-full relative ${scheduledAt ? "mt-1" : ""}`}>
              <div className="relative w-full">
                {scheduledAt && (
                  <div
                    className="flex items-center justify-between absolute -top-4 -left-0.5 "
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
                <textarea
                  className="bg-inherit w-full max-h-[2600px] p-0 pb-2 resize-none border-none focus:outline-none text-xl overflow-y-auto"
                  placeholder={showPollInputs ? "Ask a question" : "What is happening?"}
                  value={text}
                  onChange={handleTextChange}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  ref={textareaRef}
                  rows={4}
                />
                {/* Mention Suggestions Popover */}
                {showMentionSuggestions &&
                  suggestedUsers?.length > 0 &&
                  !showPollInputs && (
                    <div
                      ref={suggestionBoxRef}
                      className="absolute z-50 bg-base-100 border border-accent rounded-md shadow-lg max-h-60 overflow-y-auto w-full"
                      style={{ top: textareaRef.current?.scrollHeight || 0, left: 0 }}
                    >
                      {isLoadingSuggestedUsers ? (
                        <p className="p-2 text-gray-400">Loading suggestions...</p>
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
                {previewUrl && (
                  <div className="relative max-w-full mx-auto sm:w-auto">
                    <IoClose
                      size={25}
                      className="absolute -top-2 -right-2 text-white bg-slate-500 transition duration-200 hover:bg-slate-600 rounded-full p-1 cursor-pointer z-10"
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
                            onChange={(e) =>
                              handlePollChoiceChange(index, e.target.value)
                            }
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
              </div>
              {isError && <div className="text-red-500 mt-2">{error.message}</div>}
            </div>
          </div>
          <div className="flex justify-between pt-3 relative">
            <div className="flex gap-1 items-center ml-[52px]">
              {/* Image/Video input - hidden if poll or schedule is active */}
              {!showPollInputs && !scheduledAt && (
                <BiImageAdd
                  className="text-primary w-6 h-6 cursor-pointer hover:text-primary/80"
                  onClick={() => fileInputRef.current.click()}
                  title="Add image or video"
                  aria-label="Add image or video"
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
              </div>

              {/* Schedule NEW Post icon - hidden if media or poll is active */}
              {!selectedFile && !showPollInputs && (
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
              onClick={handleSubmit}
              className="px-4 py-2 md:px-4 md:py-2 bg-primary text-white rounded-full hover:bg-primary/80 transition duration-300 disabled:bg-slate-500 disabled:text-black font-bold disabled:cursor-default"
              disabled={isButtonDisabled}
            >
              {isPending ? "Posting..." : scheduledAt ? "Schedule" : "Post"}
            </button>
          </div>
          {showEmojiPicker && (
            <div className="absolute" ref={emojiPickerRef}>
              <EmojiPicker
                onEmojiClick={onEmojiClick}
                theme="dark"
                width={emojiPickerWidth}
                lazyLoadEmojis={true}
              />
            </div>
          )}
          {/* Schedule Post Modal (for NEW posts) */}
        </div>
      </div>
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
  );
}

export default CreatePostModal;
