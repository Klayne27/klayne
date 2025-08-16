// src/components/common/MilestoneModal.jsx

import useLockBodyScroll from "../../hooks/customHooks/useLockBodyScroll"
import { useCreatePosts } from "../../hooks/postsHooks/useCreatePosts"
import { FaTrophy } from "react-icons/fa6"

// Map to store specific milestone messages
const MILESTONE_MESSAGES = new Map([
  [
    10,
    `🎉 I just hit Level 10 in my study journey! The momentum is building! Start your own session: https://x-ayne.onrender.com/pomodoro`,
  ],
  [
    20,
    `🚀 Unlocked Level 20! Feeling a new surge of focus and determination. Let's go! https://x-ayne.onrender.com/pomodoro`,
  ],
  [
    30,
    `✨ Reached Level 30! It's amazing to see how much progress I've made. Join me: https://x-ayne.onrender.com/pomodoro`,
  ],
  [
    40,
    `Level 40 achieved! 🥳 This journey is getting more rewarding every day. Study with me: https://x-ayne.onrender.com/pomodoro`,
  ],
  [
    50,
    `🔥 Halfway to the century mark! Just hit Level 50 and I'm not slowing down. Get focused: https://x-ayne.onrender.com/pomodoro`,
  ],
  [
    60,
    `💡 Pushing through to Level 60! Finding my stride and loving the process. Let's study: https://x-ayne.onrender.com/pomodoro`,
  ],
  [
    70,
    `🌟 A new personal best at Level 70! Keep going, keep growing. Join the challenge: https://x-ayne.onrender.com/pomodoro`,
  ],
  [
    80,
    `✅ On my way to greatness! Proud to have reached Level 80. Start your timer: https://x-ayne.onrender.com/pomodoro`,
  ],
  [
    90,
    `Almost there! 💯 Just hit Level 90, the final push is on! One more step: https://x-ayne.onrender.com/pomodoro`,
  ],
])

// Function to generate dynamic post content
const getPostContent = (level) => {
  // Check if the level is divisible by 10 and if a specific message exists
  if (level % 10 === 0 && MILESTONE_MESSAGES.has(level)) {
    return MILESTONE_MESSAGES.get(level)
  } else {
    // This is the dynamic default message for all other milestones
    return `🏆 Another milestone achieved! Just hit Level ${level} in my study journey. Onwards and upwards: https://x-ayne.onrender.com/pomodoro`
  }
}

const MilestoneModal = ({ level, onClose, isOpen }) => {
  const { createPost, isPending: isPosting } = useCreatePosts()

  useLockBodyScroll(isOpen)

  const handleShare = () => {
    const postContent = getPostContent(level)
    createPost(
      { text: postContent },
      {
        onSuccess: () => {
          onClose()
        },
      },
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
      onClick={onClose} // Allow closing by clicking the backdrop
    >
      <div
        className="animate-fade-in-up relative w-full max-w-md rounded-2xl border border-primary/50 bg-slate-800 p-8 text-center text-white shadow-2xl shadow-primary/20"
        onClick={(e) => e.stopPropagation()} // Prevent modal from closing when clicking inside it
      >
        {/* Decorative Gradient Blurs */}
        <div className="absolute -bottom-12 -right-12 -z-10 h-32 w-32 rounded-full bg-primary/20 blur-3xl"></div>
        <div className="absolute -left-12 -top-12 -z-10 h-32 w-32 rounded-full bg-teal-400/20 blur-3xl"></div>

        {/* Icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/20 ring-4 ring-primary/30">
          <FaTrophy className="text-4xl text-yellow-300" />
        </div>

        {/* Content */}
        <h2 className="mt-6 text-3xl font-bold">Milestone Reached!</h2>
        <p className="mt-2 text-lg text-slate-300">
          Incredible work! You've just hit{" "}
          <span className="font-bold text-primary">Level {level}</span>.
        </p>
        <p className="mt-4 text-slate-400">Share your achievement with the community!</p>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={handleShare}
            disabled={isPosting}
            className="btn btn-primary rounded-full"
          >
            {isPosting ? (
              <>
                <span className="loading loading-spinner"></span>
                Sharing...
              </>
            ) : (
              "Share Achievement"
            )}
          </button>
          <button onClick={onClose} disabled={isPosting} className="btn btn-ghost rounded-full">
            No thanks
          </button>
        </div>
      </div>
    </div>
  )
}

export default MilestoneModal
