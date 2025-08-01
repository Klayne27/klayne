import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { useSocket } from "../context/SocketContext";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthUser } from "./authHooks/useAuthUser";
import { usePublicChatStore } from "../store/usePublicChatStore";

export const useMessageScroll = ({
  //   setShowNewMessageButton,
  messages,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
  isLoadingMessages,
}) => {
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const { authUser: currentUser } = useAuthUser();

  const { setShowNewMessageButton } = usePublicChatStore();

  const messageListRef = useRef(null);
  const scrollStateBeforeFetch = useRef({ scrollTop: 0, scrollHeight: 0 });
  const shouldScrollToBottom = useRef(null);
  const isUserScrollingUp = useRef(null);
  const prevLastMessageId = useRef(
    messages?.length > 0 ? messages[messages.length - 1]._id : null
  );

  const shouldScrollOnSenderMessage = useRef(false);

  // Function to imperatively trigger a scroll to bottom from outside
  const triggerScrollOnSenderMessage = useCallback(() => {
    shouldScrollOnSenderMessage.current = true;
    // We don't call scrollToBottom immediately here.
    // We let the useLayoutEffect handle the actual scroll on the next render cycle.
  }, []);

  const scrollToBottom = useCallback(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, []);

  const handleLoadImage = useCallback(() => {
    const listEl = messageListRef.current;
    if (!listEl) return;

    const scrollThreshold = 500;
    const isUserAtBottom =
      listEl.scrollHeight - listEl.scrollTop <= listEl.clientHeight + scrollThreshold;

    if (isUserAtBottom) {
      setTimeout(() => {
        scrollToBottom();
        setShowNewMessageButton(false);
      }, 50);
    }
  }, [scrollToBottom, setShowNewMessageButton]);

  const handleReactionAdded = useCallback(() => {
    const listEl = messageListRef.current;
    if (!listEl) return;

    const scrollThreshold = 100;
    const isUserAtBottom =
      listEl.scrollHeight - listEl.scrollTop <= listEl.clientHeight + scrollThreshold;

    if (isUserAtBottom) {
      setTimeout(() => {
        scrollToBottom();
        setShowNewMessageButton(false);
      }, 1);
    }
  }, [scrollToBottom, setShowNewMessageButton]);

  const handleNewMessageButtonClick = useCallback(() => {
    scrollToBottom();
    setShowNewMessageButton(false);
  }, [scrollToBottom, setShowNewMessageButton]);

  useLayoutEffect(() => {
    if (!messageListRef.current || isLoadingMessages) return;

    if (
      messages.length > 0 &&
      !isUserScrollingUp.current &&
      !scrollStateBeforeFetch.current.scrollHeight
    ) {
      scrollToBottom();
      shouldScrollToBottom.current = false; // Reset just in case
      shouldScrollOnSenderMessage.current = false; // Reset sender flag
      return;
    }

    if (shouldScrollOnSenderMessage.current) {
      scrollToBottom();
      shouldScrollOnSenderMessage.current = false; // Reset the flag immediately after scrolling
      shouldScrollToBottom.current = false; // Ensure other flags are also reset
      return;
    }

    if (shouldScrollToBottom.current) {
      scrollToBottom();
      shouldScrollToBottom.current = false;
    }
  }, [messages.length, isLoadingMessages, scrollToBottom]);

  const handleScroll = useCallback(() => {
    const listEl = messageListRef.current;
    if (!listEl) return;

    const { scrollTop, scrollHeight, clientHeight } = listEl;
    const scrollThreshold = 50;

    // Determine if the user is scrolled up
    isUserScrollingUp.current = scrollHeight - scrollTop - clientHeight > scrollThreshold;

    // If user scrolls back down, hide the new message button
    if (!isUserScrollingUp.current) {
      setShowNewMessageButton(false);
    }

    // Fetch older messages when scrolled to top
    if (scrollTop < 1 && hasNextPage && !isFetchingNextPage) {
      scrollStateBeforeFetch.current = {
        scrollTop: listEl.scrollTop,
        scrollHeight: listEl.scrollHeight,
      };
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, setShowNewMessageButton]);

  useEffect(() => {
    const currentRef = messageListRef.current;
    if (currentRef) {
      currentRef.addEventListener("scroll", handleScroll);
      return () => currentRef.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

  useLayoutEffect(() => {
    const listEl = messageListRef.current;
    if (!listEl) return;
    if (!isFetchingNextPage && scrollStateBeforeFetch.current.scrollHeight > 0) {
      const { scrollTop: oldScrollTop, scrollHeight: oldScrollHeight } =
        scrollStateBeforeFetch.current;
      const newScrollHeight = listEl.scrollHeight;
      const heightDifference = newScrollHeight - oldScrollHeight;
      listEl.scrollTop = oldScrollTop + heightDifference;
      scrollStateBeforeFetch.current = { scrollTop: 0, scrollHeight: 0 };
    }
  }, [isFetchingNextPage, messages]); // messages dependency ensures it runs after new messages are loaded

  useEffect(() => {
    if (messages.length === 0) {
      prevLastMessageId.current = null;
      return;
    }

    const newLastMessage = messages[messages.length - 1];

    const isNewMessageAdded = newLastMessage._id !== prevLastMessageId.current;

    if (isNewMessageAdded) {
      if (isUserScrollingUp.current && newLastMessage.sender?._id !== currentUser?._id) {
        setShowNewMessageButton(true);
      }
    }

    // Update the ref for the next comparison
    prevLastMessageId.current = newLastMessage._id;
  }, [messages, currentUser?._id, isUserScrollingUp, setShowNewMessageButton]); // Add all dependencies

  useEffect(() => {
    if (socket) {
      socket.on("bannedFromPublicChat", ({ isBanned }) => {
        queryClient.invalidateQueries({ queryKey: ["authUser"] });
        if (isBanned) {
          // Clear public messages if banned to avoid showing old content
          queryClient.setQueryData(["publicMessages"], (oldData) => ({
            pages: [[]],
            pageParams: [undefined],
          }));
        } else {
          // Refetch messages if unbanned
          queryClient.invalidateQueries({ queryKey: ["publicMessages"] });
        }
      });

      return () => {
        socket.off("bannedFromPublicChat");
      };
    }
  }, [socket, queryClient]); // Removed currentUser and refetchAuthUser from dependencies, as queryClient handles invalidation.

  return {
    handleLoadImage,
    handleReactionAdded,
    handleNewMessageButtonClick,
    messageListRef,
    triggerScrollOnSenderMessage
  };
};
