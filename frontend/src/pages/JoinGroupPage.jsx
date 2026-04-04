import { useEffect, useRef } from "react"
import { useParams } from "react-router-dom"
import { useJoinViaInviteCode } from "../features/chat/group/groupChatHooks/useGroupMutations.js"
import LoadingSpinner from "../components/common/LoadingSpinner"

export default function JoinGroupPage() {
  const { inviteCode } = useParams()
  const { joinViaInviteCode, isJoining } = useJoinViaInviteCode()

  const hasJoined = useRef(false)

  useEffect(() => {
    if (inviteCode && !hasJoined.current) {
      hasJoined.current = true
      joinViaInviteCode(inviteCode)
    }
  }, [inviteCode, joinViaInviteCode])

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        {isJoining ? (
          <>
            <LoadingSpinner size="md" />
            <p className="text-gray-400">Joining group...</p>
          </>
        ) : (
          <p className="text-gray-400">Redirecting...</p>
        )}
      </div>
    </div>
  )
}
