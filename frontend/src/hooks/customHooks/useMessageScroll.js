import { useCallback, useEffect, useLayoutEffect, useRef } from "react"
import { useAuthUser } from "../authHooks/useAuthUser"

export const useMessageScroll = ({
  messages,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
  isLoadingMessages,
  setShowNewMessageButton,
}) => {
  const { authUser: currentUser } = useAuthUser()
  const lastMessageId = messages.length > 0 ? messages[messages.length - 1]._id : null
  const messageListRef = useRef(null)
  const scrollStateBeforeFetch = useRef({ scrollTop: 0, scrollHeight: 0 })
  const isUserScrollingUp = useRef(null)
  const prevLastMessageId = useRef(messages?.length > 0 ? messages[messages.length - 1]._id : null)

  const shouldScrollOnSenderMessage = useRef(false)

  const triggerScrollOnSenderMessage = useCallback(() => {
    shouldScrollOnSenderMessage.current = true
  }, [])

  const scrollToBottom = useCallback(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight
    }
  }, [])

  const handleLoadImage = useCallback(() => {
    const listEl = messageListRef.current
    if (!listEl) return

    const scrollThreshold = 500
    const isUserAtBottom =
      listEl.scrollHeight - listEl.scrollTop <= listEl.clientHeight + scrollThreshold

    if (isUserAtBottom) {
      setTimeout(() => {
        scrollToBottom()
        setShowNewMessageButton(false)
      }, 50)
    }
  }, [scrollToBottom, setShowNewMessageButton])

  const handleReactionAdded = useCallback(() => {
    const listEl = messageListRef.current
    if (!listEl) return

    const scrollThreshold = 100
    const isUserAtBottom =
      listEl.scrollHeight - listEl.scrollTop <= listEl.clientHeight + scrollThreshold

    if (isUserAtBottom) {
      setTimeout(() => {
        scrollToBottom()
        setShowNewMessageButton(false)
      }, 1)
    }
  }, [scrollToBottom, setShowNewMessageButton])

  const handleNewMessageButtonClick = useCallback(() => {
    scrollToBottom()
    setShowNewMessageButton(false)
  }, [scrollToBottom, setShowNewMessageButton])

  useLayoutEffect(() => {
    const listEl = messageListRef.current
    if (!listEl || isLoadingMessages) return


    if (
      messages.length > 0 &&
      !isUserScrollingUp.current &&
      !scrollStateBeforeFetch.current.scrollHeight
    ) {
      scrollToBottom()
      shouldScrollOnSenderMessage.current = false
      return
    }
  }, [messages.length, isLoadingMessages, scrollToBottom, lastMessageId])

  const handleScroll = useCallback(() => {
    const listEl = messageListRef.current
    if (!listEl) return

    const { scrollTop, scrollHeight, clientHeight } = listEl
    const scrollThreshold = 100

    isUserScrollingUp.current = scrollHeight - scrollTop - clientHeight > scrollThreshold

    if (!isUserScrollingUp.current) {
      setShowNewMessageButton(false)
    }

    if (scrollTop < 1 && hasNextPage && !isFetchingNextPage) {
      scrollStateBeforeFetch.current = {
        scrollTop: listEl.scrollTop,
        scrollHeight: listEl.scrollHeight,
      }
      fetchNextPage()
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, setShowNewMessageButton])

  useEffect(() => {
    const currentRef = messageListRef.current
    if (currentRef) {
      currentRef.addEventListener("scroll", handleScroll)
      return () => currentRef.removeEventListener("scroll", handleScroll)
    }
  }, [handleScroll])

  useLayoutEffect(() => {
    const listEl = messageListRef.current
    if (!listEl) return
    if (!isFetchingNextPage && scrollStateBeforeFetch.current.scrollHeight > 0) {
      const { scrollTop: oldScrollTop, scrollHeight: oldScrollHeight } =
        scrollStateBeforeFetch.current

      const newScrollHeight = listEl.scrollHeight
      const heightDifference = newScrollHeight - oldScrollHeight
      listEl.scrollTop = oldScrollTop + heightDifference
      scrollStateBeforeFetch.current = { scrollTop: 0, scrollHeight: 0 }
    }
  }, [isFetchingNextPage, messages])

  useEffect(() => {
    if (messages.length === 0) {
      prevLastMessageId.current = null
      return
    }

    const newLastMessage = messages[messages.length - 1]

    const isNewMessageAdded = newLastMessage._id !== prevLastMessageId.current

    if (isNewMessageAdded) {
      if (isUserScrollingUp.current && newLastMessage.sender?._id !== currentUser?._id) {
        setShowNewMessageButton(true)
      }
    }

    prevLastMessageId.current = newLastMessage._id
  }, [messages, currentUser?._id, isUserScrollingUp, setShowNewMessageButton])


  
  return {
    handleLoadImage,
    handleReactionAdded,
    handleNewMessageButtonClick,
    messageListRef,
    triggerScrollOnSenderMessage,
    scrollToBottom,
  }
}
