import { CiImageOn } from "react-icons/ci";
import { useRef, useState } from "react";
import { IoCloseSharp } from "react-icons/io5";
import { PiSmiley } from "react-icons/pi";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";
import { useCreatePosts } from "../../hooks/postsHooks/useCreatePosts";
import { Link } from "react-router-dom";

import EmojiPicker from "emoji-picker-react";
import { useEffect } from "react";

const CreatePost = () => {
  const [text, setText] = useState("");
  const [img, setImg] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPickerWidth, setEmojiPickerWidth] = useState(150);

  const { authUser } = useAuthUser();

  const imgRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const textareaRef = useRef(null);
  const formRef = useRef(null)

  const { createPost, isPending, isError, error } = useCreatePosts(text, img);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim() === "" && !img) {
      return;
    }
    createPost(
      { text, img },
      {
        onSuccess: () => {
          setText("");
          setImg(null);
        },
      }
    );
  };

  const handleImgChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImg(reader.result);
      };
      reader.readAsDataURL(file);
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

  const isButtonDisabled = (text.trim() === "" && !img) || isPending;

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
    <div className="flex p-4 items-start gap-3 border-b border-gray-700  mt-12">
      <Link to={`/profile/${authUser.username}`}>
        <div className="avatar">
          <div className="w-10 rounded-full">
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
        {img && (
          <div className="relative max-w-full mx-auto sm:w-72">
            <IoCloseSharp
              className="absolute top-0 right-0 text-white bg-gray-800 rounded-full w-5 h-5 cursor-pointer"
              onClick={() => {
                setImg(null);
                imgRef.current.value = null;
              }}
            />
            <img src={img} className="w-full mx-auto h-72 object-contain rounded" />
          </div>
        )}

        <div className="flex justify-between pt-3">
          <div className="flex gap-1 items-center">
            <CiImageOn
              className="fill-primary w-6 h-6 cursor-pointer "
              onClick={() => imgRef.current.click()}
            />
            <div className="relative">
              <PiSmiley
                ref={emojiButtonRef}
                className="fill-primary w-6 h-6 cursor-pointer hidden md:block"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              />
              {showEmojiPicker && (
                <div
                  className="absolute z-10 mt-2 top-full -left-28 md:left-0  md:translate-x-0 "
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
            accept="image/*"
            hidden
            ref={imgRef}
            onChange={handleImgChange}
          />
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-white rounded-full hover:bg-[#1d9cf0d8] transition duration-300 disabled:bg-gray-500 disabled:text-black font-bold disabled:cursor-default"
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
