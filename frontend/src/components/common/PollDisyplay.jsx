// src/components/common/posts/PollDisplay.jsx
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { voteOnPollApi } from "../../api/postsApi";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";

// Assume your API client has a function to send votes
// e.g., import { voteOnPollApi } from "../../../api/postsApi"; // You'll need to create this

const PollDisplay = ({ post }) => {
  const { authUser } = useAuthUser();
  const queryClient = useQueryClient();
  const [userVotedOptionId, setUserVotedOptionId] = useState(null);

  // Check if the current user has already voted on this poll
  useEffect(() => {
    if (post.pollOptions && authUser) {
      for (const option of post.pollOptions) {
        if (option.voters.includes(authUser._id)) {
          setUserVotedOptionId(option._id); // Assuming each option has an _id from Mongoose
          break;
        }
      }
    }
  }, [post.pollOptions, authUser]);

  const { mutate: voteOnPoll, isPending: isVoting } = useMutation({
    mutationFn: voteOnPollApi,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["post"] });
      setUserVotedOptionId(variables.optionId);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to cast vote.");
    },
  });

  const handleVote = (optionId) => {
    if (!authUser) {
      toast.error("You must be logged in to vote.");
      return;
    }
    if (userVotedOptionId) {
      toast.info("You have already voted on this poll.");
      return;
    }
    voteOnPoll({ postId: post._id, optionId });
  };

  if (!post.pollOptions || post.pollOptions.length === 0) {
    return null;
  }

  const hasVoted = userVotedOptionId !== null;
  const isOwner = authUser && post.user._id === authUser._id; // Assuming post.user is populated

  return (
    <div className="mt-2">
      <div className="flex flex-col gap-1">
        {post.pollOptions.map((option) => {
          const votesForOption = option.voters.length;
          const percentage =
            post.pollTotalVotes > 0 ? (votesForOption / post.pollTotalVotes) * 100 : 0;
          const isUserVote = userVotedOptionId === option._id;

          return (
            <div
              key={option._id}
              className={`relative rounded-full border-primary px-4 py-1.5 cursor-pointer transition-all duration-200
                          ${
                            hasVoted || isOwner
                              ? ""
                              : "hover:bg-primary hover:bg-opacity-25 border"
                          }
                          ${isUserVote ? "border-primary" : ""}
                          `}
              onClick={(e) => {
                e.stopPropagation()
                !hasVoted && !isOwner && handleVote(option._id)
              }}
            >
              {(hasVoted || isOwner) && (
                <div
                  className={`absolute top-0 left-0 h-full rounded-md
                              ${isUserVote ? "bg-primary/50" : "bg-gray-700/50"}
                              `}
                  style={{ width: `${percentage ? percentage : 2}%` }}
                ></div>
              )}
              <div className="relative flex justify-between items-center -z-1">
                <span>{option.text}</span>
                {(hasVoted || isOwner) && (
                  <span className="text-sm">
                    {percentage.toFixed(1)}% ({votesForOption})
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {(hasVoted || isOwner) && (
        <p className="text-gray-400 text-sm mt-4">
          {post.pollTotalVotes} votes
        </p>
      )}
      {!hasVoted && !isOwner && (
        <p className="text-gray-400 text-sm mt-4">Vote to see results.</p>
      )}
    </div>
  );
};

export default PollDisplay;
