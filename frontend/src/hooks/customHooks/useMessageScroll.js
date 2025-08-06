import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { useAuthUser } from "../authHooks/useAuthUser"

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

  // const shouldScrollOnSenderMessage = useRef(false)

  const [shouldScrollOnSenderMessage, setShouldScrollOnSenderMessage] = useState(false)

  const triggerScrollOnSenderMessage = useCallback(() => {
    setShouldScrollOnSenderMessage(true)
  }, [])

  const scrollToBottom = useCallback(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight
    }
  }, [])

  // New function to wait for images
  const waitForImagesToLoad = useCallback(() => {
    if (!messageListRef.current) {
      return Promise.resolve()
    }

    const images = messageListRef.current.querySelectorAll("img")
    if (images.length === 0) {
      return Promise.resolve()
    }

    const promises = Array.from(images).map(
      (img) =>
        new Promise((resolve) => {
          if (img.complete) {
            resolve()
          } else {
            img.addEventListener("load", resolve, { once: true })
            img.addEventListener("error", resolve, { once: true }) // Also resolve on error to not get stuck
          }
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
    (updatedMessage) => {
      // 👈 Add this check to prevent the error
      if (!updatedMessage) {
        return
      }

      const lastMessageId = messages.length > 0 ? messages[messages.length - 1]._id : null

      if (lastMessageId && updatedMessage._id === lastMessageId) {
        setTimeout(() => {
          scrollToBottom()
          setShowNewMessageButton(false)
        }, 10)
      }
    },
    [messages, scrollToBottom, setShowNewMessageButton],
  )

  const handleNewMessageButtonClick = useCallback(() => {
    scrollToBottom()
    setShowNewMessageButton(false)
  }, [scrollToBottom, setShowNewMessageButton])

  // useLayoutEffect(() => {
  //   if (!isLoadingMessages) {
  //     scrollToBottom()
  //   }
  // }, [scrollToBottom, isLoadingMessages])

  useLayoutEffect(() => {
    const listEl = messageListRef.current
    if (!listEl || isLoadingMessages) return

    if (
      messages.length > 0 &&
      !isUserScrollingUp.current &&
      !scrollStateBeforeFetch.current.scrollHeight
    ) {
      // Wait for all images to load before scrolling
      waitForImagesToLoad().then(() => {
        scrollToBottom()
        shouldScrollOnSenderMessage.current = false
      })
    }
  }, [messages.length, isLoadingMessages, scrollToBottom, lastMessageId, waitForImagesToLoad])

  // useLayoutEffect(() => {
  //   const listEl = messageListRef.current
  //   if (!listEl || isLoadingMessages) return

  //   if (
  //     messages.length > 0 &&
  //     !isUserScrollingUp.current &&
  //     !scrollStateBeforeFetch.current.scrollHeight
  //   ) {
  //     // Wait for all images to load before scrolling
  //     waitForImagesToLoad().then(() => {
  //       scrollToBottom()
  //       shouldScrollOnSenderMessage.current = false
  //     })
  //   }
  // }, [messages.length, isLoadingMessages, scrollToBottom, lastMessageId, waitForImagesToLoad])

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

  // 3. New useLayoutEffect to handle the scroll specifically for sender messages
  useLayoutEffect(() => {
    if (shouldScrollOnSenderMessage) {
      waitForImagesToLoad().then(() => {
        scrollToBottom()
        setShouldScrollOnSenderMessage(false) // Reset the state after scrolling
      })
    }
  }, [shouldScrollOnSenderMessage, scrollToBottom, waitForImagesToLoad])

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
    handleReactionAdded,
    handleNewMessageButtonClick,
    messageListRef,
    triggerScrollOnSenderMessage,
    scrollToBottom,
  }
}
