import { useEffect } from "react"
import { useParams } from "react-router-dom"
import ConversationsList from "../../components/common/messages/ConversationsList"
import ChatWindow from "../../components/common/messages/ChatWindow"
import { useFetchConversations } from "../../hooks/messagesHooks/useFetchConversations"
import ConversationListSkeleton from "../../components/skeletons/ConversationListSkeleton"
import { useAppStore } from "../../store/useAppStore"
import { usePrivateChatStore } from "../../store/usePrivateChatStore"
import { useIsMobile } from "../../hooks/customHooks/useIsMobile"

const MessagePage = () => {
  const setIsChatWindowOpen = useAppStore((state) => state.setIsChatWindowOpen)
  const selectedConversation = usePrivateChatStore((state) => state.selectedConversation)
  const setSelectedConversation = usePrivateChatStore((state) => state.setSelectedConversation)

  const { conversationId: urlConversationId } = useParams()

  const isMobile = useIsMobile()

  usePrivateChatStore()

  const { conversations, isLoadingConversations, errorConversations } = useFetchConversations()

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
      setSelectedConversation(null) // Reset selectedConversation when MessagePage unmounts
    }
  }, [
    urlConversationId,
    conversations,
    isLoadingConversations,
    setIsChatWindowOpen,
    setSelectedConversation,
  ])

  // const isMobile = window.innerWidth < 768
  const showConversationList = !isMobile || !urlConversationId
  const showChatWindow = !isMobile || !!urlConversationId

  if (errorConversations) {
    return (
      <div className="flex-center h-screen text-red-500">Error: {errorConversations.message}</div>
    )
  }

  return (
    <>
      <div className="flex min-h-screen w-full overflow-hidden">
        {showConversationList && (
          <div className="flex h-screen w-full flex-col md:w-[430px] md:flex-shrink-0 md:border-r md:border-accent">
            {isLoadingConversations ? (
              <ConversationListSkeleton />
            ) : (
              <ConversationsList conversations={conversations} />
            )}
          </div>
        )}

        {showChatWindow && (
          <div className="flex h-screen w-full flex-col md:flex-1">
            {isLoadingConversations && urlConversationId ? (
              <div></div>
            ) : selectedConversation ? (
              <ChatWindow />
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

export default MessagePage
