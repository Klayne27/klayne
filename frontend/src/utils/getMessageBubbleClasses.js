export const getMessageBubbleClasses = (msg, isSentByCurrentUser) => {
  let bubbleClasses = "";

  if (isSentByCurrentUser) {
    bubbleClasses += " bg-primary text-white";
    if (msg.isFirstInGroup && msg.isLastInGroup) {
      bubbleClasses += " rounded-3xl";
    } else if (msg.isFirstInGroup) {
      bubbleClasses += " rounded-tl-3xl rounded-bl-3xl rounded-tr-3xl rounded-br-[4px]";
    } else if (msg.isLastInGroup) {
      bubbleClasses += " rounded-tl-3xl rounded-bl-3xl rounded-tr-[4px] rounded-br-3xl";
    } else {
      bubbleClasses += " rounded-tl-3xl rounded-bl-3xl rounded-tr-[4px] rounded-br-[4px]";
    }
  } else {
    bubbleClasses += " bg-[#2F3336] text-white"; // Base classes for other users
    if (msg.isFirstInGroup && msg.isLastInGroup) {
      bubbleClasses += " rounded-3xl"; 
    } else if (msg.isFirstInGroup) {
      bubbleClasses += " rounded-tr-3xl rounded-br-3xl rounded-tl-3xl rounded-bl-[4px]"; // First message in a group
    } else if (msg.isLastInGroup) {
      bubbleClasses += " rounded-tr-3xl rounded-br-3xl rounded-tl-[4px] rounded-bl-3xl"; // Last message in a group
    } else {
      bubbleClasses += " rounded-tr-3xl rounded-br-3xl rounded-tl-[4px] rounded-bl-[4px]"; // Middle message in a group
    }
  }

  return bubbleClasses;
};
