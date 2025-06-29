import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchNotificationsApi } from "../../api/notificationsApi";
import { useSocket } from "../../context/SocketContext";
import toast from "react-hot-toast";
import { useEffect } from "react";

export const useFetchNotifications = () => {
  const { socket, setHasUnreadNotifications } = useSocket();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotificationsApi,
    onSuccess: () => {
      if (socket) {
        socket.emit("markNotificationsAsRead");
      }
      setHasUnreadNotifications(false);
    },
    onError: (err) => {
      toast.error(err.message);
    },
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  useEffect(() => {
    if (socket) {
      const handleNewNotification = (newNotification) => {
        queryClient.setQueryData(["notifications"], (oldNotifications) => {
          if (!oldNotifications) return [newNotification];
          return [newNotification, ...oldNotifications];
        });
        toast.info("New notification!");
        setHasUnreadNotifications(true);
      };

      socket.on("newNotification", handleNewNotification);

      return () => {
        socket.off("newNotification", handleNewNotification);
      };
    }
  }, [socket, queryClient, setHasUnreadNotifications]);

  return { notifications, isLoading };
};

///// Seems unnecessary but we'll see

// // hooks/queries/useFetchNotifications.js
// import { useQuery, useQueryClient } from "@tanstack/react-query";
// import { fetchNotificationsApi } from "../../api/notificationsApi";
// import { useSocket } from "../../context/SocketContext";
// import toast from "react-hot-toast";
// import { useEffect } from "react";

// // Assuming you have access to the current user's blocked list.
// // This might come from a user context, or a separate query for the current user's profile.
// // For now, let's assume `getCurrentUserBlockedStatus` is available or passed down.
// // In a real app, you'd likely fetch the current user's profile which includes blockedUsers.
// // For demonstration, let's mock it or assume it's available.
// // A more robust solution might pass it from a UserContext or fetch it within this hook if needed.
// // For simplicity, we'll assume we can check against a `currentUserId` and a `blockedUsersList`
// // that's available in your application's global state or context.

// // Placeholder for checking if a user is blocked by the current user or vice-versa.
// // In a real app, you'd want to pass current user's blocked lists or similar.
// // For now, this function needs to be populated with actual logic,
// // or ensure your `queryClient.setQueryData` logic for new notifications
// // is robust enough if the backend already guarantees filtering.
// const isUserBlockedByMeOrBlockedMe = (currentUserId, targetUserId, currentUserBlockedList, currentUserBlockedByList) => {
//   if (!currentUserId || !targetUserId || !currentUserBlockedList || !currentUserBlockedByList) return false;
//   if (currentUserId.toString() === targetUserId.toString()) return false;

//   const targetIdString = targetUserId.toString();
//   const currentIdString = currentUserId.toString();

//   const isBlocked = currentUserBlockedList.includes(targetIdString);
//   const isBlockedBy = currentUserBlockedByList.includes(targetIdString); // Or checking if target's blockedBy includes currentUserId
//                                                                        // (This would require fetching target user's blockedBy list too, usually not needed for this client-side check)

//   // Simplified: just check if the 'from' user is in the current user's blockedUsers list
//   // The backend already handles mutual blocking for new notification creation.
//   return isBlocked;
// };


// export const useFetchNotifications = () => {
//   const { socket, setHasUnreadNotifications } = useSocket();
//   const queryClient = useQueryClient();

//   // You'll likely need to fetch the current user's profile or blocked lists here
//   // or pass them as props/context from higher up the component tree
//   // For example:
//   // const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: fetchCurrentUserProfileApi });
//   // const currentUserId = currentUser?._id;
//   // const currentUserBlockedUsers = currentUser?.blockedUsers?.map(id => id.toString()) || [];
//   // const currentUserBlockedBy = currentUser?.blockedBy?.map(id => id.toString()) || []; // If your user object contains this

//   // For this example, let's assume we have access to the current user ID and their blocked list
//   // from a context or prop. For the code to run, you might mock these or replace with actual
//   // global state retrieval (e.g., from an AuthContext).
//   // FOR THE SAKE OF THIS EXAMPLE, I'LL ADD PLACEHOLDER VARIABLES.
//   // YOU'LL NEED TO REPLACE THESE WITH YOUR ACTUAL METHOD OF GETTING CURRENT USER DATA.
//   const currentUserId = "YOUR_CURRENT_USER_ID_HERE"; // <<<<<<<<< REPLACE THIS
//   const currentUserBlockedUsers = []; // <<<<<<<<< REPLACE THIS WITH YOUR CURRENT USER'S BLOCKED USERS ARRAY (array of strings)
//   const currentUserBlockedBy = []; // <<<<<<<<< REPLACE THIS WITH YOUR CURRENT USER'S BLOCKED BY ARRAY (array of strings)
//   // ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^


//   const { data: notifications, isLoading } = useQuery({
//     queryKey: ["notifications"],
//     queryFn: fetchNotificationsApi,
//     onSuccess: () => {
//       if (socket) {
//         socket.emit("markNotificationsAsRead");
//       }
//       setHasUnreadNotifications(false);
//     },
//     onError: (err) => {
//       toast.error(err.message);
//     },
//     retry: false,
//     refetchOnWindowFocus: true,
//     refetchOnMount: true,
//   });

//   useEffect(() => {
//     if (socket) {
//       const handleNewNotification = (newNotification) => {
//         // --- START: Blocking check for real-time new notifications ---
//         const fromUserId = newNotification.from?._id;
//         if (
//           fromUserId &&
//           isUserBlockedByMeOrBlockedMe(
//             currentUserId, // Replace with actual current user ID
//             fromUserId,
//             currentUserBlockedUsers, // Replace with actual current user's blocked users
//             currentUserBlockedBy // Replace with actual current user's blocked by users
//           )
//         ) {
//           console.log(`Real-time notification from blocked user ${fromUserId} suppressed.`);
//           return; // Do not add to cache or show toast
//         }
//         // --- END: Blocking check ---

//         queryClient.setQueryData(["notifications"], (oldNotifications) => {
//           // Ensure oldNotifications is an array, especially if it's undefined initially
//           const currentNotifications = oldNotifications || [];
//           // Add newNotification only if it's not already present (e.g., by _id)
//           if (!currentNotifications.some(n => n._id === newNotification._id)) {
//             return [newNotification, ...currentNotifications];
//           }
//           return currentNotifications;
//         });
//         toast.info("New notification!");
//         setHasUnreadNotifications(true);
//       };

//       socket.on("newNotification", handleNewNotification);

//       return () => {
//         socket.off("newNotification", handleNewNotification);
//       };
//     }
//   }, [socket, queryClient, setHasUnreadNotifications, currentUserId, currentUserBlockedUsers, currentUserBlockedBy]); // Add dependencies

//   return { notifications, isLoading };
// };