import { useMemo } from "react";
import { MESSAGE_GROUP_TIME_THRESHOLD_MS } from "../constants/numberConstants";

export const useProcessedMessage = (messages) => {
  const processedMessages = useMemo(() => {
    if (!messages || messages.length === 0) return [];

    const getSenderInfo = (msg) => {
      const sender = msg.sender;
      const id = typeof sender === "object" ? sender._id : sender;
      const profileImg =
        typeof sender === "object" && sender?.profileImg
          ? sender.profileImg
          : "/public/avatar-placeholder.png";
      const username =
        typeof sender === "object" && sender?.username ? sender.username : undefined;
      return { id, profileImg, username };
    };

    let lastMessageDate = null;
    const enhanced = messages.map((message, index) => {
      const prevMessage = messages[index - 1];
      const nextMessage = messages[index + 1];

      const currentSender = getSenderInfo(message);
      const prevSender = prevMessage ? getSenderInfo(prevMessage) : null;
      const nextSender = nextMessage ? getSenderInfo(nextMessage) : null;

      let isNewDay = false;
      if (lastMessageDate) {
        const messageDate = new Date(message.createdAt);
        const lastDate = new Date(lastMessageDate);
        isNewDay =
          messageDate.getDate() !== lastDate.getDate() ||
          messageDate.getMonth() !== lastDate.getMonth() ||
          messageDate.getFullYear() !== lastDate.getFullYear();
      } else {
        isNewDay = true;
      }
      lastMessageDate = message.createdAt;

      const isTimeThresholdExceededPrev = prevMessage
        ? new Date(message.createdAt).getTime() -
            new Date(prevMessage.createdAt).getTime() >
          MESSAGE_GROUP_TIME_THRESHOLD_MS
        : true;

      const isFirstInGroup =
        !prevMessage ||
        currentSender.id !== prevSender.id ||
        isNewDay ||
        isTimeThresholdExceededPrev;

      const isTimeThresholdExceededNext = nextMessage
        ? new Date(nextMessage.createdAt).getTime() -
            new Date(message.createdAt).getTime() >
          MESSAGE_GROUP_TIME_THRESHOLD_MS
        : true;

      const isLastInGroup =
        !nextMessage || currentSender.id !== nextSender.id || isTimeThresholdExceededNext;

      return {
        ...message,
        isNewDay,
        isFirstInGroup,
        isLastInGroup,
        senderProfileImg: currentSender.profileImg,
        senderUsername: currentSender.username,
      };
    });
    return enhanced;
  }, [messages]);

  return processedMessages;
};
