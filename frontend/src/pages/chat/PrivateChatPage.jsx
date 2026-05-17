import { useEffect, useRef, useState } from "react"
import { useParams } from "react-router-dom"
import { useAppStore } from "../../store/useAppStore"
import { usePrivateChatStore } from "../../store/usePrivateChatStore"
import { useIsMobile } from "../../hooks/customHooks/useIsMobile"
import ConversationListSkeleton from "../../components/skeletons/ConversationListSkeleton"
import {
  useGetConversations,
  useGetOrCreateConversation,
  useSearchConversations,
} from "../../features/chat/private/privateChatHooks/usePrivateChatQueries"
import ConversationsList from "../../features/chat/private/components/ConversationsList"
import PrivateChatWindow from "../../features/chat/private/components/PrivateChatWindow"
import InboxNotes from "../../features/chat/common/components/InboxNotes"
import ConversationsListHeader from "../../features/chat/private/components/ConversationsListHeader"
import { useAuthUser } from "../../features/auth/authHooks/useAuthUser"
import { getOptimizedImageUrl } from "../../utils/cloudinaryUtils"
import { useGetInboxNotes } from "../../features/users/usersHooks/useUserQueries"
import PrivateChatSearchBar from "../../features/chat/private/components/PrivateChatSearchBar"

const PrivateChatPage = () => {
  const setIsChatWindowOpen = useAppStore((state) => state.setIsChatWindowOpen)
  const selectedConversation = usePrivateChatStore((state) => state.selectedConversation)
  const setSelectedConversation = usePrivateChatStore((state) => state.setSelectedConversation)

  const { conversationId: urlConversationId } = useParams()

  const isMobile = useIsMobile()

  const { conversations, isLoadingConversations, errorConversations } = useGetConversations()
  const { isLoadingNotes } = useGetInboxNotes()

  useEffect(() => {
    if (isLoadingConversations) return

    if (urlConversationId) {
      const conversationFromUrl = conversations.find((c) => c._id === urlConversationId)
      setSelectedConversation(conversationFromUrl || null)
    } else {
      setSelectedConversation(null)
    }

    setIsChatWindowOpen(!!urlConversationId)

    return () => {
      setIsChatWindowOpen(false)
      setSelectedConversation(null)
    }
  }, [
    urlConversationId,
    conversations,
    isLoadingConversations,
    setIsChatWindowOpen,
    setSelectedConversation,
  ])

  const showConversationList = !isMobile || !urlConversationId
  const showChatWindow = !isMobile || !!urlConversationId

  if (errorConversations) {
    return (
      <div className="flex-center h-screen text-red-500">Error: {errorConversations.message}</div>
    )
  }

  return (
    <>
      <div className="template flex min-h-screen max-w-7xl overflow-y-auto">
        {showConversationList && (
          <div className="flex h-screen w-full flex-col md:w-[430px] md:flex-shrink-0 md:border-x md:border-accent">
            {isLoadingConversations || isLoadingNotes ? (
              <ConversationListSkeleton />
            ) : (
              <div>
                <ConversationsListHeader />
                <PrivateChatSearchBar />

               

                <InboxNotes />
                <ConversationsList conversations={conversations} />
              </div>
            )}
          </div>
        )}

        {showChatWindow && (
          <div className="flex h-screen w-full flex-col md:flex-1">
            {isLoadingConversations && urlConversationId ? (
              <div></div>
            ) : selectedConversation ? (
              <PrivateChatWindow />
            ) : (
              <div className="hidden flex-1 flex-col items-center justify-center p-4 text-gray-400 md:flex">
                <p className="mb-2 text-xl font-bold">Select a message</p>
                <p className="text-sm">
                  Choose from your existing conversations to start chatting.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

export default PrivateChatPage
