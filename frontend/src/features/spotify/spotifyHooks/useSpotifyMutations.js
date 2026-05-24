import { useMutation, useQueryClient } from "@tanstack/react-query"
import { disconnectSpotifyApi } from "../../../api/spotifyApi"
import { spotifyKeys } from "./spotifyKeys"

export const useDisconnectSpotify = () => {
  const qc = useQueryClient()
  const { mutate, isPending } = useMutation({
    mutationFn: disconnectSpotifyApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: spotifyKeys.all() }),
  })
  return { disconnect: mutate, isDisconnecting: isPending }
}
