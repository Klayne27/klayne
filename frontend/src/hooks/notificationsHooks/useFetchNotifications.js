// frontend/src/hooks/notificationsHooks/useFetchNotifications.js

import { useQuery, useQueryClient } from "@tanstack/react-query"; // Import useQueryClient
import { fetchNotificationsApi } from "../../api/notificationsApi";
import { useSocket } from "../../context/SocketContext";
import toast from "react-hot-toast";
import { useEffect } from "react"; // Import useEffect

export const useFetchNotifications = () => {
  const { socket, setHasUnreadNotifications } = useSocket();
  const queryClient = useQueryClient(); // Initialize useQueryClient

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotificationsApi,
    onSuccess: () => {
      // This runs when the initial fetch or a refetch successfully completes.
      // It's a good place to tell the backend to mark them read for consistency across tabs.
      if (socket) {
        // Emit an event to the backend to mark notifications as read.
        // This will trigger emitUnreadNotificationStatus on the backend, updating other clients.
        socket.emit("markNotificationsAsRead");
      }
      // Optimistically set the client-side unread status to false.
      setHasUnreadNotifications(false);
    },
    onError: (err) => {
      toast.error(err.message);
    },
    retry: false,
    // staleTime: Infinity
    // cacheTime: Infinity,
    refetchOnWindowFocus: true, // Good for ensuring fresh data if user switches tabs
    refetchOnMount: true, // Good for ensuring fresh data when component mounts
  });

  // --- NEW ADDITION: Listen for real-time new notifications ---
  useEffect(() => {
    if (socket) {
      const handleNewNotification = (newNotification) => {
        console.log("Received newNotification from socket:", newNotification);
        // Optimistically add the new notification to the existing cache data
        queryClient.setQueryData(["notifications"], (oldNotifications) => {
          if (!oldNotifications) return [newNotification];
          // Prepend the new notification to the array so it appears at the top
          return [newNotification, ...oldNotifications];
        });
        // Show a toast notification to the user
        toast.info("New notification!");
        // Update the global unread notifications state to true, to show the badge
        setHasUnreadNotifications(true);
      };

      // Register the event listener
      socket.on("newNotification", handleNewNotification);

      // Clean up the event listener when the component unmounts or socket changes
      return () => {
        socket.off("newNotification", handleNewNotification);
      };
    }
  }, [socket, queryClient, setHasUnreadNotifications]); // Add queryClient and setHasUnreadNotifications to dependencies

  return { notifications, isLoading };
};

// Keep your fetchNotificationsApi here.
// Note: You have fetchNotificationsApi defined twice in your provided code snippet.
// Make sure it's only defined once in your actual file, typically below the hook.

