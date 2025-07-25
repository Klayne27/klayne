import { useMutation, useQueryClient } from "@tanstack/react-query";
import { voteOnPollApi } from "../../api/postsApi";
import { showAppToast } from "../../utils/showAppToast";

export const useVoteOnPoll = ({ setUserVotedOptionId }) => {
  const queryClient = useQueryClient();

  const { mutate: voteOnPoll, isPending: isVoting } = useMutation({
    mutationFn: voteOnPollApi,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["post"] });
      setUserVotedOptionId(variables.optionId);
    },
    onError: (error) => {
      showAppToast(error.message || "Failed to cast vote.", "error");
    },
  });

  return { voteOnPoll, isVoting };
};
