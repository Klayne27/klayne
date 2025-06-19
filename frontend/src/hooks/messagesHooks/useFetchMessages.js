import { useQuery } from "@tanstack/react-query";
import { fetchMessagesApi } from "../../api/messagesApi";

export const useFetchMessages = (selectedConversation) => {
  const {
    data: messages,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["messages", selectedConversation?._id],
    queryFn: () => fetchMessagesApi(selectedConversation?._id),
  });

  return { messages, isLoading, error };
};
