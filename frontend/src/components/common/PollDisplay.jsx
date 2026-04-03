import { useAuthUser } from "../../features/auth/authHooks/useAuthUser"
import { useVoteOnPoll } from "../../features/posts/postsHooks/usePostsMutations"

const PollDisplay = ({ post }) => {
  const { authUser } = useAuthUser()
  const { voteOnPoll, isVoting } = useVoteOnPoll()

  const userVotedOption = post.pollOptions.find((option) => option.voters.includes(authUser?._id))
  const userVotedOptionId = userVotedOption?._id || null

  const handleVote = (optionId) => {
    voteOnPoll({ postId: post._id, optionId })
  }

  if (!post.pollOptions || post.pollOptions.length === 0) {
    return null
  }

  const hasVoted = userVotedOptionId !== null
  const isOwner = authUser && post.user._id === authUser._id

  return (
    <div className="mt-2">
      <div className="flex flex-col gap-1">
        {post.pollOptions.map((option) => {
          const votesForOption = option.voters.length
          const percentage =
            post.pollTotalVotes > 0 ? (votesForOption / post.pollTotalVotes) * 100 : 0
          const isUserVote = userVotedOptionId === option._id

          return (
            <div
              key={option._id}
              className={`relative rounded-full border-primary px-4 py-1.5 transition-all duration-200 ${
                hasVoted || isOwner
                  ? ""
                  : "cursor-pointer border hover:bg-primary hover:bg-opacity-25"
              } ${isUserVote ? "border-primary" : ""} ${isVoting ? "pointer-events-none opacity-50" : ""} `}
              onClick={(e) => {
                e.stopPropagation()
                if (!isVoting && !hasVoted && !isOwner) {
                  handleVote(option._id)
                }
              }}
            >
              {(hasVoted || isOwner) && (
                <div
                  className={`absolute left-0 top-0 h-full rounded-md ${isUserVote ? "bg-primary/50" : "bg-gray-700/50"} `}
                  style={{ width: `${percentage ? percentage : 2}%` }}
                ></div>
              )}
              <div className="-z-1 relative flex items-center justify-between">
                <span>{option.text}</span>
                {(hasVoted || isOwner) && (
                  <span className="text-sm">
                    {percentage.toFixed(1)}% ({votesForOption})
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {(hasVoted || isOwner) && (
        <p className="mt-4 text-sm text-gray-400">{post.pollTotalVotes} votes</p>
      )}
      {!hasVoted && !isOwner && <p className="mt-4 text-sm text-gray-400">Vote to see results.</p>}
    </div>
  )
}

export default PollDisplay



