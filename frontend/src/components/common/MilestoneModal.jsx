// src/components/ui/MilestoneModal.jsx

import useLockBodyScroll from "../../hooks/customHooks/useLockBodyScroll"
import { useCreatePosts } from "../../hooks/postsHooks/useCreatePosts"

const MilestoneModal = ({ level, onClose, username, isOpen }) => {
  const { createPost, isPending: isPosting } = useCreatePosts()

  useLockBodyScroll(isOpen)

  const handleShare = () => {
    const postContent = `test2`
    createPost({ text: postContent })
    onClose() 
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-lg bg-gray-800 p-6 text-center text-white shadow-xl">
        <h3 className="text-2xl font-bold text-primary">Level Up! 🎉</h3>
        <p className="mt-2 text-lg font-semibold">
          You've reached <span className="text-primary">Level {level}</span>!
        </p>
        <p className="mt-4 text-sm text-gray-300">
          Want to share your achievement with your followers?
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <button
            onClick={handleShare}
            disabled={isPosting}
            className="rounded-full bg-primary px-4 py-2 text-white"
          >
            {isPosting ? "Posting..." : "Share Now"}
          </button>
          <button onClick={onClose} disabled={isPosting} className="px-4 py-2">
            Not Now
          </button>
        </div>
      </div>
    </div>
  )
}

export default MilestoneModal
