import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  endStudySession,
  getLeaderboard,
  getPomodoroSettings,
  getSessionCountLeaderboard,
  getStudyActivityFeed,
  startStudySession,
  updatePomodoroSettings,
} from "../../api/pomodoroApi"
import { showAppToast } from "../../utils/showAppToast"

export const useGetPomodoroSettings = () => {
  return useQuery({
    queryKey: ["pomodoroSettings"],
    queryFn: getPomodoroSettings,
  })
}

export const useUpdatePomodoroSettings = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updatePomodoroSettings,
    onSuccess: () => {
      showAppToast("Settings updated!", "success")
      queryClient.invalidateQueries({ queryKey: ["pomodoroSettings"] })
    },
    onError: (error) => {
      showAppToast(error.message, "error")
    },
  })
}

export const useStartStudySession = () => {
  return useMutation({
    mutationFn: startStudySession,
    onSuccess: () => {
      showAppToast("Study session started!", "success")
    },
    onError: (error) => {
      showAppToast(error.message, "error")
    },
  })
}

export const useEndStudySession = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: endStudySession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studyActivity"] })
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] })
      queryClient.invalidateQueries({ queryKey: ["authUser"] })

      // queryClient.refetchQueries({ queryKey: ["authUser"] })
    },
    onError: (error) => {
      showAppToast(error.message, "error")
    },
  })
}

export const useGetStudyActivityFeed = (page) => {
  const { data, isLoading } = useQuery({
    queryKey: ["studyActivity", page], // Add page to the queryKey
    queryFn: () => getStudyActivityFeed(page),
  })

  return {
    activityFeed: data?.activityFeed,
    totalPages: data?.totalPages,
    isLoading,
  }
}

export const useGetLeaderboard = (page) => {
  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard", page], // queryKey must include page to re-fetch when it changes
    queryFn: () => getLeaderboard(page),
  })

  return {
    leaderboard: data?.leaderboard,
    totalPages: data?.totalPages,
    isLoading,
  }
}

// export const useGetSessionCountLeaderboard = (page) => {
//   const { data, isLoading: isLoadingSessionCountLeaderboard } = useQuery({
//     queryKey: ["leaderboard", page], // queryKey must include page to re-fetch when it changes
//     queryFn: () => getSessionCountLeaderboard(page),
//   })

//   return {
//     sessionCountleaderboard: data?.leaderboard,
//     sessionCounttotalPages: data?.totalPages,
//     isLoadingSessionCountLeaderboard,
//   }
// }
