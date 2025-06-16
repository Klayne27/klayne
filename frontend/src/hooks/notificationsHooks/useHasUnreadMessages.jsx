import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { fetchHasUnreadMessages } from "../../api/notificationsApi";
import { useSocket } from "../../context/SocketContext";


export const useHasUnreadMessages = () => {
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  const {
    data: hasUnread,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["hasUnreadMessages"],
    queryFn: fetchHasUnreadMessages,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (socket) {
      const handleNewMessage = (newMessage) => {
        // Invalidate the query to refetch the status
        queryClient.invalidateQueries(["hasUnreadMessages"]);
      };

      const handleMessagesSeen = ({ conversationId, readerId }) => {
        // Invalidate when messages are seen, as it affects the unread status
        queryClient.invalidateQueries(["hasUnreadMessages"]);
      };

      socket.on("newMessage", handleNewMessage);
      socket.on("messagesSeen", handleMessagesSeen);

      return () => {
        socket.off("newMessage", handleNewMessage);
        socket.off("messagesSeen", handleMessagesSeen);
      };
    }
  }, [socket, queryClient]);

  return { hasUnreadMessages: hasUnread || false, isLoading, isError, error };
};
