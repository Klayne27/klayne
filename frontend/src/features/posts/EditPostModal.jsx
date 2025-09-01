// src/components/EditPostModal.jsx

import React, { useState, useEffect } from "react"
import { IoClose } from "react-icons/io5"
import { useEditPost } from "./postsHooks/useEditPost"

// This is a simplified version. You will need to import and adapt your full modal logic.
// The key is to conditionally render based on the 'isEditing' prop.
const EditPostModal = ({ isOpen, onClose, post }) => {
  const [postInput, setPostInput] = useState("")

  // Get the editPost mutation from the hook
  const { editPost, isEditingPost } = useEditPost()

  useEffect(() => {
    if (isOpen && post) {
      setPostInput(post.text)
    }
  }, [isOpen, post])

  const handleEditSubmit = (e) => {
    e.preventDefault()
    if (!postInput.trim()) return

    editPost(
      { postId: post._id, postData: { text: postInput } },
      {
        onSuccess: () => {
          onClose()
        },
      },
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-700/70 p-4">
      <div className="mx-auto flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-base-100 p-4 shadow-lg" onClick={e=> e.stopPropagation()}>
        <div className="flex items-center justify-between py-2">
          <h2 className="text-xl font-bold">Edit Post</h2>
          <button onClick={onClose}>
            <IoClose size={24} />
          </button>
        </div>
        <form onSubmit={handleEditSubmit} className="flex flex-1 flex-col gap-4">
          <textarea
            value={postInput}
            onChange={(e) => setPostInput(e.target.value)}
            className="w-full resize-none border-none bg-inherit text-xl focus:outline-none"
            rows={5}
          />
          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-full bg-primary px-4 py-2 font-bold text-white transition duration-300 hover:bg-primary/80 disabled:cursor-default disabled:bg-slate-500"
            //   disabled={!postInput.trim()}
            >
              {isEditingPost ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditPostModal
