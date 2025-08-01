import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { useSocket } from "../../context/SocketContext";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthUser } from "../authHooks/useAuthUser";
import { usePublicChatStore } from "../../store/usePublicChatStore";

export const useMessageScroll = ({
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

  const triggerScrollOnSenderMessage = useCallback(() => {
    shouldScrollOnSenderMessage.current = true;
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
      shouldScrollToBottom.current = false;
      shouldScrollOnSenderMessage.current = false;
      return;
    }

    if (shouldScrollOnSenderMessage.current) {
      scrollToBottom();
      shouldScrollOnSenderMessage.current = false;
      shouldScrollToBottom.current = false;
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

    isUserScrollingUp.current = scrollHeight - scrollTop - clientHeight > scrollThreshold;

    if (!isUserScrollingUp.current) {
      setShowNewMessageButton(false);
    }

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
  }, [isFetchingNextPage, messages]);

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

    prevLastMessageId.current = newLastMessage._id;
  }, [messages, currentUser?._id, isUserScrollingUp, setShowNewMessageButton]);

  useEffect(() => {
    if (socket) {
      socket.on("bannedFromPublicChat", ({ isBanned }) => {
        queryClient.invalidateQueries({ queryKey: ["authUser"] });
        if (isBanned) {
          queryClient.setQueryData(["publicMessages"], (oldData) => ({
            pages: [[]],
            pageParams: [undefined],
          }));
        } else {
          queryClient.invalidateQueries({ queryKey: ["publicMessages"] });
        }
      });

      return () => {
        socket.off("bannedFromPublicChat");
      };
    }
  }, [socket, queryClient]);

  return {
    handleLoadImage,
    handleReactionAdded,
    handleNewMessageButtonClick,
    messageListRef,
    triggerScrollOnSenderMessage
  };
};
