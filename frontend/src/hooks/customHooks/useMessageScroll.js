import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { useAuthUser } from "../../features/auth/authHooks/useAuthUser"

export const useMessageScroll = ({
  messages,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
  isLoadingMessages,
  setShowNewMessageButton,
  isTypingOtherUser,
}) => {
  const { authUser: currentUser } = useAuthUser()

  const lastMessageId = messages.length > 0 ? messages[messages.length - 1]._id : null
  const messageListRef = useRef(null)
  const scrollStateBeforeFetch = useRef({ scrollTop: 0, scrollHeight: 0 })
  const isUserScrollingUp = useRef(null)
  const prevLastMessageId = useRef(messages?.length > 0 ? messages[messages.length - 1]._id : null)

  const hasRestoredScroll = useRef(false)

  const [shouldScrollOnSenderMessage, setShouldScrollOnSenderMessage] = useState(false)
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false)
  const [shouldPerformInitialScroll, setShouldPerformInitialScroll] = useState(false)

  const scrollToBottom = useCallback(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight
    }
  }, [])

  const triggerScrollOnSenderMessage = useCallback(() => {
    setTimeout(() => {
      scrollToBottom()
    }, 0)
  }, [scrollToBottom])

  const waitForImagesToLoad = useCallback(() => {
    const listEl = messageListRef.current
    if (!listEl) {
      return Promise.resolve()
    }

    const images = listEl.querySelectorAll("img")
    if (images.length === 0) {
      return Promise.resolve()
    }

    const promises = Array.from(images).map(
      (img) =>
        new Promise((resolve) => {
          if (img.complete) {
            resolve()
            return
          }

          const handleLoadOrError = () => {
            resolve()
          }

          img.addEventListener("load", handleLoadOrError, { once: true })
          img.addEventListener("error", handleLoadOrError, { once: true })
        }),
    )

    return Promise.all(promises)
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
      }, 10)
    }
  }, [scrollToBottom, setShowNewMessageButton])

  const handleReactionAdded = useCallback(
    (reactedMessageId) => {
      const listEl = messageListRef.current
      if (!listEl) return

      if (reactedMessageId === lastMessageId) {
        setTimeout(() => {
          scrollToBottom()
          setShowNewMessageButton(false)
        }, 1)
      }
    },
    [scrollToBottom, setShowNewMessageButton, lastMessageId],
  )

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
      waitForImagesToLoad().then(() => {
        scrollToBottom()
        setShouldScrollOnSenderMessage(false)
      })
    }
  }, [
    messages.length,
    isLoadingMessages,
    shouldScrollOnSenderMessage,
    scrollToBottom,
    lastMessageId,
    waitForImagesToLoad,
  ])

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
    if (shouldPerformInitialScroll) {
      const listEl = messageListRef.current
      if (!listEl) return

      const savedPosition = sessionStorage.getItem("chatScrollPosition")

      if (savedPosition !== null) {
        listEl.scrollTop = parseInt(savedPosition, 10)
        sessionStorage.removeItem("chatScrollPosition")

        hasRestoredScroll.current = true
      } else {
        scrollToBottom()
      }
    }
  }, [shouldPerformInitialScroll, scrollToBottom, messageListRef])

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

  useEffect(() => {
    if (!isLoadingMessages) {
      waitForImagesToLoad().then(() => {
        setIsInitialLoadComplete(true)
        setShouldPerformInitialScroll(true)
      })
    } else {
      setIsInitialLoadComplete(false)
      setShouldPerformInitialScroll(false)
    }
  }, [isLoadingMessages, waitForImagesToLoad])

  useEffect(() => {
    if (isTypingOtherUser) {
      const listEl = messageListRef.current
      if (listEl) {
        const scrollThreshold = 100
        const isUserAtBottom =
          listEl.scrollHeight - listEl.scrollTop <= listEl.clientHeight + scrollThreshold

        if (isUserAtBottom) {
          const timeoutId = setTimeout(() => {
            scrollToBottom()
          }, 1)
          return () => clearTimeout(timeoutId)
        }
      }
    }
  }, [isTypingOtherUser, scrollToBottom, messageListRef])

  return {
    handleLoadImage,
    waitForImagesToLoad,
    handleReactionAdded,
    handleNewMessageButtonClick,
    messageListRef,
    triggerScrollOnSenderMessage,
    scrollToBottom,
    isInitialLoadComplete,
  }
}
