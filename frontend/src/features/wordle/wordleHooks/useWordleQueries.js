import { useQuery } from "@tanstack/react-query"
import {
  getTodayWordleApi,
  getWordleStatsApi,
  getWordleAllTimeLeaderboardApi,
  getWordleDailyLeaderboardApi,
} from "../../../api/wordleApi"
import { wordleKeys } from "./wordleKeys"

export const useGetTodayWordle = () => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: wordleKeys.today(),
    queryFn: getTodayWordleApi,
    staleTime: 30 * 1000,
  })

  return {
    wordle: data,
    isLoading,
    isError,
    error,
  }
}

export const useGetWordleDailyLeaderboard = (page, options = {}) => {
  const { data, isLoading } = useQuery({
    queryKey: wordleKeys.dailyLeaderboard(page),
    queryFn: () => getWordleDailyLeaderboardApi(page),
    ...options,
  })

  return {
    leaderboard: data?.leaderboard || [],
    totalPages: data?.totalPages || 1,
    currentPage: data?.currentPage || page,
    date: data?.date,
    isLoading,
  }
}

export const useGetWordleStats = (options = {}) => {
  const { data, isLoading } = useQuery({
    queryKey: wordleKeys.stats(),
    queryFn: getWordleStatsApi,
    ...options,
  })

  return {
    stats: data,
    isLoading,
  }
}

export const useGetWordleAllTimeLeaderboard = (page, options = {}) => {
  const { data, isLoading } = useQuery({
    queryKey: wordleKeys.allTimeLeaderboard(page),
    queryFn: () => getWordleAllTimeLeaderboardApi(page),
    ...options,
  })

  return {
    leaderboard: data?.leaderboard || [],
    totalPages: data?.totalPages || 1,
    currentPage: data?.currentPage || page,
    isLoading,
  }
}
