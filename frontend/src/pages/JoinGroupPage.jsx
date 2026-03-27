import { useEffect, useRef } from "react"
import { useParams } from "react-router-dom"
import { useJoinViaInviteCode } from "../features/chat/group/groupChatHooks/useJoinViaInviteCode"
import LoadingSpinner from "../components/common/LoadingSpinner"

export default function JoinGroupPage() {
  const { inviteCode } = useParams()
  const { joinViaInviteCode, isJoining } = useJoinViaInviteCode()

  const hasJoined = useRef(false)

  useEffect(() => {
    if (inviteCode && !hasJoined.current) {
      hasJoined.current = true // Lock it immediately
      joinViaInviteCode(inviteCode)
    }
  }, [inviteCode, joinViaInviteCode])

  return (
    <div className="flex h-screen items-center justify-center">
      {isJoining ? (
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner size="md" />
          <p className="text-gray-400">Joining group...</p>
        </div>
      ) : (
        <p className="text-gray-400">Processing invite link...</p>
      )}
    </div>
  )
}
